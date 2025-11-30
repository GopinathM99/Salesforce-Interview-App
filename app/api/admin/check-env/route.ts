import { NextResponse } from 'next/server';

export async function GET() {
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
    'EMAIL_SEND_THROTTLE_MS',
  ];

  const results = envVariables.map(varName => {
    const value = process.env[varName];
    return {
      name: varName,
      present: !!value,
      // Show last 5 characters for verification (masked)
      preview: value ? `...${value.substring(value.length - 5)}` : null,
    };
  });

  return NextResponse.json({ variables: results });
}
