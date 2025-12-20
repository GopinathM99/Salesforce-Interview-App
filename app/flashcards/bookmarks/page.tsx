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

function FlashcardsBookmarksContent() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkSaving, setBookmarkSaving] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const initialSelectedId = searchParams.get("question");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(initialSelectedId);
  const [reveal, setReveal] = useState(false);

  const formatBookmarkError = (message: string) => {
    if (message.includes("question_bookmarks") && message.includes("does not exist")) {
      return "Bookmarks are not set up in Supabase yet. Run supabase/add_question_bookmarks.sql in the Supabase SQL editor.";
    }
    return message;
  };

  const selectedQuestion = useMemo(
    () => questions.find((q) => q.id === selectedQuestionId) ?? null,
    [questions, selectedQuestionId]
  );

  useEffect(() => {
    setReveal(false);
  }, [selectedQuestionId]);

  useEffect(() => {
    if (!userId) {
      setBookmarks([]);
      setQuestions([]);
      setSelectedQuestionId(null);
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
        .eq("practice_mode", "flashcards")
        .order("created_at", { ascending: false });

      if (bookmarkError) {
        setError(formatBookmarkError(bookmarkError.message));
        setBookmarks([]);
        setQuestions([]);
        setSelectedQuestionId(null);
        setLoading(false);
        return;
      }

      const rows = (bookmarkRows as BookmarkRow[]) ?? [];
      setBookmarks(rows);

      const questionIds = rows.map((r) => r.question_id);
      if (questionIds.length === 0) {
        setQuestions([]);
        setSelectedQuestionId(null);
        setLoading(false);
        return;
      }

      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*, multiple_choice_questions(*)")
        .in("id", questionIds);

      if (questionsError) {
        setError(questionsError.message);
        setQuestions([]);
        setSelectedQuestionId(null);
        setLoading(false);
        return;
      }

      const normalizedById = new Map<string, Question>();
      ((questionsData as RawQuestion[]) ?? []).forEach((raw) => {
        normalizedById.set(raw.id, normalizeQuestion(raw));
      });

      const orderedQuestions = questionIds
        .map((id) => normalizedById.get(id))
        .filter((q): q is Question => Boolean(q));
      setQuestions(orderedQuestions);

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
    router.replace(`/flashcards/bookmarks?${next.toString()}`);
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
      .eq("practice_mode", "flashcards");

    if (deleteError) {
      setError(formatBookmarkError(deleteError.message));
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
      router.replace(nextSelectedId ? `/flashcards/bookmarks?${next.toString()}` : "/flashcards/bookmarks");
    }

    setBookmarkSaving(false);
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
              <Link className="btn" href="/flashcards/select">
                Back to Flashcards
              </Link>
              <Link className="btn back-btn" href="/">
                Back to Home
              </Link>
            </div>
          </div>

          {!userId && <p className="muted">Sign in to view and manage your bookmarks.</p>}
          {error && <p className="muted">Error: {error}</p>}
          {loading && <p className="muted">Loading bookmarks...</p>}

          {userId && !loading && questions.length === 0 && (
            <p className="muted">
              No bookmarks yet. Save a flashcard with{" "}
              <Bookmark aria-hidden style={{ width: 14, height: 14, verticalAlign: "-2px" }} />.
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
                </div>
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

              {reveal ? (
                <div style={{ marginTop: 12 }}>
                  <strong style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "16px" }}>Answer:</strong>
                  {selectedQuestion.answer_text ? (
                    <p
                      style={{
                        whiteSpace: "pre-wrap",
                        fontFamily:
                          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif',
                        fontSize: "16px",
                        lineHeight: "1.7",
                        color: "#e2e8f0",
                        marginTop: 8
                      }}
                    >
                      {selectedQuestion.answer_text}
                    </p>
                  ) : (
                    <p className="muted" style={{ marginTop: 8 }}>
                      No answer text available for this question.
                    </p>
                  )}
                </div>
              ) : (
                <p className="muted" style={{ marginTop: 12 }}>
                  Click reveal to see the answer
                </p>
              )}

              <div className="row" style={{ marginTop: 12, gap: 8 }}>
                <button className="btn reveal-btn" onClick={() => setReveal((r) => !r)}>
                  {reveal ? "Hide Answer" : "Reveal Answer"}
                </button>
              </div>
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
                      <span className="muted" style={{ fontSize: 12 }}>
                        {q.difficulty}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      {q.topic}
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

export default function FlashcardsBookmarksPage() {
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
      <FlashcardsBookmarksContent />
    </Suspense>
  );
}
