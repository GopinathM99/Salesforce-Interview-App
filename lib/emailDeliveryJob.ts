import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  generateQuestionsForSubscription,
  getSubscriptionsDueForDelivery,
  generateUnsubscribeToken,
  logEmailDelivery,
  sendEmailToSubscriber,
  updateSubscriptionLastSent
} from '@/lib/emailService';
import type { SubscriptionPreferences } from '@/lib/emailService';

export type SubscriptionProcessingResult = {
  email: string;
  status: 'sent' | 'failed' | 'error';
  questionsCount?: number;
  error?: string;
  note?: string;
};

export type EmailDeliveryJobResult = {
  message: string;
  sent: number;
  failed: number;
  total: number;
  includeAllActive: boolean;
  results: SubscriptionProcessingResult[];
};

function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

function getConcurrencyLimit(): number {
  const defaultConcurrency = 3;
  const raw = process.env.EMAIL_SEND_CONCURRENCY;
  if (!raw) return defaultConcurrency;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultConcurrency;
}

function getThrottleMs(): number {
  const raw = process.env.EMAIL_SEND_THROTTLE_MS;
  if (!raw) return 0;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runEmailDeliveryJob(options: {
  includeAllActive: boolean;
}): Promise<EmailDeliveryJobResult> {
  const includeAllActive = options.includeAllActive;

  console.log('Starting email delivery process...');

  const subscriptions = await getSubscriptionsDueForDelivery({ includeAllActive });
  console.log(
    `Found ${subscriptions.length} subscriptions ${
      includeAllActive ? 'matching include-all filter' : 'due for delivery'
    }`
  );

  if (subscriptions.length === 0) {
    return {
      message: includeAllActive ? 'No active subscriptions found' : 'No subscriptions due for delivery',
      sent: 0,
      failed: 0,
      total: 0,
      includeAllActive,
      results: []
    };
  }

  const supabase = getSupabaseClient();
  const concurrencyLimit = Math.max(1, getConcurrencyLimit());
  const throttleMs = Math.max(0, getThrottleMs());

  const results: SubscriptionProcessingResult[] = [];

  const processSubscription = async (
    subscription: SubscriptionPreferences
  ): Promise<SubscriptionProcessingResult> => {
    try {
      console.log(`Processing subscription for ${subscription.email}...`);

      const { questions, fallbackExplanation, failureReason } =
        await generateQuestionsForSubscription(subscription);

      if (questions.length === 0) {
        const errorMessage = failureReason || 'No questions available for the selected preferences.';
        console.warn(`Skipping ${subscription.email}: ${errorMessage}`);

        await logEmailDelivery(subscription.id, subscription.email, [], 'failed', errorMessage);

        return {
          email: subscription.email,
          status: 'failed',
          error: errorMessage
        };
      }

      const unsubscribeToken = generateUnsubscribeToken(subscription.id);

      await supabase.from('unsubscribe_tokens').insert({
        subscription_id: subscription.id,
        token: unsubscribeToken
      });

      const emailResult = await sendEmailToSubscriber(subscription, questions, unsubscribeToken);

      if (emailResult.success) {
        await logEmailDelivery(subscription.id, subscription.email, questions, 'sent');
        await updateSubscriptionLastSent(subscription.id);

        if (fallbackExplanation) {
          console.log(
            `Email sent to ${subscription.email} with relaxed filters: ${fallbackExplanation}`
          );
        } else {
          console.log(`Email sent successfully to ${subscription.email}`);
        }

        return {
          email: subscription.email,
          status: 'sent',
          questionsCount: questions.length,
          ...(fallbackExplanation ? { note: fallbackExplanation } : {})
        };
      }

      await logEmailDelivery(
        subscription.id,
        subscription.email,
        questions,
        'failed',
        emailResult.error
      );

      console.error(`Failed to send email to ${subscription.email}:`, emailResult.error);

      return {
        email: subscription.email,
        status: 'failed',
        error: emailResult.error
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing subscription for ${subscription.email}:`, errorMessage);

      return {
        email: subscription.email,
        status: 'error',
        error: errorMessage
      };
    }
  };

  let currentIndex = 0;
  const workerCount = Math.min(concurrencyLimit, subscriptions.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (currentIndex < subscriptions.length) {
      const nextIndex = currentIndex;
      currentIndex += 1;

      const subscription = subscriptions[nextIndex];

      const outcome = await processSubscription(subscription);
      results.push(outcome);

      if (throttleMs > 0) {
        await delay(throttleMs);
      }
    }
  });

  await Promise.all(workers);

  const sentCount = results.filter(result => result.status === 'sent').length;
  const failedCount = results.length - sentCount;

  console.log(`Email delivery completed. Sent: ${sentCount}, Failed: ${failedCount}`);

  return {
    message: 'Email delivery process completed',
    sent: sentCount,
    failed: failedCount,
    total: subscriptions.length,
    includeAllActive,
    results
  };
}

