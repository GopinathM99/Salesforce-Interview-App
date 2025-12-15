import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

type ClientMessage = {
  role: "user" | "assistant";
  content: string;
};

export const runtime = "nodejs";

const DEFAULT_MODEL_ID = "gemini-3-pro-preview";
const FLASH_MODEL_ID = "gemini-2.5-flash";
const ALLOWED_MODEL_IDS = [DEFAULT_MODEL_ID, FLASH_MODEL_ID];
const DAILY_LIMIT = 100; // Global daily limit across all users

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
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const missingEnv = [
      !apiKey ? "GEMINI_API_KEY" : null,
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

    // Narrow env types for TypeScript after validation
    const apiKeyValue = apiKey as string;
    const supabaseUrlValue = supabaseUrl as string;
    const supabaseAnonKeyValue = supabaseAnonKey as string;
    const supabaseServiceKeyValue = supabaseServiceKey as string;

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service role key to validate the JWT token (bypasses RLS, can validate any token)
    const supabaseAdmin = createClient(supabaseUrlValue, supabaseServiceKeyValue);

    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: `Unauthorized: ${userError?.message || "Invalid session"}` }, { status: 401 });
    }

    // Create a client with the user's token for RLS-protected operations
    const supabase = createClient(supabaseUrlValue, supabaseAnonKeyValue, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    // Check if user is admin
    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
    if (adminError) {
      console.error("Failed to check admin status", adminError);
      return NextResponse.json(
        { error: "Could not verify admin status." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { messages?: ClientMessage[]; model?: string };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "Request must include a non-empty messages array." },
        { status: 400 }
      );
    }

    const normalizeModelId = (model?: string) => {
      if (!model) return DEFAULT_MODEL_ID;
      if (model === "flash") return FLASH_MODEL_ID; // Backward compatibility
      if (model === "default") return DEFAULT_MODEL_ID;
      if (ALLOWED_MODEL_IDS.includes(model)) return model;
      return DEFAULT_MODEL_ID;
    };

    // Determine which model to use
    const modelId = normalizeModelId(body.model);

    // Log which model is being called
    console.log(`[Gemini API] User ${user.id} requesting model: ${modelId}`);

    // Check global daily limit (applies to all users, but admins can bypass)
    if (!isAdmin) {
      // Use service role to count ALL usage logs (bypass RLS)
      const supabaseAdmin = createClient(supabaseUrlValue, supabaseServiceKeyValue);
      const { start, end } = getTodayRange();
      const { count, error: usageError } = await supabaseAdmin
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

      const currentCount = count ?? 0;

      // Get breakdown by model for logging
      const { data: modelBreakdown } = await supabaseAdmin
        .from("gemini_usage_logs")
        .select("model")
        .gte("used_at", start)
        .lt("used_at", end);

      const breakdownMap = (modelBreakdown ?? []).reduce((acc, { model }) => {
        acc[model] = (acc[model] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const breakdownStr = Object.entries(breakdownMap)
        .map(([model, count]) => `${model}: ${count}`)
        .join(", ");

      console.log(`[Gemini API] Daily usage: ${currentCount}/${DAILY_LIMIT} total calls | Breakdown: ${breakdownStr || "none"} | Requesting: ${modelId}`);

      if (currentCount >= DAILY_LIMIT) {
        console.warn(`[Gemini API] Daily limit reached: ${currentCount}/${DAILY_LIMIT}`);
        return NextResponse.json(
          {
            error:
              `Global daily limit of ${DAILY_LIMIT} API calls has been reached. Please try again tomorrow.`
          },
          { status: 429 }
        );
      }
    }

    const { error: logError } = await supabase
      .from("gemini_usage_logs")
      .insert({ user_id: user.id, model: modelId });

    if (logError) {
      console.error("Failed to log Gemini usage", logError);
      return NextResponse.json(
        { error: "Could not log Gemini usage." },
        { status: 500 }
      );
    }

    console.log(`[Gemini API] Successfully logged usage for model: ${modelId}`);

    const messages = body.messages.map((message) => ({
      role: mapRole(message.role),
      parts: [{ text: message.content.trim() }]
    }));

    const genAI = new GoogleGenerativeAI(apiKeyValue);
    const model = genAI.getGenerativeModel({ model: modelId });

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
