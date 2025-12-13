import { NextRequest, NextResponse } from 'next/server';
import { runEmailDeliveryJob } from '@/lib/emailDeliveryJob';

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

    const { searchParams } = new URL(request.url);
    const sendAllQuery = searchParams.get('sendAll');
    const includeAllActive = sendAllQuery === '1' || sendAllQuery?.toLowerCase() === 'true';

    const jobResult = await runEmailDeliveryJob({ includeAllActive });
    return NextResponse.json({
      success: true,
      data: jobResult
    });

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
