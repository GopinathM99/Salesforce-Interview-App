import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getSubscriptionsDueForDelivery,
  generateQuestionsForSubscription,
  sendEmailToSubscriber,
  logEmailDelivery,
  updateSubscriptionLastSent,
  generateUnsubscribeToken
} from '@/lib/emailService';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  void request;
  try {
    // Temporarily allow anyone to send emails (for testing)
    // const authHeader = request.headers.get('authorization');
    // const expectedToken = process.env.EMAIL_SERVICE_TOKEN;
    
    // if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('Starting email delivery process...');
    
    // Get subscriptions due for delivery
    const subscriptions = await getSubscriptionsDueForDelivery();
    console.log(`Found ${subscriptions.length} subscriptions due for delivery`);

    if (subscriptions.length === 0) {
      return NextResponse.json({ 
        message: 'No subscriptions due for delivery',
        sent: 0,
        failed: 0
      });
    }

    let sentCount = 0;
    let failedCount = 0;
    const results = [];

    for (const subscription of subscriptions) {
      try {
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

          failedCount++;
          results.push({
            email: subscription.email,
            status: 'failed',
            error: errorMessage
          });
          continue;
        }

        // Generate unsubscribe token
        const unsubscribeToken = generateUnsubscribeToken(subscription.id);
        
        // Store unsubscribe token in database
        const supabase = getSupabaseClient();
        await supabase
          .from('unsubscribe_tokens')
          .insert({
            subscription_id: subscription.id,
            token: unsubscribeToken
          });

        // Send email
        const emailResult = await sendEmailToSubscriber(
          subscription,
          questions,
          unsubscribeToken
        );

        if (emailResult.success) {
          // Log successful delivery
          await logEmailDelivery(
            subscription.id,
            subscription.email,
            questions,
            'sent'
          );
          
          // Update last_sent_at timestamp
          await updateSubscriptionLastSent(subscription.id);
          
          sentCount++;
          results.push({
            email: subscription.email,
            status: 'sent',
            questionsCount: questions.length,
            ...(fallbackExplanation ? { note: fallbackExplanation } : {})
          });
          
          if (fallbackExplanation) {
            console.log(`Email sent to ${subscription.email} with relaxed filters: ${fallbackExplanation}`);
          } else {
            console.log(`Email sent successfully to ${subscription.email}`);
          }
        } else {
          // Log failed delivery
          await logEmailDelivery(
            subscription.id,
            subscription.email,
            questions,
            'failed',
            emailResult.error
          );
          
          failedCount++;
          results.push({
            email: subscription.email,
            status: 'failed',
            error: emailResult.error
          });
          
          console.error(`Failed to send email to ${subscription.email}:`, emailResult.error);
        }

        // Add small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error processing subscription for ${subscription.email}:`, error);
        failedCount++;
        results.push({
          email: subscription.email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

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
