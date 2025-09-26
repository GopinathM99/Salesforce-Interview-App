export type Difficulty = "easy" | "medium" | "hard";

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
  question_text: string;
  answer_text: string | null;
  topic: string;
  difficulty: Difficulty;
  created_at: string;
  multiple_choice_questions?: McqLike | McqLike[] | null;
  mcq?: McqLike | null;
}

export interface Question {
  id: string;
  question_text: string;
  answer_text: string | null;
  topic: string;
  difficulty: Difficulty;
  created_at: string;
  mcq: MultipleChoiceQuestion | null;
}

export interface QuestionAttempt {
  id: string;
  user_id: string;
  question_id: string;
  is_correct: boolean | null;
  attempted_at: string;
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
    question_text: raw.question_text,
    answer_text: raw.answer_text,
    topic: raw.topic,
    difficulty: raw.difficulty,
    created_at: raw.created_at,
    mcq
  };
};
