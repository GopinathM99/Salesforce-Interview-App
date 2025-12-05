"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Difficulty, Question, QuestionType, RawQuestion } from "@/lib/types";
import { normalizeQuestion } from "@/lib/types";

type Props = {
  initial?: Partial<Question>;
  topics?: string[];
  categories?: string[];
  onSaved?: (q: Question) => void;
  onCancel?: () => void;
  onAskAI?: () => void;
  askAIActive?: boolean;
};

export default function QuestionForm({ initial, topics = [], categories = [], onSaved, onCancel, onAskAI, askAIActive }: Props) {
  const [questionText, setQuestionText] = useState(initial?.question_text ?? "");
  const [answerText, setAnswerText] = useState(initial?.answer_text ?? "");
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>((initial?.difficulty as Difficulty) ?? "easy");
  const [questionType, setQuestionType] = useState<QuestionType>((initial?.question_type as QuestionType) ?? "Knowledge");
  const [isMcq, setIsMcq] = useState<boolean>(Boolean(initial?.mcq));
  const initialChoices = initial?.mcq ? [...initial.mcq.choices] : ["", ""];
  const [choices, setChoices] = useState<string[]>(initialChoices);
  const [correctIdx, setCorrectIdx] = useState<string>(initial?.mcq ? String(initial.mcq.correct_choice_index) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isMcq) {
      setCorrectIdx("");
    } else if (choices.length < 2) {
      setChoices(["", ""]);
    }
  }, [isMcq, choices.length]);

  const canSave = useMemo(() => {
    if (!questionText.trim() || !topic.trim()) return false;
    if (isMcq) {
      const clean = choices.map((c) => c.trim()).filter(Boolean);
      const idx = Number.isInteger(Number(correctIdx)) ? Number(correctIdx) : NaN;
      return clean.length >= 2 && idx >= 0 && idx < clean.length;
    }
    return true;
  }, [questionText, topic, isMcq, choices, correctIdx]);

  const onSubmit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const cleanQuestion = {
        question_text: questionText.trim(),
        answer_text: answerText.trim() || null,
        topic: topic.trim(),
        category: category.trim() || null,
        difficulty,
        question_type: questionType
      };

      let questionId = initial?.id ?? null;

      if (questionId) {
        const { error } = await supabase
          .from("questions")
          .update(cleanQuestion)
          .eq("id", questionId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("questions")
          .insert(cleanQuestion)
          .select("id")
          .single();
        if (error) throw error;
        questionId = data?.id ?? null;
      }

      if (!questionId) throw new Error("Question ID missing after save");

      if (isMcq) {
        const cleanChoices = choices.map((c) => c.trim()).filter(Boolean);
        const correctIndex = Number(correctIdx);
        const mcqPayload = {
          question_id: questionId,
          choices: cleanChoices,
          correct_choice_index: correctIndex,
          explanation: answerText.trim() || null,
          shuffle_options: initial?.mcq?.shuffle_options ?? false
        };
        const { error: mcqError } = await supabase
          .from("multiple_choice_questions")
          .upsert(mcqPayload, { onConflict: "question_id" });
        if (mcqError) throw mcqError;
      } else if (initial?.mcq) {
        const { error: deleteError } = await supabase
          .from("multiple_choice_questions")
          .delete()
          .eq("question_id", questionId);
        if (deleteError) throw deleteError;
      }

      const { data: refreshed, error: refreshError } = await supabase
        .from("questions")
        .select("*, multiple_choice_questions(*)")
        .eq("id", questionId)
        .single();
      if (refreshError) throw refreshError;
      onSaved?.(normalizeQuestion(refreshed as RawQuestion));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const addChoice = () => setChoices((arr) => [...arr, ""]);
  const removeChoice = (i: number) => setChoices((arr) => arr.filter((_, idx) => idx !== i));

  return (
    <div className="card">
      <h3 className="title">{initial?.id ? "Edit Question" : "Create Question"}</h3>
      {error && <p className="muted">Error: {error}</p>}
      <div className="col" style={{ gap: 12 }}>
        <div className="col">
          <label>Topic</label>
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">Select a topic</option>
            {topics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="col">
          <label>Difficulty</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="col">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="col">
          <label>Question Type</label>
          <select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)}>
            <option value="Knowledge">Knowledge</option>
            <option value="Scenarios">Scenarios</option>
          </select>
        </div>
        <div className="col">
          <label>Question</label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={4}
            placeholder="Enter the interview question"
            style={{ width: "100%" }}
          />
        </div>
        <div className="col">
          <label>Answer / Explanation</label>
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            rows={4}
            placeholder="Enter the ideal answer or explanation"
            style={{ width: "100%" }}
          />
        </div>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <input id="is-mcq" type="checkbox" checked={isMcq} onChange={(e) => setIsMcq(e.target.checked)} />
          <label htmlFor="is-mcq">Is Multiple Choice</label>
        </div>

        {isMcq && (
          <div className="col" style={{ gap: 8 }}>
            <label>Choices</label>
            {choices.map((c, idx) => (
              <div className="row" key={idx} style={{ gap: 8 }}>
                <input
                  value={c}
                  onChange={(e) => setChoices((arr) => arr.map((v, i) => (i === idx ? e.target.value : v)))}
                  placeholder={`Choice ${idx + 1}`}
                  style={{ flex: 1 }}
                />
                <button className="btn danger" onClick={() => removeChoice(idx)} disabled={choices.length <= 2}>
                  Remove
                </button>
              </div>
            ))}
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" onClick={addChoice}>Add Choice</button>
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <label>Correct Index</label>
                <input
                  type="number"
                  min={0}
                  max={Math.max(choices.length - 1, 0)}
                  value={correctIdx}
                  onChange={(e) => setCorrectIdx(e.target.value)}
                  style={{ width: 80 }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="row" style={{ gap: 8, justifyContent: "space-between" }}>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary" onClick={onSubmit} disabled={saving || !canSave}>
              {saving ? "Saving…" : initial?.id ? "Save Changes" : "Create Question"}
            </button>
            {onCancel && (
              <button className="btn" onClick={onCancel} disabled={saving}>
                Cancel
              </button>
            )}
          </div>
          {onAskAI && (
            <button
              className="btn"
              onClick={onAskAI}
              style={{
                background: askAIActive
                  ? "linear-gradient(135deg, #1e293b 0%, #334155 100%)"
                  : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                borderColor: askAIActive ? "rgba(59, 130, 246, 0.3)" : "#10b981",
                boxShadow: askAIActive
                  ? "0 2px 4px rgba(0, 0, 0, 0.1)"
                  : "0 4px 12px rgba(16, 185, 129, 0.3)"
              }}
            >
              {askAIActive ? "Close AI" : "Ask AI"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
