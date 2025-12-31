import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { STTTranscriptResponse } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const missingEnv = [
      !deepgramApiKey ? "DEEPGRAM_API_KEY" : null,
      !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
      !supabaseServiceKey ? "SUPABASE_SERVICE_ROLE_KEY" : null
    ].filter(Boolean) as string[];

    if (missingEnv.length > 0) {
      return NextResponse.json(
        { error: `Missing environment variables: ${missingEnv.join(", ")}` },
        { status: 500 }
      );
    }

    // Authenticate user
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

    // Parse the FormData to get the audio file
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Audio file too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Determine content type
    const contentType = audioFile.type || "audio/webm";

    // Call Deepgram API
    const deepgramUrl = new URL("https://api.deepgram.com/v1/listen");
    deepgramUrl.searchParams.set("model", "nova-3");
    deepgramUrl.searchParams.set("language", "en");
    deepgramUrl.searchParams.set("smart_format", "true");
    deepgramUrl.searchParams.set("punctuate", "true");

    console.log(`[Deepgram STT] Processing audio for user ${user.id}, size: ${audioFile.size} bytes`);

    const deepgramResponse = await fetch(deepgramUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `Token ${deepgramApiKey}`,
        "Content-Type": contentType
      },
      body: audioBuffer
    });

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error(`[Deepgram STT] API error: ${deepgramResponse.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Deepgram API error: ${deepgramResponse.status}` },
        { status: deepgramResponse.status }
      );
    }

    const deepgramResult = await deepgramResponse.json();

    // Extract transcript from Deepgram response
    const transcript =
      deepgramResult?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    const confidence =
      deepgramResult?.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

    console.log(`[Deepgram STT] Transcription complete for user ${user.id}, confidence: ${confidence}`);

    const response: STTTranscriptResponse = {
      transcript,
      confidence
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Deepgram STT] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
