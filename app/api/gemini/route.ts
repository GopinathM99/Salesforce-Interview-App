import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

type ClientMessage = {
  role: "user" | "assistant";
  content: string;
};

const MODEL_ID = "gemini-2.5-pro";
const DAILY_LIMIT = 3;

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

const mapRole = (role: ClientMessage["role"]): "user" | "model" =>
  role === "assistant" ? "model" : "user";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration." },
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { messages?: ClientMessage[] };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "Request must include a non-empty messages array." },
        { status: 400 }
      );
    }

    const { start, end } = getTodayRange();
    const { count, error: usageError } = await supabase
      .from("gemini_usage_logs")
      .select("id", { count: "exact", head: true })
      .gte("used_at", start)
      .lt("used_at", end);

    if (usageError) {
      console.error("Failed to count Gemini usage", usageError);
      return NextResponse.json(
        { error: "Could not verify remaining attempts." },
        { status: 500 }
      );
    }

    if ((count ?? 0) >= DAILY_LIMIT) {
      return NextResponse.json(
        {
          error:
            "Max 3 attempts have been reached. Please try again tomorrow for more questions or try Flash Cards or Multiple Choice Questions."
        },
        { status: 429 }
      );
    }

    const { error: logError } = await supabase
      .from("gemini_usage_logs")
      .insert({ user_id: user.id });

    if (logError) {
      console.error("Failed to log Gemini usage", logError);
      return NextResponse.json(
        { error: "Could not log Gemini usage." },
        { status: 500 }
      );
    }

    const messages = body.messages.map((message) => ({
      role: mapRole(message.role),
      parts: [{ text: message.content.trim() }]
    }));

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_ID });

    const result = await model.generateContentStream({ contents: messages });
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (!chunkText) continue;
            const payload = JSON.stringify({ text: chunkText });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        } catch (streamError) {
          console.error("Gemini stream error", streamError);
          const message =
            streamError instanceof Error ? streamError.message : "Unknown Gemini error.";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      }
    });
  } catch (error) {
    console.error("Gemini chat error", error);
    const message = error instanceof Error ? error.message : "Unknown Gemini error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
