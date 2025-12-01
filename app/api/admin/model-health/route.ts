import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

type ModelCheckResult = {
  model: string;
  label: string;
  ok: boolean;
  latencyMs: number;
  sample?: string;
  error?: string;
};

const MODEL_TARGETS = [
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }
];

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const missingEnv = [
      !apiKey ? "GEMINI_API_KEY" : null,
      !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !supabaseAnonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null
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

    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
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

    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
    if (adminError) {
      console.error("Failed to verify admin access for model health check", adminError);
      return NextResponse.json(
        { error: "Failed to verify admin access." },
        { status: 500 }
      );
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const genAI = new GoogleGenerativeAI(apiKey!);

    const results: ModelCheckResult[] = await Promise.all(
      MODEL_TARGETS.map(async ({ id, label }) => {
        const started = Date.now();
        try {
          const model = genAI.getGenerativeModel({ model: id });
          const response = await model.generateContent({
            contents: [
              {
                role: "user",
                parts: [{ text: "Ping. Reply with a short ok." }]
              }
            ],
            generationConfig: { maxOutputTokens: 16, temperature: 0 }
          });

          const latencyMs = Date.now() - started;
          const sample = response.response?.text?.() ?? "";

          return {
            model: id,
            label,
            ok: true,
            latencyMs,
            sample: sample.slice(0, 120)
          };
        } catch (error) {
          const latencyMs = Date.now() - started;
          const message =
            error instanceof Error ? error.message : "Unknown model call error.";

          return {
            model: id,
            label,
            ok: false,
            latencyMs,
            error: message
          };
        }
      })
    );

    const response = {
      ok: results.every((item) => item.ok),
      checkedAt: new Date().toISOString(),
      results
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Unexpected error while checking model health", error);
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
