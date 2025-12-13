import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request from Vercel
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Cron job triggered: Starting email delivery process...');
    
    // Call the email sending API on the same origin as this request.
    // Using request.url is more reliable than VERCEL_URL in cron/serverless contexts.
    const sendEmailsUrl = new URL('/api/send-emails', request.url);

    const emailServiceToken = process.env.EMAIL_SERVICE_TOKEN || 'test-token';
    
    const response = await fetch(sendEmailsUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailServiceToken}`,
        'Content-Type': 'application/json',
      },
    });

    const rawBody = await response.text();
    let data: unknown = null;

    try {
      data = rawBody ? JSON.parse(rawBody) : null;
    } catch (error) {
      const contentType = response.headers.get('content-type');
      const preview = rawBody.slice(0, 600);

      console.error('Cron job error: send-emails did not return JSON', {
        status: response.status,
        contentType,
        url: sendEmailsUrl.toString(),
        preview
      });

      return NextResponse.json(
        {
          success: false,
          error: 'send-emails returned non-JSON response',
          status: response.status,
          contentType,
          url: sendEmailsUrl.toString(),
          preview
        },
        { status: 502 }
      );
    }

    if (response.ok) {
      console.log('Email delivery completed successfully:', data);
      return NextResponse.json({
        success: true,
        message: 'Email delivery completed',
        data
      });
    } else {
      console.error('Email delivery failed:', data);
      return NextResponse.json({
        success: false,
        error: data.error || 'Email delivery failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Cron job error:', error);
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
