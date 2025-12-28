export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "Knowledge" | "Scenarios";
export type Category =
  | "General"
  | "Sales Cloud"
  | "Service Cloud"
  | "Agentforce"
  | "CPQ"
  | "Litify"
  | "Omnistudio"
  | "Data Cloud"
  | "Agentforce Concepts"
  | "Agentforce and Service Cloud"
  | "Agentforce and Data Cloud"
  | "Agentforce and Sales Cloud"
  | "Prompt Engineering";

export interface MultipleChoiceQuestion {
  id: string;
  question_id: string;
  choices: string[];
  correct_choice_index: number;
  explanation: string | null;
  shuffle_options: boolean;
  created_at: string;
  updated_at: string;
}

type McqLike = {
  id?: string;
  question_id?: string;
  choices?: unknown;
  correct_choice_index?: unknown;
  explanation?: string | null;
  shuffle_options?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export interface RawQuestion {
  id: string;
  question_number?: number;
  question_text: string;
  answer_text: string | null;
  topic: string; // ENUM in database - values are dynamic
  category: Category | string | null; // ENUM in database
  difficulty: Difficulty;
  question_type?: QuestionType;
  created_at: string;
  multiple_choice_questions?: McqLike | McqLike[] | null;
  mcq?: McqLike | null;
}

export interface Question {
  id: string;
  question_number?: number;
  question_text: string;
  answer_text: string | null;
  topic: string; // ENUM in database - values are dynamic
  category: Category | string | null; // ENUM in database
  difficulty: Difficulty;
  question_type?: QuestionType;
  created_at: string;
  mcq: MultipleChoiceQuestion | null;
}

export interface QuestionAttempt {
  id: string;
  user_id: string;
  question_id: string;
  practice_mode: "mcq" | "flashcards";
  is_correct: boolean | null;
  attempted_at: string;
}

export interface SubscriptionPreferences {
  id: string;
  email: string;
  user_id: string | null;
  topics: string[];
  difficulties: string[];
  question_types: string[];
  practice_modes: string[];
  question_count: number;
  delivery_frequency: "Daily" | "Weekly" | "Bi-weekly";
  include_answers: boolean;
  custom_message: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_sent_at?: string | null;
}

export interface EmailDeliveryLog {
  id: string;
  subscription_id: string;
  email: string;
  questions_sent: unknown[];
  sent_at: string;
  status: 'sent' | 'failed' | 'bounced';
  error_message: string | null;
  created_at: string;
}

export interface UnsubscribeToken {
  id: string;
  subscription_id: string;
  token: string;
  created_at: string;
  used_at: string | null;
  expires_at: string;
}

export interface CodingQuestion {
  id: string;
  title: string;
  description: string;
  problem_statement: string;
  solution_code: string;
  explanation: string | null;
  difficulty: Difficulty;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface LiveAgentSessionMetadata {
  user_id: string;
  role: string;
  interview_type: string;
  level?: string;
  topics?: string[];
  question_count?: number;
}

export interface LiveAgentSessionRequest {
  role?: string;
  interview_type?: string;
  level?: string;
  topics?: string[];
  question_count?: number;
}

export interface LiveAgentSession {
  id: string;
  user_id: string;
  role: string;
  interview_type: string;
  level: string | null;
  model: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LiveAgentMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  source: "text" | "audio" | "transcript";
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface LiveAgentFeedback {
  id: string;
  session_id: string;
  user_id: string;
  question_text: string | null;
  score: number | null;
  rubric: Record<string, unknown>;
  feedback: string;
  created_at: string;
}

export interface InspirationQuestion {
  id: string;
  question_text: string;
  topic: string;
  difficulty: string;
  question_type: string;
}

export interface InspirationQuestionsResponse {
  questions: InspirationQuestion[];
  meta: {
    requested_count: number;
    fetched_count: number;
    distribution: Record<string, number>;
    fallback_used: boolean;
    note?: string;
  };
}

const toChoices = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  return value.map((v) => String(v));
};

const toInt = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
};

const toMcq = (mcq: McqLike | null | undefined, fallbackQuestionId?: string): MultipleChoiceQuestion | null => {
  if (!mcq) return null;
  const choices = toChoices(mcq.choices);
  const correct = toInt(mcq.correct_choice_index);
  const id = mcq.id ?? null;
  const questionId = mcq.question_id ?? fallbackQuestionId ?? null;
  if (!choices || choices.length < 2 || correct == null || correct < 0 || correct >= choices.length) return null;
  if (!id || !questionId) return null;
  const createdAt = mcq.created_at ?? null;
  const updatedAt = mcq.updated_at ?? createdAt;
  return {
    id,
    question_id: questionId,
    choices,
    correct_choice_index: correct,
    explanation: mcq.explanation ?? null,
    shuffle_options: toBoolean(mcq.shuffle_options, false),
    created_at: createdAt ?? "",
    updated_at: updatedAt ?? ""
  };
};

export const normalizeQuestion = (raw: RawQuestion): Question => {
  const relation = raw.multiple_choice_questions;
  let mcqCandidate: McqLike | null = null;
  if (Array.isArray(relation)) {
    mcqCandidate = (relation[0] as McqLike) ?? null;
  } else if (relation) {
    mcqCandidate = relation;
  } else if (raw.mcq) {
    mcqCandidate = raw.mcq;
  }

  const mcq = toMcq(mcqCandidate, raw.id);

  return {
    id: raw.id,
    question_number: raw.question_number,
    question_text: raw.question_text,
    answer_text: raw.answer_text,
    topic: raw.topic,
    category: raw.category ?? null,
    difficulty: raw.difficulty,
    question_type: raw.question_type,
    created_at: raw.created_at,
    mcq
  };
};
