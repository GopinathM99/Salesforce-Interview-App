import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  generateQuestionsForSubscription,
  sendEmailToSubscriber,
  logEmailDelivery,
  updateSubscriptionLastSent,
  generateUnsubscribeToken
} from '@/lib/emailService';

function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    console.log(`Sending individual email for subscription: ${subscriptionId}`);

    const supabase = getSupabaseClient();

    // Get the specific subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('subscription_preferences')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !subscription) {
      console.error('Error fetching subscription:', fetchError);
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    if (!subscription.is_active) {
      return NextResponse.json({ error: 'Subscription is not active' }, { status: 400 });
    }

    console.log(`Processing subscription for ${subscription.email}...`);

    // Generate questions for this subscription
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

      return NextResponse.json({
        success: false,
        error: errorMessage,
        email: subscription.email
      });
    }

    // Generate unsubscribe token
    const unsubscribeToken = generateUnsubscribeToken(subscription.id);

    await supabase
      .from('unsubscribe_tokens')
      .insert({
        subscription_id: subscription.id,
        token: unsubscribeToken
      });

    // Send the email
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

      return NextResponse.json({
        success: true,
        email: subscription.email,
        questionsCount: questions.length,
        message: `Email sent successfully to ${subscription.email}`,
        ...(fallbackExplanation ? { note: fallbackExplanation } : {})
      });
    }

    await logEmailDelivery(
      subscription.id,
      subscription.email,
      questions,
      'failed',
      emailResult.error
    );

    console.error(`Failed to send email to ${subscription.email}:`, emailResult.error);

    return NextResponse.json({
      success: false,
      error: emailResult.error,
      email: subscription.email
    });

  } catch (error) {
    console.error('Error in individual email delivery:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
