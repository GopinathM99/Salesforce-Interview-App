import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing unsubscribe token' }, { status: 400 });
    }

    // Find the unsubscribe token
    const { data: tokenData, error: tokenError } = await supabase
      .from('unsubscribe_tokens')
      .select('*, subscription_preferences(*)')
      .eq('token', token)
      .eq('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ 
        error: 'Invalid or expired unsubscribe token' 
      }, { status: 400 });
    }

    // Deactivate the subscription
    const { error: updateError } = await supabase
      .from('subscription_preferences')
      .update({ is_active: false })
      .eq('id', tokenData.subscription_id);

    if (updateError) {
      console.error('Error deactivating subscription:', updateError);
      return NextResponse.json({ 
        error: 'Failed to unsubscribe' 
      }, { status: 500 });
    }

    // Mark token as used
    await supabase
      .from('unsubscribe_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from email notifications',
      email: tokenData.subscription_preferences.email
    });

  } catch (error) {
    console.error('Error in unsubscribe process:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Token-based unsubscribe is required.' },
    { status: 405 }
  );
}
