"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, BookmarkX } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Question, RawQuestion } from "@/lib/types";
import { normalizeQuestion } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

type BookmarkRow = {
  question_id: string;
  created_at: string;
};

type AttemptRow = {
  question_id: string;
  is_correct: boolean | null;
  attempted_at: string;
};

function McqBookmarksContent() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptsByQuestionId, setAttemptsByQuestionId] = useState<Record<string, AttemptRow>>({});

  const initialSelectedId = searchParams.get("question");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(initialSelectedId);

  const selectedQuestion = useMemo(
    () => questions.find((q) => q.id === selectedQuestionId) ?? null,
    [questions, selectedQuestionId]
  );

  const selectedAttempt = selectedQuestionId ? attemptsByQuestionId[selectedQuestionId] ?? null : null;

  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [selectionWarning, setSelectionWarning] = useState<string | null>(null);
  const [bookmarkSaving, setBookmarkSaving] = useState(false);

  const formatBookmarkError = (message: string) => {
    if (message.includes("question_bookmarks") && message.includes("does not exist")) {
      return "Bookmarks are not set up in Supabase yet. Run supabase/add_question_bookmarks.sql in the Supabase SQL editor.";
    }
    return message;
  };

  useEffect(() => {
    setSelectedChoice(null);
    setStatus("idle");
    setAttemptError(null);
    setSelectionWarning(null);
  }, [selectedQuestionId]);

  useEffect(() => {
    if (!userId) {
      setBookmarks([]);
      setQuestions([]);
      setAttemptsByQuestionId({});
      setError(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: bookmarkRows, error: bookmarkError } = await supabase
        .from("question_bookmarks")
        .select("question_id, created_at")
        .eq("practice_mode", "mcq")
        .order("created_at", { ascending: false });

      if (bookmarkError) {
        setError(formatBookmarkError(bookmarkError.message));
        setBookmarks([]);
        setQuestions([]);
        setAttemptsByQuestionId({});
        setLoading(false);
        return;
      }

      const rows = (bookmarkRows as BookmarkRow[]) ?? [];
      setBookmarks(rows);

      const questionIds = rows.map((r) => r.question_id);
      if (questionIds.length === 0) {
        setQuestions([]);
        setAttemptsByQuestionId({});
        setSelectedQuestionId(null);
        setLoading(false);
        return;
      }

      const [{ data: questionsData, error: questionsError }, { data: attemptsData, error: attemptsError }] =
        await Promise.all([
          supabase
            .from("questions")
            .select("*, multiple_choice_questions(*)")
            .in("id", questionIds),
          supabase
            .from("question_attempts")
            .select("question_id, is_correct, attempted_at")
            .in("question_id", questionIds)
            .eq("practice_mode", "mcq")
        ]);

      if (questionsError) {
        setError(questionsError.message);
        setQuestions([]);
        setAttemptsByQuestionId({});
        setLoading(false);
        return;
      }

      if (attemptsError) {
        setError(attemptsError.message);
        setAttemptsByQuestionId({});
      }

      const normalizedById = new Map<string, Question>();
      ((questionsData as RawQuestion[]) ?? []).forEach((raw) => {
        normalizedById.set(raw.id, normalizeQuestion(raw));
      });

      const orderedQuestions = questionIds
        .map((id) => normalizedById.get(id))
        .filter((q): q is Question => Boolean(q));
      setQuestions(orderedQuestions);

      const attemptMap: Record<string, AttemptRow> = {};
      ((attemptsData as AttemptRow[]) ?? []).forEach((a) => {
        attemptMap[a.question_id] = a;
      });
      setAttemptsByQuestionId(attemptMap);

      const stillValidSelected =
        selectedQuestionId && orderedQuestions.some((q) => q.id === selectedQuestionId);
      const nextSelected =
        (stillValidSelected ? selectedQuestionId : null) ??
        (initialSelectedId && orderedQuestions.some((q) => q.id === initialSelectedId) ? initialSelectedId : null) ??
        orderedQuestions[0]?.id ??
        null;
      setSelectedQuestionId(nextSelected);

      setLoading(false);
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const setSelected = (id: string) => {
    setSelectedQuestionId(id);
    const next = new URLSearchParams(searchParams.toString());
    next.set("question", id);
    router.replace(`/mcq/bookmarks?${next.toString()}`);
  };

  const removeBookmark = async (questionId: string) => {
    if (!userId) return;
    setBookmarkSaving(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from("question_bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("question_id", questionId)
      .eq("practice_mode", "mcq");

    if (deleteError) {
      setError(deleteError.message);
      setBookmarkSaving(false);
      return;
    }

    const nextBookmarks = bookmarks.filter((b) => b.question_id !== questionId);
    setBookmarks(nextBookmarks);
    const nextQuestions = questions.filter((q) => q.id !== questionId);
    setQuestions(nextQuestions);

    if (selectedQuestionId === questionId) {
      const nextSelectedId = nextQuestions[0]?.id ?? null;
      setSelectedQuestionId(nextSelectedId);
      const next = new URLSearchParams(searchParams.toString());
      if (nextSelectedId) next.set("question", nextSelectedId);
      else next.delete("question");
      router.replace(nextSelectedId ? `/mcq/bookmarks?${next.toString()}` : "/mcq/bookmarks");
    }

    setBookmarkSaving(false);
  };

  const submitAttempt = async () => {
    if (!userId || !selectedQuestion?.mcq) return;
    if (status !== "idle") return;
    if (selectedChoice == null) {
      setSelectionWarning("Please pick a choice before submitting.");
      return;
    }

    setSelectionWarning(null);
    const isCorrect = selectedChoice === selectedQuestion.mcq.correct_choice_index;
    setStatus(isCorrect ? "correct" : "incorrect");

    setSavingAttempt(true);
    setAttemptError(null);

    const now = new Date().toISOString();
    const { error: upsertError } = await supabase.from("question_attempts").upsert(
      {
        question_id: selectedQuestion.id,
        user_id: userId,
        practice_mode: "mcq",
        is_correct: isCorrect,
        attempted_at: now
      },
      { onConflict: "user_id,question_id,practice_mode" }
    );

    if (upsertError) {
      setAttemptError(upsertError.message);
      setSavingAttempt(false);
      return;
    }

    setAttemptsByQuestionId((prev) => ({
      ...prev,
      [selectedQuestion.id]: { question_id: selectedQuestion.id, is_correct: isCorrect, attempted_at: now }
    }));
    setSavingAttempt(false);
  };

  const choiceClass = (idx: number) => {
    if (status === "idle") return selectedChoice === idx ? "selected" : "";
    if (selectedQuestion?.mcq?.correct_choice_index === idx) return "correct";
    if (selectedChoice === idx && selectedQuestion?.mcq?.correct_choice_index !== idx) return "incorrect";
    return "";
  };

  return (
    <div className="mcq-layout">
      <div className="grid mcq-main">
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 className="title" style={{ marginBottom: 0 }}>
              My Bookmarks
            </h2>
            <div className="row" style={{ gap: 8 }}>
              <Link className="btn" href="/mcq/select">
                Back to MCQs
              </Link>
              <Link className="btn back-btn" href="/">
                Back to Home
              </Link>
            </div>
          </div>

          {!userId && (
            <p className="muted">
              Sign in to view and manage your bookmarks.
            </p>
          )}

          {error && <p className="muted">Error: {error}</p>}
          {loading && <p className="muted">Loading bookmarks...</p>}

          {userId && !loading && questions.length === 0 && (
            <p className="muted">
              No bookmarks yet. Go to MCQs and tap <Bookmark aria-hidden style={{ width: 14, height: 14, verticalAlign: "-2px" }} /> to save a question.
            </p>
          )}

          {userId && selectedQuestion && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="row" style={{ gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {selectedQuestion.category && <span className="pill">Category: {selectedQuestion.category}</span>}
                  <span className="pill">Topic: {selectedQuestion.topic}</span>
                  <span className="pill">Difficulty: {selectedQuestion.difficulty}</span>
                  {selectedQuestion.question_type && <span className="pill">Type: {selectedQuestion.question_type}</span>}
                  {selectedAttempt && (
                    <span
                      className="pill"
                      style={{
                        borderColor: "rgba(59, 130, 246, 0.3)",
                        backgroundColor: "rgba(59, 130, 246, 0.08)"
                      }}
                    >
                      Attempted:{" "}
                      {selectedAttempt.is_correct == null ? (
                        <span style={{ color: "#e2e8f0", fontWeight: 600 }}>Recorded</span>
                      ) : (
                        <span style={{ color: selectedAttempt.is_correct ? "#4ade80" : "#f87171", fontWeight: 600 }}>
                          {selectedAttempt.is_correct ? "Correct" : "Incorrect"}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button
                    type="button"
                    className="btn danger"
                    disabled={bookmarkSaving}
                    onClick={() => void removeBookmark(selectedQuestion.id)}
                    style={{ padding: "10px 14px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    <BookmarkX aria-hidden style={{ width: 16, height: 16 }} />
                    Remove
                  </button>
                </div>
              </div>

              <h3
                style={{
                  marginTop: 12,
                  fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
                  fontSize: "22px",
                  lineHeight: "1.5",
                  fontWeight: 400,
                  color: "#f1f5f9"
                }}
              >
                {selectedQuestion.question_text}
              </h3>

              {!selectedQuestion.mcq ? (
                <p className="muted" style={{ marginTop: 12 }}>
                  This question does not have MCQ choices.
                </p>
              ) : (
                <>
                  <ul className="clean" style={{ marginTop: 12 }}>
                    {selectedQuestion.mcq.choices.map((c, idx) => (
                      <li
                        key={idx}
                        className={choiceClass(idx)}
                        onClick={() => {
                          if (status === "idle") {
                            setSelectedChoice(idx);
                            setSelectionWarning(null);
                          }
                        }}
                        style={{
                          cursor: status === "idle" ? "pointer" : "default",
                          fontFamily:
                            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif',
                          fontSize: "15px",
                          lineHeight: "1.6"
                        }}
                      >
                        {c}
                      </li>
                    ))}
                  </ul>

                  {selectionWarning && (
                    <p className="muted" style={{ color: "#f87171", marginTop: 12, marginBottom: 0 }}>
                      {selectionWarning}
                    </p>
                  )}
                  {attemptError && <p className="muted">Could not save attempt: {attemptError}</p>}

                  <div className="row" style={{ gap: 8, marginTop: 12, justifyContent: "space-between" }}>
                    <button
                      className="btn primary"
                      disabled={status !== "idle" || savingAttempt}
                      onClick={() => void submitAttempt()}
                    >
                      {savingAttempt ? "Saving..." : "Submit"}
                    </button>
                    <button
                      className="btn"
                      disabled={status === "idle"}
                      onClick={() => {
                        setSelectedChoice(null);
                        setStatus("idle");
                        setAttemptError(null);
                        setSelectionWarning(null);
                      }}
                    >
                      Try again
                    </button>
                  </div>

                  {status !== "idle" && selectedQuestion.mcq.explanation && (
                    <div style={{ marginTop: 12 }}>
                      <p className="muted" style={{ marginBottom: 6 }}>
                        Explanation
                      </p>
                      <div className="markdown" style={{ color: "#e2e8f0" }}>
                        {selectedQuestion.mcq.explanation}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {userId && (
        <div className="card mcq-history">
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: "16px" }}>
            Bookmarked Questions{" "}
            <span className="muted" style={{ fontSize: "12px" }}>
              ({bookmarks.length})
            </span>
          </h3>
          {questions.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Nothing here yet.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {questions.map((q) => {
                const isSelected = q.id === selectedQuestionId;
                const attempted = attemptsByQuestionId[q.id] ?? null;
                return (
                  <button
                    key={q.id}
                    type="button"
                    className="btn"
                    onClick={() => setSelected(q.id)}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 12,
                      borderColor: isSelected ? "rgba(59, 130, 246, 0.7)" : undefined,
                      boxShadow: isSelected ? "0 0 0 1px rgba(59, 130, 246, 0.25)" : undefined
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                      <div style={{ fontWeight: 600, color: "#e2e8f0" }}>
                        {q.question_number ? `#${q.question_number.toString().padStart(5, "0")}` : "Question"}
                      </div>
                      {attempted && (
                        attempted.is_correct == null ? (
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>Recorded</span>
                        ) : (
                          <span style={{ fontSize: 12, color: attempted.is_correct ? "#4ade80" : "#f87171" }}>
                            {attempted.is_correct ? "Correct" : "Incorrect"}
                          </span>
                        )
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      {q.topic} • {q.difficulty}
                      {q.category ? ` • ${q.category}` : ""}
                    </div>
                    <div style={{ marginTop: 6, color: "#cbd5e1", fontSize: 13, lineHeight: 1.4 }}>
                      {q.question_text.length > 110 ? `${q.question_text.slice(0, 110)}…` : q.question_text}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function McqBookmarksPage() {
  return (
    <Suspense
      fallback={
        <div className="grid">
          <div className="card">
            <h2 className="title">My Bookmarks</h2>
            <p className="muted">Loading...</p>
          </div>
        </div>
      }
    >
      <McqBookmarksContent />
    </Suspense>
  );
}
