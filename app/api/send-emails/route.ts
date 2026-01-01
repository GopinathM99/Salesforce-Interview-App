import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runEmailDeliveryJob } from '@/lib/emailDeliveryJob';

type AuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

async function authorizeRequest(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization') ?? '';
  const expectedServiceToken = process.env.EMAIL_SERVICE_TOKEN;

  if (expectedServiceToken && authHeader === `Bearer ${expectedServiceToken}`) {
    return { ok: true };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, error: 'Supabase environment variables are not configured.' };
  }

  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  if (adminError) {
    return { ok: false, status: 500, error: 'Failed to verify admin access.' };
  }

  if (!isAdmin) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return { ok: true };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(request.url);
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
    const auth = await authorizeRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

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
