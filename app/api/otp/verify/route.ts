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

export async function POST(request: NextRequest) {
  try {
    const { email, code, flow, password, username, firstName, lastName } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'OTP code is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const normalizedEmail = email.toLowerCase();
    const resolvedFlow = flow === 'signup' ? 'signup' : 'signin';

    // Find valid OTP code
    const { data: otpRecords, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (otpError) {
      console.error('Error fetching OTP code:', otpError);
      return NextResponse.json(
        { error: 'Failed to verify OTP code' },
        { status: 500 }
      );
    }

    if (!otpRecords || otpRecords.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP code' },
        { status: 401 }
      );
    }

    const otpRecord = otpRecords[0];

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('otp_codes')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Error updating OTP code:', updateError);
    }

    let userProfile:
      | { user_id: string; email: string; first_name: string | null; last_name: string | null }
      | null = null;

    if (resolvedFlow === 'signup') {
      if (!password || typeof password !== 'string') {
        return NextResponse.json(
          { error: 'Password is required' },
          { status: 400 }
        );
      }
      if (!username || typeof username !== 'string') {
        return NextResponse.json(
          { error: 'Username is required' },
          { status: 400 }
        );
      }
      if (!firstName || typeof firstName !== 'string') {
        return NextResponse.json(
          { error: 'First name is required' },
          { status: 400 }
        );
      }
      if (!lastName || typeof lastName !== 'string') {
        return NextResponse.json(
          { error: 'Last name is required' },
          { status: 400 }
        );
      }

      const trimmedUsername = username.trim();
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();

      if (!trimmedUsername || !trimmedFirstName || !trimmedLastName) {
        return NextResponse.json(
          { error: 'All profile fields are required' },
          { status: 400 }
        );
      }

      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id, email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingProfile?.email) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in.' },
          { status: 409 }
        );
      }

      const { data: existingUsername } = await supabase
        .from('user_profiles')
        .select('user_id')
        .ilike('username', trimmedUsername)
        .maybeSingle();

      if (existingUsername?.user_id) {
        return NextResponse.json(
          { error: 'That username is already taken.' },
          { status: 409 }
        );
      }

      const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username: trimmedUsername,
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
          full_name: `${trimmedFirstName} ${trimmedLastName}`.trim()
        }
      });

      if (createError || !createdUser?.user) {
        console.error('Error creating auth user:', createError);
        return NextResponse.json(
          { error: createError?.message || 'Failed to create account' },
          { status: 500 }
        );
      }

      const now = new Date().toISOString();
      const { error: profileInsertError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: createdUser.user.id,
            email: normalizedEmail,
            username: trimmedUsername,
            first_name: trimmedFirstName,
            last_name: trimmedLastName,
            first_signed_in_at: now,
            last_signed_in_at: now,
            updated_at: now
          },
          { onConflict: 'user_id' }
        );

      if (profileInsertError) {
        console.error('Error creating user profile:', profileInsertError);
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        );
      }

      userProfile = {
        user_id: createdUser.user.id,
        email: normalizedEmail,
        first_name: trimmedFirstName,
        last_name: trimmedLastName
      };
    } else {
      const { data: existingProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, email, first_name, last_name')
        .eq('email', normalizedEmail)
        .single();

      if (profileError || !existingProfile) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        );
      }

      userProfile = existingProfile;

      // Get the user from auth.users to generate a session
      const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(
        existingProfile.user_id
      );

      if (authUserError || !authUser.user) {
        console.error('Error fetching auth user:', authUserError);
        return NextResponse.json(
          { error: 'Failed to authenticate user' },
          { status: 500 }
        );
      }
    }

    // Generate a session token for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    });

    if (sessionError || !sessionData) {
      console.error('Error generating session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      user: {
        id: userProfile?.user_id,
        email: userProfile?.email,
        first_name: userProfile?.first_name,
        last_name: userProfile?.last_name,
      },
      magicLink: sessionData.properties.action_link,
    });
  } catch (error) {
    console.error('Error in OTP verify endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
