import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type QuestionRequestBody = {
  topic?: string;
  difficulty?: string;
  category?: string;
};

const getEnv = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { supabaseUrl, supabaseServiceKey };
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
    const { supabaseUrl, supabaseServiceKey } = getEnv();
    const missingEnv = [
      !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
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

    const body = (await request.json().catch(() => null)) as QuestionRequestBody | null;
    const topic = body?.topic?.trim();
    const difficulty = body?.difficulty?.trim();
    const category = body?.category?.trim();

    const { data, error } = await supabaseAdmin.rpc("random_questions", {
      n: 5,
      topics: topic ? [topic] : null,
      difficulties: difficulty ? [difficulty] : null,
      mcq_only: false,
      include_attempted: true,
      flashcards_only: true
    });

    if (error) {
      console.error("Failed to fetch random question", error);
      return NextResponse.json({ error: "Could not fetch question." }, { status: 500 });
    }

    const list = Array.isArray(data) ? data : [];
    const selected =
      (category ? list.find((item) => item.category === category) : null) ?? list[0] ?? null;

    if (!selected) {
      return NextResponse.json({ error: "No questions available." }, { status: 404 });
    }

    return NextResponse.json({
      question: {
        id: selected.id,
        question_text: selected.question_text,
        topic: selected.topic ?? null,
        category: selected.category ?? null,
        difficulty: selected.difficulty ?? null
      }
    });
  } catch (error) {
    console.error("Live agent question error", error);
    const message = error instanceof Error ? error.message : "Unknown live agent error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
