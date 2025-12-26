"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { WelcomeMessage } from "@/components/WelcomeMessage";
import { CodingSection } from "@/components/CodingSection";
import { Question, RawQuestion, normalizeQuestion } from "@/lib/types";

export default function Page() {
  const { user } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [attemptsToday, setAttemptsToday] = useState<number | null>(null);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Question search state
  const [searchNumber, setSearchNumber] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundQuestion, setFoundQuestion] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [displayMode, setDisplayMode] = useState<"flashcard" | "mcq">("flashcard");
  const [selectedMcqIndex, setSelectedMcqIndex] = useState<number | null>(null);
  const [mcqSubmitted, setMcqSubmitted] = useState(false);

  const DAILY_LIMIT = 3;

  const getTodayRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setAttemptsToday(null);
      setAttemptsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadAttempts = async () => {
      setAttemptsLoading(true);
      const { start, end } = getTodayRange();
      const { count, error } = await supabase
        .from("gemini_usage_logs")
        .select("id", { count: "exact", head: true })
        .gte("used_at", start)
        .lt("used_at", end);
      if (!isMounted) return;
      if (error) {
        console.error("Failed to load Gemini usage", error);
        setAttemptsToday(null);
      } else {
        setAttemptsToday(count ?? 0);
      }
      setAttemptsLoading(false);
    };

    void loadAttempts();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const limitReached = !isAdmin && attemptsToday != null && attemptsToday >= DAILY_LIMIT;


  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setIsAdmin(false);
      setCheckingAdmin(false);
      return () => {
        cancelled = true;
      };
    }

    const checkAdmin = async () => {
      setCheckingAdmin(true);
      const { data, error } = await supabase.rpc("is_admin");
      if (cancelled) return;
      if (error) {
        console.error("Failed to verify admin access", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(Boolean(data));
      }
      setCheckingAdmin(false);
    };

    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const resetProgress = async () => {
    if (!user) {
      setMessage("Sign in to reset your saved progress.");
      return;
    }

    const confirmed = typeof window === "undefined" || window.confirm(
      "Reset progress? This removes your attempt history so all questions reappear."
    );
    if (!confirmed) return;

    setResetting(true);
    setMessage(null);
    const { error } = await supabase
      .from("question_attempts")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      setMessage(`Could not reset progress: ${error.message}`);
    } else {
      setMessage("Progress cleared. You can revisit every question again.");
    }
    setResetting(false);
  };

  const searchByQuestionNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(searchNumber.trim(), 10);
    if (isNaN(num) || num <= 0) {
      setSearchError("Please enter a valid question number.");
      setFoundQuestion(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setFoundQuestion(null);
    setShowAnswer(false);
    setSelectedMcqIndex(null);
    setMcqSubmitted(false);

    const { data, error } = await supabase
      .from("questions")
      .select("*, multiple_choice_questions(*)")
      .eq("question_number", num)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        setSearchError(`No question found with number ${num}.`);
      } else {
        setSearchError(`Error searching: ${error.message}`);
      }
      setFoundQuestion(null);
    } else if (data) {
      setFoundQuestion(normalizeQuestion(data as RawQuestion));
      setSearchError(null);
    }

    setSearchLoading(false);
  };

  return (
    <div className="grid">
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        {user && (
          <div style={{ marginBottom: 12 }}>
            <WelcomeMessage />
          </div>
        )}
        <h2 className="title">Choose a Mode</h2>
        <div className="grid" style={{ marginTop: 12 }}>
          <div className="card">
            <h3>Flash Cards</h3>
            <p>Reveal answers, swipe through, and focus on understanding.</p>
            <Link
              className="btn primary home-btn"
              href="/flashcards/select"
              style={{ marginTop: 12, display: "inline-block" }}
            >
              Start Flashcards
            </Link>
          </div>
          <div className="card">
            <h3>Multiple Choice</h3>
            <p>Pick the right option and get instant feedback.</p>
            <Link
              className="btn primary home-btn"
              href="/mcq/select"
              style={{ marginTop: 12, display: "inline-block" }}
            >
              Start MCQs
            </Link>
          </div>
          <div className="card">
            <h3>Live Agent Prep</h3>
            <p>Practice a mock interview with a live AI interviewer by voice or text.</p>
            {user ? (
              <Link
                className="btn primary home-btn"
                href="/live-agent"
                style={{ marginTop: 12, display: "inline-block" }}
              >
                Open Live Agent
              </Link>
            ) : (
              <>
                <button
                  className="btn"
                  style={{ marginTop: 12, display: "inline-block", cursor: "not-allowed" }}
                  disabled
                  aria-disabled
                >
                  Open Live Agent
                </button>
                <p
                  style={{
                    marginTop: 8,
                    color: "#92400e",
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    fontStyle: "italic",
                    fontWeight: 600,
                    padding: "8px 12px",
                    borderRadius: 12,
                    display: "inline-block"
                  }}
                >
                  Log in to access live mock interviews.
                </p>
              </>
            )}
          </div>
          <div
            className="card"
            style={!user || limitReached ? { opacity: 0.5 } : undefined}
            aria-disabled={!user || limitReached ? true : undefined}
          >
            <h3>Try New Questions</h3>
            <p>Attempt new knowledge, scenario based, or coding questions with Gemini.</p>
            {user ? (
              limitReached ? (
                <>
                  <button
                    className="btn"
                    style={{ marginTop: 12, display: "inline-block", cursor: "not-allowed" }}
                    disabled
                    aria-disabled
                  >
                    Daily Limit Reached
                  </button>
                  <p
                    style={{
                      marginTop: 8,
                      color: "#7f1d1d",
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      fontStyle: "italic",
                      fontWeight: 600,
                      padding: "8px 12px",
                      borderRadius: 12,
                      display: "inline-block"
                    }}
                  >
                    You used all {DAILY_LIMIT} Gemini requests today. Try again tomorrow or switch to Flash Cards or Multiple Choice Questions.
                  </p>
                </>
              ) : (
                <Link
                  className="btn primary home-btn"
                  href="/add-questions"
                  style={{ marginTop: 12, display: "inline-block" }}
                >
                  Live Gemini Chat
                </Link>
              )
            ) : (
              <>
                <button
                  className="btn"
                  style={{ marginTop: 12, display: "inline-block", cursor: "not-allowed" }}
                  disabled
                  aria-disabled
                >
                  Live Gemini Chat
                </button>
                <p
                  style={{
                    marginTop: 8,
                    color: "#92400e",
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    fontStyle: "italic",
                    fontWeight: 600,
                    padding: "8px 12px",
                    borderRadius: 12,
                    display: "inline-block"
                  }}
                >
                  Log in to try this out and brainstorm fresh questions.
                </p>
              </>
            )}
          {user && attemptsLoading && !limitReached && (
            <p className="muted" style={{ marginTop: 8 }}>Checking remaining attempts…</p>
          )}
        </div>
        <CodingSection />
        {user && (
          <div className="card">
            <h3>Subscribe to Daily Challenges</h3>
            <p>
              Get personalized Salesforce interview questions delivered to your inbox. 
              Choose your topics, difficulty levels, and question types to create the perfect study plan.
            </p>
            <Link
              className="btn primary home-btn"
              href="/subscribe"
              style={{ marginTop: 12, display: "inline-block" }}
            >
              Customize Your Subscription
            </Link>
          </div>
        )}
        {user && isAdmin && !checkingAdmin && (
          <div className="card">
            <h3>Admin Panel</h3>
            <p>Manage your Salesforce question bank, categories, and AI quotas.</p>
            <Link
              className="btn primary home-btn"
              href="/admin"
              style={{ marginTop: 12, display: "inline-block" }}
            >
              Open Admin Panel
            </Link>
          </div>
        )}
        {user && (
          <div className="card">
            <h3>Reset Progress</h3>
            <p>Clear your attempt history so every question appears again.</p>
            <button className="btn" onClick={() => void resetProgress()} disabled={resetting}>
              {resetting ? "Resetting…" : "Reset Progress"}
            </button>
            {message && <p className="muted" style={{ marginTop: 8 }}>{message}</p>}
          </div>
        )}

        {/* Search by Question Number Section */}
        <div
          className="card"
          style={{
            gridColumn: "1 / -1",
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)",
            borderColor: "rgba(139, 92, 246, 0.3)"
          }}
        >
          <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🔍</span> Search by Question Number
          </h3>
          <p className="muted" style={{ marginBottom: 12 }}>
            Jump directly to a specific question by entering its number.
          </p>
          <form onSubmit={searchByQuestionNumber} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="number"
              placeholder="Enter question number (e.g., 42)"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              min="1"
              style={{
                flex: "1 1 200px",
                maxWidth: 280
              }}
            />
            <select
              value={displayMode}
              onChange={(e) => {
                setDisplayMode(e.target.value as "flashcard" | "mcq");
                setShowAnswer(false);
                setSelectedMcqIndex(null);
                setMcqSubmitted(false);
              }}
              style={{ minWidth: 140 }}
            >
              <option value="flashcard">📖 Flash Card</option>
              <option value="mcq">✅ MCQ</option>
            </select>
            <button
              type="submit"
              className="btn primary"
              disabled={searchLoading || !searchNumber.trim()}
              style={{ minWidth: 100 }}
            >
              {searchLoading ? "Searching…" : "Search"}
            </button>
          </form>

          {searchError && (
            <p
              style={{
                marginTop: 12,
                color: "#f87171",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "10px 14px",
                borderRadius: 12,
                fontWeight: 500
              }}
            >
              {searchError}
            </p>
          )}

          {foundQuestion && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 12,
                background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                border: "1px solid rgba(59, 130, 246, 0.3)"
              }}
            >
              {/* Mode indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: displayMode === "flashcard" ? "#a78bfa" : "#34d399",
                    background: displayMode === "flashcard" ? "rgba(139, 92, 246, 0.15)" : "rgba(16, 185, 129, 0.15)",
                    padding: "4px 10px",
                    borderRadius: 6
                  }}
                >
                  {displayMode === "flashcard" ? "📖 Flash Card Mode" : "✅ MCQ Mode"}
                </span>
              </div>

              {/* Question metadata pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <span
                  className="pill pill-soft"
                  style={{ background: "rgba(139, 92, 246, 0.2)", borderColor: "rgba(139, 92, 246, 0.4)" }}
                >
                  #{foundQuestion.question_number}
                </span>
                <span className="pill pill-soft">{foundQuestion.topic}</span>
                {foundQuestion.category && (
                  <span className="pill pill-soft">{foundQuestion.category}</span>
                )}
                <span
                  className="pill pill-soft"
                  style={{
                    background:
                      foundQuestion.difficulty === "easy"
                        ? "rgba(16, 185, 129, 0.2)"
                        : foundQuestion.difficulty === "medium"
                        ? "rgba(245, 158, 11, 0.2)"
                        : "rgba(239, 68, 68, 0.2)",
                    borderColor:
                      foundQuestion.difficulty === "easy"
                        ? "rgba(16, 185, 129, 0.4)"
                        : foundQuestion.difficulty === "medium"
                        ? "rgba(245, 158, 11, 0.4)"
                        : "rgba(239, 68, 68, 0.4)"
                  }}
                >
                  {foundQuestion.difficulty}
                </span>
                {foundQuestion.question_type && (
                  <span className="pill pill-soft">{foundQuestion.question_type}</span>
                )}
              </div>

              {/* Question text */}
              <p style={{ marginBottom: 16, lineHeight: 1.6, fontSize: 16 }}>{foundQuestion.question_text}</p>

              {/* Flash Card Mode Display */}
              {displayMode === "flashcard" && (
                <>
                  {foundQuestion.answer_text && (
                    <>
                      <button
                        type="button"
                        className="btn reveal-btn"
                        onClick={() => setShowAnswer(!showAnswer)}
                        style={{ marginBottom: showAnswer ? 12 : 0 }}
                      >
                        {showAnswer ? "Hide Answer" : "Reveal Answer"}
                      </button>
                      {showAnswer && (
                        <div
                          style={{
                            padding: 14,
                            borderRadius: 10,
                            background: "rgba(16, 185, 129, 0.1)",
                            border: "1px solid rgba(16, 185, 129, 0.3)"
                          }}
                        >
                          <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                            {foundQuestion.answer_text}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {!foundQuestion.answer_text && (
                    <p className="muted" style={{ fontStyle: "italic" }}>
                      No answer available for this question.
                    </p>
                  )}
                </>
              )}

              {/* MCQ Mode Display */}
              {displayMode === "mcq" && (
                <>
                  {foundQuestion.mcq ? (
                    <div>
                      <ul className="clean">
                        {foundQuestion.mcq.choices.map((choice, idx) => {
                          const isSelected = selectedMcqIndex === idx;
                          const isCorrect = idx === foundQuestion.mcq?.correct_choice_index;
                          const showResult = mcqSubmitted;

                          let className = "";
                          if (showResult) {
                            if (isCorrect) className = "correct";
                            else if (isSelected && !isCorrect) className = "incorrect";
                          } else if (isSelected) {
                            className = "selected";
                          }

                          return (
                            <li
                              key={idx}
                              className={className}
                              onClick={() => {
                                if (!mcqSubmitted) {
                                  setSelectedMcqIndex(idx);
                                }
                              }}
                              style={{
                                cursor: mcqSubmitted ? "default" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 10
                              }}
                            >
                              <span
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: "50%",
                                  border: "2px solid currentColor",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  flexShrink: 0
                                }}
                              >
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span>{choice}</span>
                              {showResult && isCorrect && (
                                <span style={{ marginLeft: "auto", color: "#10b981" }}>✓ Correct</span>
                              )}
                              {showResult && isSelected && !isCorrect && (
                                <span style={{ marginLeft: "auto", color: "#ef4444" }}>✗ Wrong</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      {!mcqSubmitted && (
                        <button
                          type="button"
                          className="btn primary"
                          onClick={() => setMcqSubmitted(true)}
                          disabled={selectedMcqIndex === null}
                          style={{ marginTop: 12 }}
                        >
                          Submit Answer
                        </button>
                      )}

                      {mcqSubmitted && (
                        <div style={{ marginTop: 12 }}>
                          {selectedMcqIndex === foundQuestion.mcq.correct_choice_index ? (
                            <p
                              style={{
                                color: "#10b981",
                                fontWeight: 600,
                                background: "rgba(16, 185, 129, 0.1)",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                padding: "10px 14px",
                                borderRadius: 10
                              }}
                            >
                              🎉 Correct! Well done!
                            </p>
                          ) : (
                            <p
                              style={{
                                color: "#ef4444",
                                fontWeight: 600,
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                padding: "10px 14px",
                                borderRadius: 10
                              }}
                            >
                              ❌ Incorrect. The correct answer is {String.fromCharCode(65 + foundQuestion.mcq.correct_choice_index)}.
                            </p>
                          )}
                          {foundQuestion.mcq.explanation && (
                            <div
                              style={{
                                marginTop: 12,
                                padding: 14,
                                borderRadius: 10,
                                background: "rgba(59, 130, 246, 0.1)",
                                border: "1px solid rgba(59, 130, 246, 0.3)"
                              }}
                            >
                              <p className="muted" style={{ margin: 0, fontWeight: 500, marginBottom: 4 }}>
                                Explanation:
                              </p>
                              <p style={{ margin: 0, lineHeight: 1.6 }}>
                                {foundQuestion.mcq.explanation}
                              </p>
                            </div>
                          )}
                          <button
                            type="button"
                            className="btn"
                            onClick={() => {
                              setSelectedMcqIndex(null);
                              setMcqSubmitted(false);
                            }}
                            style={{ marginTop: 12 }}
                          >
                            Try Again
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        background: "rgba(245, 158, 11, 0.1)",
                        border: "1px solid rgba(245, 158, 11, 0.3)"
                      }}
                    >
                      <p style={{ margin: 0, color: "#f59e0b" }}>
                        ⚠️ This question doesn&apos;t have multiple choice options. 
                        Switch to Flash Card mode to view the answer.
                      </p>
                    </div>
                  )}
                </>
              )}

              <button
                type="button"
                className="btn"
                onClick={() => {
                  setFoundQuestion(null);
                  setSearchNumber("");
                  setShowAnswer(false);
                  setSelectedMcqIndex(null);
                  setMcqSubmitted(false);
                }}
                style={{ marginTop: 16 }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
