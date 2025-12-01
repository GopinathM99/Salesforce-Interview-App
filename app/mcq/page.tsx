"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabaseClient";
import type { Difficulty, Question, RawQuestion } from "@/lib/types";
import { normalizeQuestion } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

type Filters = {
  topic: string | null;
  difficulty: Difficulty | null;
  category: string | null;
};

function McqContent() {
  const { user, session } = useAuth();
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("category");
  const userId = user?.id ?? null;
  const [q, setQ] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ 
    topic: null, 
    difficulty: null,
    category: categoryFromUrl
  });
  const [topics, setTopics] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [selectionWarning, setSelectionWarning] = useState<string | null>(null);
  const [showAskAI, setShowAskAI] = useState(false);
  const [userQuestion, setUserQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [askingAI, setAskingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [sentPrompt, setSentPrompt] = useState<string>("");
  const [showPrompt, setShowPrompt] = useState(false);

  const loadRandom = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    setSelected(null);
    setStatus("idle");
    setAttemptError(null);
    setSelectionWarning(null);
    setShowAskAI(false);
    setUserQuestion("");
    setAiResponse("");
    setAiError(null);
    setSentPrompt("");
    setShowPrompt(false);
    
    // Build the RPC payload - always include all parameters in correct order
    const payload = {
      n: 1,
      topics: filters.topic ? [filters.topic] : null,
      difficulties: filters.difficulty ? [filters.difficulty] : null,
      mcq_only: true,
      include_attempted: false,
      flashcards_only: false,
      categories: filters.category ? [filters.category] : null
    };
    
    const { data, error } = await supabase.rpc("random_questions", payload);
    if (error) {
      setError(error.message);
      setQ(null);
    } else {
      const itemRaw = (data as RawQuestion[] | null)?.[0] ?? null;
      const normalized = itemRaw ? normalizeQuestion(itemRaw) : null;
      if (!normalized) {
        setInfo(
          userId
            ? "You're all caught up! You've attempted every matching question."
            : "No MCQ found. Add choices in Supabase."
        );
        setQ(null);
      } else if (!normalized.mcq) {
        setInfo("Question is missing MCQ choices. Update it in the admin panel.");
        setQ(null);
      } else {
        setQ(normalized);
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

  const submit = async () => {
    if (status !== "idle" || q == null || !q.mcq) return;
    if (selected == null) {
      setSelectionWarning("Please pick a choice before submitting.");
      return;
    }
    setSelectionWarning(null);
    const isCorrect = selected === q.mcq.correct_choice_index;
    setStatus(isCorrect ? "correct" : "incorrect");

    if (!userId) return;

    setSavingAttempt(true);
    setAttemptError(null);
    const { error } = await supabase.from("question_attempts").upsert(
      {
        question_id: q.id,
        user_id: userId,
        is_correct: isCorrect,
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
  };

  const askAI = async () => {
    try {
      if (!q || !q.mcq || !userQuestion.trim()) {
        setAiError("Please enter a question.");
        return;
      }

      if (!session || !session.access_token) {
        setAiError("Please sign in to use the Ask AI feature.");
        return;
      }

      setAskingAI(true);
      setAiError(null);
      setAiResponse("");
      setSentPrompt("");
      setShowPrompt(false);

      // Wrap everything in try-catch to prevent page crashes
      try {
        // Build context message with question details combined with user's question
        const fullMessage = `Salesforce${q.category ? ` - ${q.category}` : ''} MCQ question and answer with a follow up user question:

Question: ${q.question_text}

Choices:
${q.mcq.choices.map((choice, idx) => `${idx + 1}. ${choice}`).join('\n')}

Correct Answer: ${q.mcq.choices[q.mcq.correct_choice_index]}

${q.mcq.explanation ? `Explanation: ${q.mcq.explanation}` : ''}

User's question related to above Salesforce${q.category ? ` - ${q.category}` : ''} MCQ question: ${userQuestion}

Please answer the user's question clearly and concisely, ideally within one or two paragraphs.`;

        // Save the prompt to display to the user
        setSentPrompt(fullMessage);

        const response = await fetch("/api/gemini", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            messages: [
              { role: "user", content: fullMessage }
            ],
            model: "flash"
          })
        }).catch(() => {
          throw new Error("Network error. Please check your connection and try again.");
        });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage = "Something went wrong. Please try again.";

        try {
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          }
        } catch {
          // If we can't parse the error, use a generic message
        }

        // Simplify common error messages for users
        if (response.status === 401) {
          errorMessage = "Please sign in again to continue.";
        } else if (response.status === 429) {
          errorMessage = "Daily limit reached. Please try again tomorrow.";
        } else if (response.status >= 500) {
          errorMessage = "Server error. Please try again in a moment.";
        }

        setAiError(errorMessage);
        setAskingAI(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setAiError("Unable to receive response. Please try again.");
        setAskingAI(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setAiError(parsed.error);
                setAskingAI(false);
                return;
              }
              if (parsed.text) {
                setAiResponse((prev) => prev + parsed.text);
              }
            } catch {
              // Skip invalid JSON chunks
            }
          }
        }
        } catch {
          setAiError("Connection interrupted. Please try again.");
          setAskingAI(false);
          return;
        }
      } catch (innerError) {
        console.error("Ask AI inner error:", innerError);
        const errorMsg = innerError instanceof Error ? innerError.message : "Something went wrong. Please try again.";
        setAiError(errorMsg);
        setAskingAI(false);
      }
    } catch (error) {
      // Outer catch to prevent any uncaught errors from breaking the page
      console.error("Ask AI outer error:", error);
      setAiError("An unexpected error occurred. Please try again.");
      setAskingAI(false);
    } finally {
      setAskingAI(false);
    }
  };

  const choiceClass = (idx: number) => {
    if (status === "idle") return selected === idx ? "selected" : "";
    if (q?.mcq?.correct_choice_index === idx) return "correct";
    if (selected === idx && q?.mcq?.correct_choice_index !== idx) return "incorrect";
    return "";
  };

  return (
    <div className="grid">
      <div className="card">
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}
        >
          <h2 className="title" style={{ marginBottom: 0 }}>Multiple Choice Questions</h2>
          <Link className="btn back-btn" href="/">
            Back to Home
          </Link>
        </div>
        {!userId && (
          <p className="muted" style={{ marginBottom: 12 }}>
            {"Sign in to save your progress and hide questions you've already attempted."}
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
              href="/mcq/select" 
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
            <select value={filters.topic ?? ""} onChange={(e) => setFilters((f) => ({ ...f, topic: e.target.value || null }))}>
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="col">
            <label>Difficulty</label>
            <select value={filters.difficulty ?? ""} onChange={(e) => setFilters((f) => ({ ...f, difficulty: (e.target.value || null) as Difficulty | null }))}>
              <option value="">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {error && <p className="muted">Error: {error}</p>}
        {attemptError && <p className="muted">Could not save attempt: {attemptError}</p>}
        {info && <p className="muted">{info}</p>}

        {q && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="row" style={{ gap: 8, justifyContent: "space-between", alignItems: "center" }}>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                {q.category && <span className="pill">Category: {q.category}</span>}
                <span className="pill">Topic: {q.topic}</span>
                <span className="pill">Difficulty: {q.difficulty}</span>
              </div>
              {q.question_number && (
                <span className="pill" style={{ fontWeight: 600, color: "#3b82f6", fontSize: "16px" }}>
                  # {q.question_number.toString().padStart(5, '0')}
                </span>
              )}
            </div>
            <h3 style={{ 
              marginTop: 8, 
              fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
              fontSize: '22px',
              lineHeight: '1.5',
              fontWeight: 400,
              color: '#f1f5f9'
            }}>{q.question_text}</h3>
            <ul className="clean" style={{ marginTop: 12 }}>
              {(q.mcq?.choices ?? []).map((c, idx) => (
                <li
                  key={idx}
                  className={choiceClass(idx)}
                  onClick={() => {
                    if (status === "idle") {
                      setSelected(idx);
                      setSelectionWarning(null);
                    }
                  }}
                  style={{ 
                    cursor: status === "idle" ? "pointer" : "default",
                    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif',
                    fontSize: '15px',
                    lineHeight: '1.6'
                  }}
                >
                  {c}
                </li>
              ))}
            </ul>
            {selectionWarning && (
              <p className="muted" style={{ color: "#f87171", marginTop: 12, marginBottom: 16 }}>
                {selectionWarning}
              </p>
            )}
            <div className="row" style={{ gap: 8, marginTop: 12, justifyContent: "space-between" }}>
              <div className="row" style={{ gap: 8 }}>
                <button
                  className="btn primary"
                  disabled={status !== "idle" || savingAttempt}
                  onClick={() => void submit()}
                >
                  {savingAttempt ? "Saving…" : "Submit"}
                </button>
                <button className="btn" onClick={() => void loadRandom()} disabled={loading}>
                  {loading ? "Loading…" : "Next Random"}
                </button>
              </div>
              {q.mcq && !showAskAI && (
                <button
                  className="btn"
                  onClick={() => setShowAskAI(true)}
                  style={{
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none"
                  }}
                >
                  Ask AI
                </button>
              )}
            </div>
            {status !== "idle" && (
              <div style={{ marginTop: 12 }}>
                {status === "correct" ? (
                  <span className="pill" style={{ borderColor: "#1b7a42" }}>Correct</span>
                ) : (
                  <>
                    <span className="pill" style={{ borderColor: "#7a1b1b" }}>Incorrect</span>
                    {(q.mcq?.explanation ?? q.answer_text) && (
                      <p style={{
                        marginTop: 10,
                        whiteSpace: "pre-wrap",
                        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif',
                        fontSize: '16px',
                        lineHeight: '1.7',
                        color: '#e2e8f0'
                      }}>
                        <strong style={{ color: '#f1f5f9', fontWeight: 600 }}>Explanation: </strong>{q.mcq?.explanation ?? q.answer_text}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Ask AI Expanded Section */}
            {q.mcq && showAskAI && (
              <div style={{ marginTop: 16, borderTop: "1px solid #334155", paddingTop: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
                  <button
                    className="btn"
                    onClick={() => {
                      setShowAskAI(false);
                      setUserQuestion("");
                      setAiResponse("");
                      setAiError(null);
                      setSentPrompt("");
                      setShowPrompt(false);
                    }}
                    style={{
                      fontSize: "14px",
                      padding: "4px 12px",
                      minHeight: "unset"
                    }}
                  >
                    Close
                  </button>
                  <span style={{ color: "#94a3b8", fontSize: "14px", paddingTop: 6 }}>
                    Ask a follow-up question about this MCQ
                  </span>
                </div>

                {!session ? (
                  <p className="muted" style={{ fontSize: "14px" }}>
                    Please sign in to use the Ask AI feature.
                  </p>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <textarea
                        value={userQuestion}
                        onChange={(e) => setUserQuestion(e.target.value)}
                        placeholder="e.g., Can you explain this concept in more detail?"
                        style={{
                          flex: 1,
                          minHeight: "80px",
                          padding: "8px 12px",
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "6px",
                          color: "#f1f5f9",
                          fontSize: "14px",
                          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif',
                          resize: "vertical"
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.ctrlKey && userQuestion.trim() && !askingAI) {
                            void askAI();
                          }
                        }}
                      />
                      <button
                        className="btn primary"
                        onClick={() => void askAI()}
                        disabled={!userQuestion.trim() || askingAI}
                        style={{ minWidth: "80px" }}
                      >
                        {askingAI ? "Asking..." : "Send"}
                      </button>
                    </div>
                    <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0, flex: 1 }}>
                        AI Model: <span style={{ color: "#10b981", fontWeight: 500 }}>Gemini 2.5 Flash</span>
                      </p>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0, textAlign: "center" }}>
                        Press Ctrl+Enter to send
                      </p>
                      <div style={{ flex: 1 }} />
                    </div>

                    {aiError && (
                      <div style={{
                        marginTop: 12,
                        padding: "12px 16px",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        borderRadius: "6px",
                        border: "1px solid rgba(239, 68, 68, 0.3)"
                      }}>
                        <p style={{ color: "#fca5a5", margin: 0, fontSize: "14px" }}>
                          {aiError}
                        </p>
                      </div>
                    )}

                    {sentPrompt && (
                      <>
                        <button
                          className="btn"
                          onClick={() => setShowPrompt(!showPrompt)}
                          style={{
                            marginTop: 12,
                            fontSize: "13px",
                            padding: "6px 12px",
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            color: "#60a5fa"
                          }}
                        >
                          {showPrompt ? "Hide AI Request" : "Show AI Request"}
                        </button>

                        {showPrompt && (
                          <div style={{
                            marginTop: 8,
                            padding: "12px 16px",
                            backgroundColor: "rgba(59, 130, 246, 0.05)",
                            borderRadius: "6px",
                            border: "1px solid rgba(59, 130, 246, 0.2)"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              <span style={{ fontWeight: 600, color: "#60a5fa", fontSize: "14px" }}>Context sent to AI:</span>
                            </div>
                            <pre style={{
                              whiteSpace: "pre-wrap",
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                              fontSize: '13px',
                              lineHeight: '1.6',
                              color: '#94a3b8',
                              margin: 0,
                              overflowX: "auto"
                            }}>
                              {sentPrompt}
                            </pre>
                          </div>
                        )}
                      </>
                    )}

                    {aiResponse && (
                      <div style={{
                        marginTop: 12,
                        padding: "12px 16px",
                        backgroundColor: "#1e293b",
                        borderRadius: "6px",
                        border: "1px solid #334155"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, color: "#3b82f6", fontSize: "14px" }}>AI Response:</span>
                        </div>
                        <div className="markdown" style={{
                          fontSize: '15px',
                          lineHeight: '1.7',
                          color: '#e2e8f0'
                        }}>
                          <ReactMarkdown>{aiResponse}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function McqPage() {
  return (
    <Suspense fallback={
      <div className="grid">
        <div className="card">
          <h2 className="title">Multiple Choice Questions</h2>
          <p className="muted">Loading...</p>
        </div>
      </div>
    }>
      <McqContent />
    </Suspense>
  );
}
