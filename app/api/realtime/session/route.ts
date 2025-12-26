import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { LiveAgentSessionMetadata, LiveAgentSessionRequest } from "@/lib/types";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gpt-realtime";
const DEFAULT_TOKEN_TTL_SECONDS = 600;

const normalizeTopics = (topics?: string[] | null) => {
  if (!Array.isArray(topics)) return [];
  const normalized = topics
    .map((topic) => (typeof topic === "string" ? topic.trim() : ""))
    .filter(Boolean);
  return Array.from(new Set(normalized));
};

const normalizeQuestionCount = (value?: number | null) => {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(Number(value));
  if (rounded < 1) return null;
  return Math.min(10, rounded);
};

const buildInstructions = (metadata: LiveAgentSessionMetadata) => {
  const level = metadata.level ? ` (${metadata.level})` : "";
  const topicsLine =
    metadata.topics && metadata.topics.length > 0
      ? ` Focus on these topics: ${metadata.topics.join(", ")}.`
      : "";
  const questionCountLine =
    typeof metadata.question_count === "number" && metadata.question_count > 0
      ? ` Plan for ${metadata.question_count} total questions and wrap up after the last one.`
      : "";
  return `You are a mock interviewer for a ${metadata.role}${level} role. Ask one question at a time, wait for the user's answer, and keep responses concise.${topicsLine}${questionCountLine}`;
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const missingEnv = [
      !apiKey ? "OPENAI_API_KEY" : null,
      !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !supabaseServiceKey ? "SUPABASE_SERVICE_ROLE_KEY" : null
    ].filter(Boolean) as string[];

    if (missingEnv.length > 0) {
      return NextResponse.json(
        { error: `Missing environment variables: ${missingEnv.join(", ")}` },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);
    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: `Unauthorized: ${userError?.message || "Invalid session"}` },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as LiveAgentSessionRequest | null;
    const topics = normalizeTopics(body?.topics ?? []);
    const questionCount = normalizeQuestionCount(body?.question_count ?? null);

    const metadata: LiveAgentSessionMetadata = {
      user_id: user.id,
      role: body?.role?.trim() || "Salesforce Developer",
      interview_type: body?.interview_type?.trim() || "mixed",
      ...(body?.level?.trim() ? { level: body.level.trim() } : {}),
      ...(topics.length > 0 ? { topics } : {}),
      ...(questionCount ? { question_count: questionCount } : {})
    };

    const tokenTtl = Number(process.env.OPENAI_REALTIME_TOKEN_TTL_SECONDS);
    const expiresAfterSeconds =
      Number.isFinite(tokenTtl) && tokenTtl > 0 ? tokenTtl : DEFAULT_TOKEN_TTL_SECONDS;

    const model = process.env.OPENAI_REALTIME_MODEL || DEFAULT_MODEL;

    const payload = {
      expires_after: {
        anchor: "created_at",
        seconds: expiresAfterSeconds
      },
      session: {
        type: "realtime",
        model,
        instructions: buildInstructions(metadata)
      }
    };

    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.error?.message || "Failed to create realtime client secret.";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json({
      ...data,
      metadata
    });
  } catch (error) {
    console.error("Realtime session error", error);
    const message = error instanceof Error ? error.message : "Unknown realtime error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
