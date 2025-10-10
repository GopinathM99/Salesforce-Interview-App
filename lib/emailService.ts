import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export interface EmailQuestion {
  id: string;
  question_text: string;
  answer_text: string;
  topic: string;
  sub_topic: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  mcq?: {
    id: string;
    choices: string[];
    correct_choice_index: number;
    explanation: string | null;
  } | null;
}

export interface SubscriptionPreferences {
  id: string;
  email: string;
  user_id: string | null;
  topics: string[];
  difficulties: string[];
  question_types: string[];
  practice_modes: string[];
  question_count: number;
  delivery_frequency: 'Daily' | 'Weekly' | 'Bi-weekly';
  include_answers: boolean;
  custom_message: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailDeliveryLog {
  id: string;
  subscription_id: string;
  email: string;
  questions_sent: EmailQuestion[];
  sent_at: string;
  status: 'sent' | 'failed' | 'bounced';
  error_message?: string;
}

/**
 * Generate questions for a subscription based on preferences
 */
export interface QuestionGenerationResult {
  questions: EmailQuestion[];
  fallbackExplanation?: string;
  failureReason?: string;
}

export async function generateQuestionsForSubscription(
  preferences: SubscriptionPreferences
): Promise<QuestionGenerationResult> {
  try {
    const supabase = getSupabaseClient();
    const includeAttempted = false; // Don't include attempted questions for email

    type RandomQuestionPayload = {
      n: number;
      topics: string[] | null;
      difficulties: string[] | null;
      mcq_only: boolean;
      include_attempted: boolean;
      flashcards_only: boolean;
    };

    const basePayload: RandomQuestionPayload = {
      n: preferences.question_count,
      topics: preferences.topics.length > 0 ? preferences.topics : null,
      difficulties: preferences.difficulties.length > 0 ? preferences.difficulties : null,
      mcq_only: false,
      include_attempted: includeAttempted,
      flashcards_only: true // Show flashcards only (questions without MCQ metadata)
    };

    const attempts: Array<{
      payload: RandomQuestionPayload;
      explanation?: string;
    }> = [
      { payload: { ...basePayload } }
    ];

    let payloadTracker = { ...basePayload };

    // Don't relax topic filter - users specifically selected these topics
    // If no flashcards exist for selected topics, return empty rather than random topics

    // Only relax difficulty filter if no questions found with exact topic match
    if (basePayload.difficulties) {
      payloadTracker = { ...payloadTracker, difficulties: null };
      attempts.push({
        payload: { ...payloadTracker },
        explanation: 'Relaxed difficulty filter because no matching flashcards were found for the selected topics.'
      });
    }

    // MCQ-only logic removed since we always use flashcards mode

    let lastError: string | undefined;

    for (const attempt of attempts) {
      const { data, error } = await supabase.rpc('random_questions', attempt.payload);

      if (error) {
        console.error('Error generating questions:', error);
        lastError = error.message;
        continue;
      }

      const questions = (data as EmailQuestion[]) || [];

      if (questions.length > 0) {
        return {
          questions,
          fallbackExplanation: attempt.explanation
        };
      }
    }

    return {
      questions: [],
      failureReason: lastError || 'No questions available for the selected preferences.'
    };
  } catch (error) {
    console.error('Error in generateQuestionsForSubscription:', error);
    return {
      questions: [],
      failureReason: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate HTML email template for daily challenges
 */
export function generateEmailHTML(
  preferences: SubscriptionPreferences,
  questions: EmailQuestion[],
  unsubscribeToken: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${unsubscribeToken}`;
  
  const questionHTML = questions.map((question, index) => {
    const questionNumber = index + 1;
    let questionContent = `
      <div style="margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
        <h3 style="margin-top: 0; color: #333; font-size: 18px;">Question ${questionNumber}</h3>
        <div style="margin-bottom: 15px;">
          <span style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px;">${question.topic}</span>
          <span style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${question.difficulty}</span>
        </div>
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 15px;">${question.question_text}</p>
    `;

    // Skip MCQ choices for flashcards - flashcards should only show question and answer
    // MCQ choices are only shown for actual MCQ questions, not flashcards

    // Add answer if included
    if (preferences.include_answers && question.answer_text) {
      questionContent += `
        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 4px; border-left: 4px solid #17a2b8;">
          <p style="margin: 0; font-weight: bold; color: #0c5460;">Answer:</p>
          <p style="margin: 5px 0 0 0; color: #0c5460;">${question.answer_text}</p>
        </div>
      `;
    }

    // Skip MCQ explanations for flashcards - flashcards use answer_text instead
    // MCQ explanations are only shown for actual MCQ questions, not flashcards

    questionContent += `</div>`;
    return questionContent;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Salesforce Challenge</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        .unsubscribe { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
        .unsubscribe a { color: #666; text-decoration: none; }
        .unsubscribe a:hover { text-decoration: underline; }
        @media (max-width: 600px) {
          .container { padding: 10px; }
          .content { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">🚀 Daily Salesforce Challenge</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${preferences.delivery_frequency} Practice Questions</p>
        </div>
        
        <div class="content">
          <p style="font-size: 16px; margin-bottom: 25px;">
            Hello! Here are your ${preferences.delivery_frequency.toLowerCase()} Salesforce interview practice questions.
            ${preferences.custom_message ? `<br><br><em>"${preferences.custom_message}"</em>` : ''}
          </p>
          
          ${questionHTML}
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${baseUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
              Practice More Questions
            </a>
          </div>
        </div>
        
        <div class="footer">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #333; font-size: 14px;">Your Subscription Details:</h4>
            <p style="margin: 5px 0; font-size: 13px; color: #666;">
              <strong>Topics:</strong> ${preferences.topics.join(', ')}
            </p>
            <p style="margin: 5px 0; font-size: 13px; color: #666;">
              <strong>Schedule:</strong> ${preferences.delivery_frequency}
            </p>
            <p style="margin: 5px 0; font-size: 13px; color: #666;">
              <strong>Questions per email:</strong> ${preferences.question_count}
            </p>
          </div>
          <div class="unsubscribe">
            <p>You're receiving this email because you subscribed to Salesforce interview practice questions.</p>
            <p><a href="${unsubscribeUrl}">Unsubscribe</a> | <a href="${baseUrl}/subscribe">Update Preferences</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send email to a single subscriber
 */
export async function sendEmailToSubscriber(
  preferences: SubscriptionPreferences,
  questions: EmailQuestion[],
  unsubscribeToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error('Gmail credentials not configured');
    }

    if (questions.length === 0) {
      console.log(`No questions available for ${preferences.email}`);
      return { success: true }; // Not an error, just no content
    }

    const htmlContent = generateEmailHTML(preferences, questions, unsubscribeToken);
    
    const mailOptions = {
      from: `"Salesforce Interview Prep" <${process.env.GMAIL_USER}>`,
      to: preferences.email,
      subject: `🚀 ${preferences.delivery_frequency} Salesforce Challenge - ${questions.length} Question${questions.length > 1 ? 's' : ''}`,
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${preferences.email}:`, result.messageId);
    
    return { success: true };
  } catch (error) {
    console.error(`Failed to send email to ${preferences.email}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Generate unsubscribe token for a subscription
 */
export function generateUnsubscribeToken(subscriptionId: string): string {
  // Simple token generation - in production, use a more secure method
  return Buffer.from(`${subscriptionId}-${Date.now()}`).toString('base64');
}

/**
 * Get active subscriptions that are due for email delivery
 */
interface SubscriptionFetchOptions {
  includeAllActive?: boolean;
}

export async function getSubscriptionsDueForDelivery(
  options: SubscriptionFetchOptions = {}
): Promise<SubscriptionPreferences[]> {
  try {
    const supabase = getSupabaseClient();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const includeAllActive = options.includeAllActive ?? false;
    
    // Get active subscriptions
    const { data: subscriptions, error } = await supabase
      .from('subscription_preferences')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }

    if (includeAllActive) {
      return subscriptions;
    }

    // Filter subscriptions based on delivery frequency
    const dueSubscriptions = subscriptions.filter(sub => {
      const lastSent = sub.last_sent_at ? new Date(sub.last_sent_at) : null;
      
      switch (sub.delivery_frequency) {
        case 'Daily':
          return !lastSent || lastSent.toISOString().split('T')[0] !== today;
        case 'Weekly':
          if (!lastSent) return true;
          const daysSinceLastSent = Math.floor((now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceLastSent >= 7;
        case 'Bi-weekly':
          if (!lastSent) return true;
          const daysSinceLastSentBiweekly = Math.floor((now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceLastSentBiweekly >= 14;
        default:
          return false;
      }
    });

    return dueSubscriptions;
  } catch (error) {
    console.error('Error in getSubscriptionsDueForDelivery:', error);
    return [];
  }
}

/**
 * Log email delivery attempt
 */
export async function logEmailDelivery(
  subscriptionId: string,
  email: string,
  questions: EmailQuestion[],
  status: 'sent' | 'failed' | 'bounced',
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase
      .from('email_delivery_logs')
      .insert({
        subscription_id: subscriptionId,
        email,
        questions_sent: questions,
        sent_at: new Date().toISOString(),
        status,
        error_message: errorMessage
      });
  } catch (error) {
    console.error('Error logging email delivery:', error);
  }
}

/**
 * Update last_sent_at timestamp for subscription
 */
export async function updateSubscriptionLastSent(subscriptionId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase
      .from('subscription_preferences')
      .update({ last_sent_at: new Date().toISOString() })
      .eq('id', subscriptionId);
  } catch (error) {
    console.error('Error updating subscription last_sent_at:', error);
  }
}
