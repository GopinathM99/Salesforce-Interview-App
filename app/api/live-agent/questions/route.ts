import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type QuestionsRequestBody = {
  topics: string[];
  level: string;
  interview_type: string;
  question_count: number;
};

type InspirationQuestion = {
  id: string;
  question_text: string;
  topic: string;
  difficulty: string;
  question_type: string;
};

const LEVEL_TO_DIFFICULTY: Record<string, string> = {
  Junior: "easy",
  "Mid-level": "medium",
  Senior: "hard",
  Lead: "hard"
};

const getQuestionTypes = (interviewType: string): string[] | null => {
  switch (interviewType) {
    case "knowledge":
      return ["Knowledge"];
    case "scenario":
      return ["Scenarios"];
    case "behavioral":
      return null; // AI generates behavioral, no DB filter
    case "mixed":
      return null; // Include all types
    default:
      return null;
  }
};

const distributeQuestions = (count: number, topicCount: number): number[] => {
  if (topicCount === 0) return [];
  const base = Math.floor(count / topicCount);
  const remainder = count % topicCount;
  return Array.from({ length: topicCount }, (_, i) => base + (i < remainder ? 1 : 0));
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

    const body = (await request.json().catch(() => null)) as QuestionsRequestBody | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { topics, level, interview_type, question_count } = body;

    // Validate inputs
    const validatedTopics = Array.isArray(topics) ? topics.filter((t) => typeof t === "string" && t.trim()) : [];
    const validatedCount = Math.min(Math.max(1, question_count || 5), 10);
    const difficulty = LEVEL_TO_DIFFICULTY[level] || "medium";
    const questionTypes = getQuestionTypes(interview_type);

    // For behavioral type, return empty - AI will generate these
    if (interview_type === "behavioral") {
      return NextResponse.json({
        questions: [],
        meta: {
          requested_count: validatedCount,
          fetched_count: 0,
          distribution: {},
          fallback_used: false,
          note: "Behavioral questions are AI-generated"
        }
      });
    }

    // If no topics selected, fetch random questions without topic filter
    if (validatedTopics.length === 0) {
      const { data, error } = await supabaseAdmin.rpc("random_questions", {
        n: validatedCount,
        topics: null,
        difficulties: [difficulty],
        mcq_only: false,
        include_attempted: true,
        flashcards_only: false,
        categories: null,
        question_types: questionTypes
      });

      if (error) {
        console.error("Failed to fetch random questions", error);
        return NextResponse.json({
          questions: [],
          meta: {
            requested_count: validatedCount,
            fetched_count: 0,
            distribution: {},
            fallback_used: true
          }
        });
      }

      const questions: InspirationQuestion[] = (data || []).map((q: Record<string, unknown>) => ({
        id: q.id as string,
        question_text: q.question_text as string,
        topic: (q.topic as string) || "General",
        difficulty: (q.difficulty as string) || difficulty,
        question_type: (q.question_type as string) || "Knowledge"
      }));

      return NextResponse.json({
        questions,
        meta: {
          requested_count: validatedCount,
          fetched_count: questions.length,
          distribution: { general: questions.length },
          fallback_used: false
        }
      });
    }

    // Distribute questions across topics
    const distribution = distributeQuestions(validatedCount, validatedTopics.length);
    const allQuestions: InspirationQuestion[] = [];
    const topicDistribution: Record<string, number> = {};
    let fallbackUsed = false;

    // Fetch questions for each topic
    for (let i = 0; i < validatedTopics.length; i++) {
      const topic = validatedTopics[i];
      const countForTopic = distribution[i];

      if (countForTopic === 0) continue;

      const { data, error } = await supabaseAdmin.rpc("random_questions", {
        n: countForTopic,
        topics: [topic],
        difficulties: [difficulty],
        mcq_only: false,
        include_attempted: true,
        flashcards_only: false,
        categories: null,
        question_types: questionTypes
      });

      if (error) {
        console.error(`Failed to fetch questions for topic: ${topic}`, error);
        fallbackUsed = true;
        continue;
      }

      const topicQuestions: InspirationQuestion[] = (data || []).map((q: Record<string, unknown>) => ({
        id: q.id as string,
        question_text: q.question_text as string,
        topic: (q.topic as string) || topic,
        difficulty: (q.difficulty as string) || difficulty,
        question_type: (q.question_type as string) || "Knowledge"
      }));

      allQuestions.push(...topicQuestions);
      topicDistribution[topic] = topicQuestions.length;

      // If we got fewer questions than requested, note it
      if (topicQuestions.length < countForTopic) {
        fallbackUsed = true;
      }
    }

    // If we're short on questions, try to fill from any topic with relaxed difficulty
    if (allQuestions.length < validatedCount && validatedTopics.length > 0) {
      const shortfall = validatedCount - allQuestions.length;

      const { data: extraData } = await supabaseAdmin.rpc("random_questions", {
        n: shortfall,
        topics: validatedTopics,
        difficulties: null, // Any difficulty
        mcq_only: false,
        include_attempted: true,
        flashcards_only: false,
        categories: null,
        question_types: questionTypes
      });

      if (extraData && Array.isArray(extraData)) {
        // Filter out duplicates
        const existingIds = new Set(allQuestions.map((q) => q.id));
        const extraQuestions: InspirationQuestion[] = extraData
          .filter((q: Record<string, unknown>) => !existingIds.has(q.id as string))
          .slice(0, shortfall)
          .map((q: Record<string, unknown>) => ({
            id: q.id as string,
            question_text: q.question_text as string,
            topic: (q.topic as string) || "General",
            difficulty: (q.difficulty as string) || "medium",
            question_type: (q.question_type as string) || "Knowledge"
          }));

        allQuestions.push(...extraQuestions);
        fallbackUsed = true;
      }
    }

    return NextResponse.json({
      questions: allQuestions,
      meta: {
        requested_count: validatedCount,
        fetched_count: allQuestions.length,
        distribution: topicDistribution,
        fallback_used: fallbackUsed
      }
    });
  } catch (error) {
    console.error("Live agent questions error", error);
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
