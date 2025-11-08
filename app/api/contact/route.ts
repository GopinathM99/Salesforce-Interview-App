import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email configuration using the same setup as emailService
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: ContactFormData = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
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

    // Check if Gmail credentials are configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Gmail credentials not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Generate HTML email template with inline styles for better email client compatibility
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contact Form Submission</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #007bff; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px; color: #ffffff;">New Contact Form Submission</h1>
            <p style="margin: 10px 0 0 0; color: #ffffff; opacity: 0.95;">Salesforce Interview Prep</p>
          </div>

          <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; margin-bottom: 25px; color: #333333;">
              You have received a new message from the Contact Us form.
            </p>

            <div style="margin-bottom: 20px; padding: 15px; background-color: #fff5e6; border-radius: 4px; border: 1px solid #f0dfc7;">
              <div style="font-weight: bold; color: #007bff; margin-bottom: 5px;">Name:</div>
              <div style="color: #333333;">${name}</div>
            </div>

            <div style="margin-bottom: 20px; padding: 15px; background-color: #fff5e6; border-radius: 4px; border: 1px solid #f0dfc7;">
              <div style="font-weight: bold; color: #007bff; margin-bottom: 5px;">Email:</div>
              <div style="color: #333333;">${email}</div>
            </div>

            <div style="margin-bottom: 20px; padding: 15px; background-color: #fff5e6; border-radius: 4px; border: 1px solid #f0dfc7;">
              <div style="font-weight: bold; color: #007bff; margin-bottom: 5px;">Subject:</div>
              <div style="color: #333333;">${subject}</div>
            </div>

            <div style="margin-bottom: 20px; padding: 15px; background-color: #fff5e6; border-radius: 4px; border: 1px solid #f0dfc7;">
              <div style="font-weight: bold; color: #007bff; margin-bottom: 5px;">Message:</div>
              <div style="color: #333333; white-space: pre-wrap;">${message}</div>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e9ecef; font-size: 14px; color: #666666;">
              <p style="margin: 5px 0; color: #666666;"><strong style="color: #333333;">Submitted at:</strong> ${new Date().toLocaleString()}</p>
              <p style="margin: 5px 0; color: #666666;"><strong style="color: #333333;">Reply-To:</strong> <a href="mailto:${email}" style="color: #007bff; text-decoration: none;">${email}</a></p>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; font-size: 12px; color: #666666;">
            <p style="margin: 0; color: #999999;">This email was sent from the Salesforce Interview Prep contact form.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Email options
    const mailOptions = {
      from: `"Salesforce Interview Prep - Contact Form" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // Send to yourself
      replyTo: email, // Allow easy reply to the user
      subject: `Contact Form: ${subject}`,
      html: htmlContent,
    };

    // Send the email
    const result = await transporter.sendMail(mailOptions);
    console.log(`Contact form email sent successfully:`, result.messageId);

    return NextResponse.json(
      {
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon!',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending contact form email:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send message. Please try again later.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
