import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Generate random 6-digit OTP code
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Generate HTML email for OTP
function generateOTPEmailHTML(code: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your One-Time Code</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .code-box { background-color: #f8f9fa; border: 2px dashed #007bff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .code { font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        @media (max-width: 600px) {
          .container { padding: 10px; }
          .content { padding: 20px; }
          .code { font-size: 24px; letter-spacing: 4px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">🔐 Your One-Time Code</h1>
        </div>

        <div class="content">
          <p style="font-size: 16px; margin-bottom: 25px;">
            You requested to sign in to Salesforce Interview Prep. Use the code below to complete your sign-in:
          </p>

          <div class="code-box">
            <div class="code">${code}</div>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            This code will expire in <strong>10 minutes</strong>.
          </p>

          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>

        <div class="footer">
          <p>Salesforce Interview Prep - One-Time Code Authentication</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Check if email exists in user_profiles
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('email, user_id')
      .eq('email', email.toLowerCase())
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'This email doesn\'t exist in database.\nFirst Time Users have to use Google Sign-In' },
        { status: 404 }
      );
    }

    // Generate OTP code
    const otpCode = generateOTPCode();

    // Store OTP code in database
    const { error: insertError } = await supabase
      .from('otp_codes')
      .insert({
        email: email.toLowerCase(),
        code: otpCode,
      });

    if (insertError) {
      console.error('Error storing OTP code:', insertError);
      return NextResponse.json(
        { error: 'Failed to generate OTP code' },
        { status: 500 }
      );
    }

    // Send email with OTP code
    const mailOptions = {
      from: `"Salesforce Interview Prep" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '🔐 Your One-Time Sign-In Code',
      html: generateOTPEmailHTML(otpCode),
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`OTP code sent successfully to ${email}`);
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send OTP code to email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP code sent to your email',
    });
  } catch (error) {
    console.error('Error in OTP send endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
