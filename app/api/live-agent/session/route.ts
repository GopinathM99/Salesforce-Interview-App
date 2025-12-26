import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { LiveAgentSessionRequest } from "@/lib/types";

export const runtime = "nodejs";

type SessionCreateBody = LiveAgentSessionRequest & {
  model?: string | null;
  metadata?: Record<string, unknown>;
};

type SessionUpdateBody = {
  session_id?: string;
  status?: string;
  ended_at?: string;
};

const getEnv = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
};

const requireAuth = async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { error: "Unauthorized", status: 401 } as const;
  }
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return { error: "Unauthorized", status: 401 } as const;
  }
  return { accessToken } as const;
};

export async function POST(request: NextRequest) {
  try {
    const { supabaseUrl, supabaseAnonKey, supabaseServiceKey } = getEnv();
    const missingEnv = [
      !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !supabaseAnonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
      !supabaseServiceKey ? "SUPABASE_SERVICE_ROLE_KEY" : null
    ].filter(Boolean) as string[];

    if (missingEnv.length > 0) {
      return NextResponse.json(
        { error: `Missing environment variables: ${missingEnv.join(", ")}` },
        { status: 500 }
      );
    }

    const auth = await requireAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);
    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(auth.accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: `Unauthorized: ${userError?.message || "Invalid session"}` },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as SessionCreateBody | null;
    const role = body?.role?.trim() || "Salesforce Developer";
    const interviewType = body?.interview_type?.trim() || "mixed";
    const level = body?.level?.trim() || null;
    const model = body?.model ?? null;
    const metadata = body?.metadata ?? {};

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`
        }
      }
    });

    const { data, error } = await supabase
      .from("live_agent_sessions")
      .insert({
        user_id: user.id,
        role,
        interview_type: interviewType,
        level,
        model,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create live agent session", error);
      return NextResponse.json({ error: "Could not create live session." }, { status: 500 });
    }

    return NextResponse.json({ session: data });
  } catch (error) {
    console.error("Live agent session error", error);
    const message = error instanceof Error ? error.message : "Unknown live agent error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabaseUrl, supabaseAnonKey, supabaseServiceKey } = getEnv();
    const missingEnv = [
      !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !supabaseAnonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
      !supabaseServiceKey ? "SUPABASE_SERVICE_ROLE_KEY" : null
    ].filter(Boolean) as string[];

    if (missingEnv.length > 0) {
      return NextResponse.json(
        { error: `Missing environment variables: ${missingEnv.join(", ")}` },
        { status: 500 }
      );
    }

    const auth = await requireAuth(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);
    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(auth.accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: `Unauthorized: ${userError?.message || "Invalid session"}` },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as SessionUpdateBody | null;
    const sessionId = body?.session_id?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "session_id is required." }, { status: 400 });
    }

    const status = body?.status?.trim() || "ended";
    const endedAt = body?.ended_at ?? new Date().toISOString();

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`
        }
      }
    });

    const { data, error } = await supabase
      .from("live_agent_sessions")
      .update({
        status,
        ended_at: endedAt
      })
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update live agent session", error);
      return NextResponse.json({ error: "Could not update live session." }, { status: 500 });
    }

    return NextResponse.json({ session: data });
  } catch (error) {
    console.error("Live agent session update error", error);
    const message = error instanceof Error ? error.message : "Unknown live agent error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
