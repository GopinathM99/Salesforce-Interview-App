export type Difficulty = "easy" | "medium" | "hard";

export interface Question {
  id: string;
  question_text: string;
  answer_text: string | null;
  choices: string[] | null; // stored as JSON[] in Postgres
  correct_choice_index: number | null;
  topic: string;
  difficulty: Difficulty;
  created_at: string;
}

export interface QuestionAttempt {
  id: string;
  user_id: string;
  question_id: string;
  is_correct: boolean | null;
  attempted_at: string;
}
