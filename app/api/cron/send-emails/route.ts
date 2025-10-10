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
    
    // Call the email sending API
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const emailServiceToken = process.env.EMAIL_SERVICE_TOKEN || 'test-token';
    
    const response = await fetch(`${baseUrl}/api/send-emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailServiceToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

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
