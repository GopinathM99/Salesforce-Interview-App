import { NextRequest, NextResponse } from 'next/server';
import { runEmailDeliveryJob } from '@/lib/emailDeliveryJob';

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const authHeader = request.headers.get('authorization');
    const expectedServiceToken = process.env.EMAIL_SERVICE_TOKEN;
    const sendAllQuery = url.searchParams.get('sendAll');

    const requestedIncludeAllActive =
      sendAllQuery === '1' || sendAllQuery?.toLowerCase() === 'true';
    let includeAllActive = requestedIncludeAllActive;

    if (!includeAllActive && request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.json();
        includeAllActive = Boolean(body?.sendAll ?? body?.includeAllActive);
      } catch (error) {
        console.warn('send-emails: failed to parse JSON body', error);
      }
    }

    const isCronAuth = Boolean(
      expectedServiceToken && authHeader === `Bearer ${expectedServiceToken}`
    );

    includeAllActive = isCronAuth ? includeAllActive : true;

    // Temporarily allow anyone to send emails (for testing)
    // const authHeader = request.headers.get('authorization');
    // const expectedToken = process.env.EMAIL_SERVICE_TOKEN;
    
    // if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const jobResult = await runEmailDeliveryJob({ includeAllActive });
    return NextResponse.json(jobResult);

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
