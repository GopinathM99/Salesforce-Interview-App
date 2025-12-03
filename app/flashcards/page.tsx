"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Difficulty, Question, QuestionType, RawQuestion } from "@/lib/types";
import { normalizeQuestion } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

type Filters = {
  topic: string | null;
  difficulty: Difficulty | null;
  category: string | null;
  questionType: QuestionType | null;
};

const QUESTION_TYPES: QuestionType[] = ["Knowledge", "Scenarios"];

function FlashcardsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("category");
  const userId = user?.id ?? null;
  const [q, setQ] = useState<Question | null>(null);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    topic: null,
    difficulty: null,
    category: categoryFromUrl,
    questionType: null
  });
  const [topics, setTopics] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [savingAttempt, setSavingAttempt] = useState(false);

  const recordAttempt = useCallback(
    async (question: Question | null) => {
      if (!userId || !question) return;
      setSavingAttempt(true);
      setAttemptError(null);
      const { error } = await supabase.from("question_attempts").upsert(
        {
          question_id: question.id,
          user_id: userId,
          is_correct: null,
          attempted_at: new Date().toISOString()
        },
        {
          onConflict: "user_id,question_id"
        }
      );
      if (error) {
        setAttemptError(error.message);
      }
      setSavingAttempt(false);
    },
    [userId]
  );

  const loadRandom = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReveal(false);
    setInfo(null);
    setAttemptError(null);
    
    // Build the RPC payload - always include all parameters in correct order
    const payload = {
      n: 1,
      topics: filters.topic ? [filters.topic] : null,
      difficulties: filters.difficulty ? [filters.difficulty] : null,
      mcq_only: false,
      include_attempted: false,
      flashcards_only: true,
      categories: filters.category ? [filters.category] : null,
      question_types: filters.questionType ? [filters.questionType] : null
    };
    
    const { data, error } = await supabase.rpc("random_questions", payload);
    if (error) {
      setError(error.message);
      setQ(null);
    } else {
      const nextQuestionRaw = (data as RawQuestion[] | null)?.[0] ?? null;
      const normalized = nextQuestionRaw ? normalizeQuestion(nextQuestionRaw) : null;
      setQ(normalized);
      if (!normalized) {
        setInfo(
          userId
            ? "You're all caught up! You've attempted every matching flashcard."
            : "No question found. Add data in Supabase."
        );
      }
    }
    setLoading(false);
  }, [filters, userId]);

  useEffect(() => {
    // Update category filter when URL changes
    const category = searchParams.get("category");
    setFilters((f) => ({ ...f, category }));
  }, [searchParams]);

  useEffect(() => {
    void loadRandom();
  }, [loadRandom]);

  useEffect(() => {
    const loadTopics = async () => {
      let loadedTopics: string[] = [];
      if (filters.category) {
        // Load topics filtered by category
        console.log("Loading topics for category:", filters.category);
        const { data, error } = await supabase.rpc("list_topics_by_category", {
          category_filter: filters.category
        });
        if (error) {
          console.error("Error loading topics by category:", error);
          // Fallback to loading all topics on error
          const { data: allTopicsData } = await supabase.rpc("list_topics");
          loadedTopics = ((allTopicsData as string[]) ?? []).sort();
        } else {
          console.log("Topics loaded:", data);
          loadedTopics = ((data as string[]) ?? []).sort();
        }
      } else {
        // Load all topics when no category is selected
        const { data } = await supabase.rpc("list_topics");
        loadedTopics = ((data as string[]) ?? []).sort();
      }
      setTopics(loadedTopics);
      
      // Reset topic filter if the selected topic is not in the new list
      if (filters.topic && !loadedTopics.includes(filters.topic)) {
        setFilters((f) => ({ ...f, topic: null }));
      }
    };
    void loadTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category]);

  const handleNext = useCallback(async () => {
    await recordAttempt(q);
    void loadRandom();
  }, [loadRandom, q, recordAttempt]);

  const meta = useMemo(() => {
    if (!q) return null;
    return (
      <div className="row" style={{ gap: 8, justifyContent: "space-between", alignItems: "center" }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {q.category && <span className="pill">Category: {q.category}</span>}
          <span className="pill">Topic: {q.topic}</span>
          <span className="pill">Difficulty: {q.difficulty}</span>
          {q.question_type && <span className="pill">Type: {q.question_type}</span>}
        </div>
        {q.question_number && (
          <span className="pill" style={{ fontWeight: 600, color: "#3b82f6", fontSize: "14px" }}>
            # {q.question_number.toString().padStart(5, '0')}
          </span>
        )}
      </div>
    );
  }, [q]);

  return (
    <div className="grid">
      <div className="card">
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}
        >
          <h2 className="title" style={{ marginBottom: 0 }}>Flashcards</h2>
          <Link className="btn back-btn" href="/">
            Back to Home
          </Link>
        </div>
        {!userId && (
          <p className="muted" style={{ marginBottom: 12 }}>
            {"Sign in to save your progress and hide flashcards you've already seen."}
          </p>
        )}
        {filters.category && (
          <div style={{ 
            marginBottom: 16, 
            padding: "12px 16px", 
            backgroundColor: "rgba(59, 130, 246, 0.1)", 
            borderRadius: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 500, color: "#cbd5e1" }}>Category:</span>
              <span style={{ color: "#3b82f6", fontWeight: 600 }}>{filters.category}</span>
            </div>
            <Link 
              href="/flashcards/select" 
              style={{ 
                fontSize: "14px", 
                color: "#3b82f6", 
                textDecoration: "none",
                fontWeight: 500,
                padding: "4px 8px",
                borderRadius: 4,
                transition: "background-color 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.15)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            >
              Change category
            </Link>
          </div>
        )}
        <div className="row" style={{ gap: 16, marginBottom: 8 }}>
          <div className="col">
            <label>Topic</label>
            <select
              value={filters.topic ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, topic: e.target.value || null }))}
            >
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="col">
            <label>Difficulty</label>
            <select
              value={filters.difficulty ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, difficulty: (e.target.value || null) as Difficulty | null }))
              }
            >
              <option value="">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="col">
            <label>Question Type</label>
            <select
              value={filters.questionType ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  questionType: (e.target.value || null) as QuestionType | null
                }))
              }
            >
              <option value="">All</option>
              {QUESTION_TYPES.map((qt) => (
                <option key={qt} value={qt}>
                  {qt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="muted">Error: {error}</p>}
        {attemptError && <p className="muted">Could not save attempt: {attemptError}</p>}
        {info && <p className="muted">{info}</p>}

        {q ? (
          <div className="card" style={{ marginTop: 12 }}>
            {meta}
            <h3 style={{ 
              marginTop: 8, 
              fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
              fontSize: '22px',
              lineHeight: '1.5',
              fontWeight: 400,
              color: '#f1f5f9'
            }}>{q.question_text}</h3>
            {reveal ? (
              <div style={{ marginTop: 12 }}>
                <strong style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '16px' }}>Answer:</strong>
                <p style={{ 
                  whiteSpace: "pre-wrap",
                  fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontSize: '16px',
                  lineHeight: '1.7',
                  color: '#e2e8f0',
                  marginTop: 8
                }}>{q.answer_text}</p>
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
              <button className="btn next-btn" onClick={() => void handleNext()} disabled={loading || savingAttempt}>
                {savingAttempt ? "Saving…" : "Next Random"}
              </button>
            </div>
          </div>
        ) : (
          !error && !info && <p className="muted">No question found. Add data in Supabase.</p>
        )}
      </div>
    </div>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={
      <div className="grid">
        <div className="card">
          <h2 className="title">Flashcards</h2>
          <p className="muted">Loading...</p>
        </div>
      </div>
    }>
      <FlashcardsContent />
    </Suspense>
  );
}
