import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type MessageCreateBody = {
  session_id?: string;
  role?: "user" | "assistant" | "system";
  content?: string;
  source?: "text" | "audio" | "transcript";
  metadata?: Record<string, unknown>;
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

    const body = (await request.json().catch(() => null)) as MessageCreateBody | null;
    const sessionId = body?.session_id?.trim();
    const role = body?.role;
    const content = body?.content?.trim();
    const source = body?.source ?? "text";
    const metadata = body?.metadata ?? {};

    if (!sessionId || !role || !content) {
      return NextResponse.json(
        { error: "session_id, role, and content are required." },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`
        }
      }
    });

    const { data: sessionRecord, error: sessionError } = await supabase
      .from("live_agent_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !sessionRecord) {
      return NextResponse.json({ error: "Invalid session." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("live_agent_messages")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        role,
        content,
        source,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create live agent message", error);
      return NextResponse.json({ error: "Could not save message." }, { status: 500 });
    }

    return NextResponse.json({ message: data });
  } catch (error) {
    console.error("Live agent message error", error);
    const message = error instanceof Error ? error.message : "Unknown live agent error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
