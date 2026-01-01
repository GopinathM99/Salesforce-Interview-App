import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { STTTranscriptResponse } from "@/lib/types";

export const runtime = "nodejs";

const ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com/v2";
const MAX_POLL_ATTEMPTS = 60; // 30 seconds max (500ms intervals)
const POLL_INTERVAL_MS = 500;

async function uploadAudio(
  audioBuffer: Buffer,
  apiKey: string
): Promise<string> {
  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/octet-stream"
    },
    body: new Uint8Array(audioBuffer)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.upload_url;
}

async function createTranscript(
  audioUrl: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speech_model: "universal"
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcript creation failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.id;
}

async function pollTranscript(
  transcriptId: string,
  apiKey: string
): Promise<{ transcript: string; confidence: number }> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetch(
      `${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`,
      {
        method: "GET",
        headers: {
          Authorization: apiKey
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Poll failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.status === "completed") {
      return {
        transcript: data.text || "",
        confidence: data.confidence || 0
      };
    }

    if (data.status === "error") {
      throw new Error(`Transcription error: ${data.error || "Unknown error"}`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Transcription timed out");
}

export async function POST(request: NextRequest) {
  try {
    const assemblyaiApiKey = process.env.ASSEMBLYAI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const missingEnv = [
      !assemblyaiApiKey ? "ASSEMBLYAI_API_KEY" : null,
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

    console.log(`[AssemblyAI STT] Processing audio for user ${user.id}, size: ${audioFile.size} bytes`);

    // Step 1: Upload audio
    const uploadUrl = await uploadAudio(audioBuffer, assemblyaiApiKey!);
    console.log(`[AssemblyAI STT] Audio uploaded successfully`);

    // Step 2: Create transcript
    const transcriptId = await createTranscript(uploadUrl, assemblyaiApiKey!);
    console.log(`[AssemblyAI STT] Transcript created, ID: ${transcriptId}`);

    // Step 3: Poll for result
    const result = await pollTranscript(transcriptId, assemblyaiApiKey!);
    console.log(`[AssemblyAI STT] Transcription complete for user ${user.id}, confidence: ${result.confidence}`);

    const response: STTTranscriptResponse = {
      transcript: result.transcript,
      confidence: result.confidence
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[AssemblyAI STT] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
