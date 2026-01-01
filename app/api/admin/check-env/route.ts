import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type AuthResult =
  | { ok: true; supabase: ReturnType<typeof createClient> }
  | { ok: false; status: number; error: string };

function requireAdmin(request: NextRequest): AuthResult {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      status: 500,
      error: 'Supabase environment variables are not configured.'
    };
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });

  return { ok: true, supabase };
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const {
    data: { user },
    error: userError
  } = await auth.supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: isAdmin, error: adminError } = await auth.supabase.rpc('is_admin');
  if (adminError) {
    return NextResponse.json({ error: 'Failed to verify admin access.' }, { status: 500 });
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const envVariables = [
    // Supabase
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',

    // Email
    'GMAIL_USER',
    'GMAIL_APP_PASSWORD',

    // Site
    'NEXT_PUBLIC_SITE_URL',

    // Cron & Services
    'CRON_SECRET',
    'EMAIL_SERVICE_TOKEN',

    // API Keys
    'GEMINI_API_KEY',

    // Optional
    'VERCEL_URL',
    'EMAIL_SEND_CONCURRENCY',
    'EMAIL_SEND_THROTTLE_MS'
  ];

  const results = envVariables.map((varName) => {
    const value = process.env[varName];
    return {
      name: varName,
      present: !!value
    };
  });

  return NextResponse.json({ variables: results });
}
