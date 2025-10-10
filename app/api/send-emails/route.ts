import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getSubscriptionsDueForDelivery,
  generateQuestionsForSubscription,
  sendEmailToSubscriber,
  logEmailDelivery,
  updateSubscriptionLastSent,
  generateUnsubscribeToken
} from '@/lib/emailService';
import type { SubscriptionPreferences } from '@/lib/emailService';

function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

type SubscriptionProcessingResult = {
  email: string;
  status: 'sent' | 'failed' | 'error';
  questionsCount?: number;
  error?: string;
  note?: string;
};

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

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    let includeAllActive = url.searchParams.get('sendAll') === '1';

    if (!includeAllActive && request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.json();
        includeAllActive = Boolean(body?.sendAll ?? body?.includeAllActive);
      } catch (error) {
        console.warn('send-emails: failed to parse JSON body', error);
      }
    }

    // Temporarily allow anyone to send emails (for testing)
    // const authHeader = request.headers.get('authorization');
    // const expectedToken = process.env.EMAIL_SERVICE_TOKEN;
    
    // if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('Starting email delivery process...');
    
    // Get subscriptions due for delivery
    const subscriptions = await getSubscriptionsDueForDelivery({ includeAllActive });
    console.log(
      `Found ${subscriptions.length} subscriptions ${includeAllActive ? 'matching include-all filter' : 'due for delivery'}`
    );

    if (subscriptions.length === 0) {
      return NextResponse.json({ 
        message: includeAllActive ? 'No active subscriptions found' : 'No subscriptions due for delivery',
        sent: 0,
        failed: 0
      });
    }

    const supabase = getSupabaseClient();
    const concurrencyLimit = getConcurrencyLimit();
    const throttleMs = getThrottleMs();

    let sentCount = 0;
    let failedCount = 0;
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

          await logEmailDelivery(
            subscription.id,
            subscription.email,
            [],
            'failed',
            errorMessage
          );

          return {
            email: subscription.email,
            status: 'failed',
            error: errorMessage
          };
        }

        const unsubscribeToken = generateUnsubscribeToken(subscription.id);

        await supabase
          .from('unsubscribe_tokens')
          .insert({
            subscription_id: subscription.id,
            token: unsubscribeToken
          });

        const emailResult = await sendEmailToSubscriber(
          subscription,
          questions,
          unsubscribeToken
        );

        if (emailResult.success) {
          await logEmailDelivery(
            subscription.id,
            subscription.email,
            questions,
            'sent'
          );

          await updateSubscriptionLastSent(subscription.id);

          if (fallbackExplanation) {
            console.log(`Email sent to ${subscription.email} with relaxed filters: ${fallbackExplanation}`);
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

    const queue = [...subscriptions];
    const workers = Array.from({
      length: Math.min(concurrencyLimit, queue.length)
    }, () =>
      (async () => {
        while (queue.length > 0) {
          const subscription = queue.shift();
          if (!subscription) {
            break;
          }

          const outcome = await processSubscription(subscription);
          results.push(outcome);

          if (outcome.status === 'sent') {
            sentCount++;
          } else {
            failedCount++;
          }

          if (throttleMs > 0) {
            await new Promise(resolve => setTimeout(resolve, throttleMs));
          }
        }
      })()
    );

    await Promise.all(workers);

    console.log(`Email delivery completed. Sent: ${sentCount}, Failed: ${failedCount}`);

    return NextResponse.json({
      message: 'Email delivery process completed',
      sent: sentCount,
      failed: failedCount,
      total: subscriptions.length,
      results
    });

  } catch (error) {
    console.error('Error in email delivery process:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing/manual triggering
export async function GET(request: NextRequest) {
  try {
    // Temporarily allow anyone to trigger emails (for testing)
    // const authHeader = request.headers.get('authorization');
    // if (!authHeader) {
    //   return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    // }

    // const expectedToken = process.env.EMAIL_SERVICE_TOKEN;
    // if (authHeader !== `Bearer ${expectedToken}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Trigger email delivery
    const response = await POST(request);
    return response;

  } catch (error) {
    console.error('Error in GET email delivery:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
