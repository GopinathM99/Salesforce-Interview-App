import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

type ClientMessage = {
  role: "user" | "assistant";
  content: string;
};

const MODEL_ID = "gemini-2.5-pro";

const mapRole = (role: ClientMessage["role"]): "user" | "model" =>
  role === "assistant" ? "model" : "user";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { messages?: ClientMessage[] };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "Request must include a non-empty messages array." },
        { status: 400 }
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
