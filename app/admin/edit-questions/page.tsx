"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import AdminAccessShell from "@/components/AdminAccessShell";
import QuestionForm from "@/components/QuestionForm";
import type { Difficulty, Question, RawQuestion } from "@/lib/types";
import type { UseAdminAccessResult } from "@/lib/useAdminAccess";
import { normalizeQuestion } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";

type DifficultyFilter = Difficulty | "all";

export default function AdminEditQuestionsPage() {
  return (
    <AdminAccessShell>
      {(ctx) => <Content ctx={ctx} />}
    </AdminAccessShell>
  );
}

type ContentProps = {
  ctx: UseAdminAccessResult;
};

const parseQuestionNumbers = (value: string): number[] => {
  const parsed = value
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number(part))
    .filter((num) => Number.isFinite(num));
  return Array.from(new Set(parsed));
};

function Content({ ctx: _ctx }: ContentProps) {
  void _ctx;
  const [topics, setTopics] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("easy");
  const [items, setItems] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [questionNumberInput, setQuestionNumberInput] = useState("");
  const [questionNumberSearch, setQuestionNumberSearch] = useState<number[] | null>(null);
  const [questionNumberError, setQuestionNumberError] = useState<string | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [expandedDuplicateKeys, setExpandedDuplicateKeys] = useState<string[]>([]);
  const [duplicateItems, setDuplicateItems] = useState<Question[] | null>(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const questionNumberSearchActive = (questionNumberSearch?.length ?? 0) > 0;
  const [askAIForId, setAskAIForId] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [askingAI, setAskingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [sentPrompt, setSentPrompt] = useState<string>("");
  const [showPrompt, setShowPrompt] = useState(false);

  const loadTopics = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_topics");
    if (error) return;
    const list = ((data as string[]) ?? []).filter((t): t is string => Boolean(t));
    setTopics(list);
    setTopicFilter((prev) => {
      if (list.length === 0) return null;
      if (prev && list.includes(prev)) return prev;
      return list[0];
    });
  }, []);

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_categories");
    if (error) return;
    const list = ((data as string[]) ?? []).filter((c): c is string => Boolean(c));
    setCategories(list);
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("questions")
      .select("*, multiple_choice_questions(*)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (questionNumberSearchActive && questionNumberSearch) {
      query = query.in("question_number", questionNumberSearch);
    } else if (topicFilter) {
      query = query.eq("topic", topicFilter);
    }
    const { data, error } = await query;
    if (!error) {
      const rows = (data as RawQuestion[] | null) ?? [];
      setItems(rows.map((row) => normalizeQuestion(row)));
    }
    setLoading(false);
  }, [questionNumberSearchActive, questionNumberSearch, topicFilter]);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const loadDuplicateItems = useCallback(async () => {
    setDuplicateLoading(true);
    const { data, error } = await supabase
      .from("questions")
      .select("*, multiple_choice_questions(*)")
      .order("question_number", { ascending: true })
      .limit(1000);
    if (!error) {
      const rows = (data as RawQuestion[] | null) ?? [];
      setDuplicateItems(rows.map((row) => normalizeQuestion(row)));
    }
    setDuplicateLoading(false);
  }, []);

  useEffect(() => {
    if (showDuplicates) {
      void loadDuplicateItems();
    }
  }, [loadDuplicateItems, showDuplicates]);

  const filteredItems = useMemo(() => {
    // When searching by question number, don't apply any filters
    if (questionNumberSearchActive) {
      return items;
    }
    return items.filter((item) => {
      const matchesTopic = topicFilter ? item.topic === topicFilter : true;
      const matchesDifficulty = difficultyFilter === "all" ? true : item.difficulty === difficultyFilter;
      return matchesTopic && matchesDifficulty;
    });
  }, [difficultyFilter, items, questionNumberSearchActive, topicFilter]);

  const duplicateGroups = useMemo(() => {
    if (!showDuplicates) return [];
    const source = duplicateItems ?? [];
    const map = new Map<string, { key: string; text: string; items: Question[] }>();
    source.forEach((item) => {
      const text = item.question_text?.trim();
      if (!text) return;
      const key = text.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { key, text, items: [] });
      }
      map.get(key)!.items.push(item);
    });
    return Array.from(map.values()).filter((group) => group.items.length > 1);
  }, [duplicateItems, showDuplicates]);

  useEffect(() => {
    if (!showDuplicates && expandedDuplicateKeys.length > 0) {
      setExpandedDuplicateKeys([]);
    }
  }, [expandedDuplicateKeys.length, showDuplicates]);

  const toggleDuplicateGroup = useCallback((key: string) => {
    setExpandedDuplicateKeys((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  }, []);

  const syncUpdatedQuestion = useCallback((updated: Question) => {
    setItems((arr) => arr.map((item) => (item.id === updated.id ? updated : item)));
    setDuplicateItems((arr) => (arr ? arr.map((item) => (item.id === updated.id ? updated : item)) : arr));
  }, []);

  const syncDeletedQuestion = useCallback((id: string) => {
    setItems((arr) => arr.filter((item) => item.id !== id));
    setDuplicateItems((arr) => (arr ? arr.filter((item) => item.id !== id) : arr));
  }, []);

  const handleQuestionSaved = useCallback((updated: Question) => {
    syncUpdatedQuestion(updated);
    setEditId(null);
    void loadTopics();
  }, [loadTopics, syncUpdatedQuestion]);

  const onDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (!error) {
      syncDeletedQuestion(id);
      if (editId === id) setEditId(null);
    }
  }, [editId, syncDeletedQuestion]);

  const onSearchByQuestionNumber = useCallback(() => {
    const parsed = parseQuestionNumbers(questionNumberInput);
    if (parsed.length === 0) {
      setQuestionNumberError("Enter at least one valid question number.");
      setQuestionNumberSearch(null);
      return;
    }
    setQuestionNumberError(null);
    setQuestionNumberSearch(parsed);
  }, [questionNumberInput]);

  const onClearQuestionNumberSearch = useCallback(() => {
    setQuestionNumberInput("");
    setQuestionNumberSearch(null);
    setQuestionNumberError(null);
  }, []);

  const askAI = useCallback(async (question: Question) => {
    try {
      if (!userQuestion.trim()) {
        setAiError("Please enter a question.");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session || !session.access_token) {
        setAiError("Please sign in to use the Ask AI feature.");
        return;
      }

      setAskingAI(true);
      setAiError(null);
      setAiResponse("");
      setSentPrompt("");
      setShowPrompt(false);

      try {
        // Build context message with question details
        let fullMessage = `Salesforce${question.category ? ` - ${question.category}` : ''} question with a follow up user question:

Question: ${question.question_text}

`;

        // Add MCQ choices if available
        if (question.mcq && question.mcq.choices.length > 0) {
          fullMessage += `Choices:
${question.mcq.choices.map((choice, idx) => `${idx + 1}. ${choice}`).join('\n')}

Correct Answer: ${question.mcq.choices[question.mcq.correct_choice_index]}

`;
          if (question.mcq.explanation) {
            fullMessage += `Explanation: ${question.mcq.explanation}

`;
          }
        } else if (question.answer_text) {
          fullMessage += `Answer: ${question.answer_text}

`;
        }

        fullMessage += `User's question related to above Salesforce${question.category ? ` - ${question.category}` : ''} question: ${userQuestion}

Please answer the user's question clearly and concisely, ideally within one or two paragraphs.`;

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
      console.error("Ask AI outer error:", error);
      setAiError("An unexpected error occurred. Please try again.");
      setAskingAI(false);
    } finally {
      setAskingAI(false);
    }
  }, [userQuestion]);

  return (
    <div className="admin-stack">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="title">Edit Questions</h2>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link className="btn" href="/admin">Back to Admin Home Page</Link>
          </div>
        </div>
        <p className="muted">
          Filter by topic and difficulty to update or delete questions. Use the refresh button after imports or new
          question submissions to pull the latest content.
        </p>
        <div style={{ marginTop: 12 }}>
          <div className="row" style={{ gap: 12, alignItems: "flex-end", flexWrap: "wrap", justifyContent: "space-between" }}>
            <div className="row" style={{ gap: 12, alignItems: "flex-end" }}>
              <div className="col">
                <label>Filter by Topic</label>
                <select value={topicFilter ?? (topics[0] ?? "")} onChange={(e) => setTopicFilter(e.target.value || null)}>
                  {topics.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="col">
                <label>Difficulty</label>
                <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value as DifficultyFilter)}>
                  <option value="all">All</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <div style={{ position: "relative", display: "inline-block" }}>
              <button
                className="btn"
                onClick={() => {
                  void loadItems();
                  if (showDuplicates) void loadDuplicateItems();
                }}
                disabled={loading}
                onMouseEnter={(e) => {
                  const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
                  if (tooltip) tooltip.style.visibility = "visible";
                }}
                onMouseLeave={(e) => {
                  const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
                  if (tooltip) tooltip.style.visibility = "hidden";
                }}
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
              <div
                style={{
                  visibility: "hidden",
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginBottom: "8px",
                  padding: "6px 10px",
                  backgroundColor: "#1e293b",
                  color: "#f1f5f9",
                  fontSize: "13px",
                  borderRadius: "6px",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                  border: "1px solid #334155",
                  zIndex: 1000,
                  pointerEvents: "none"
                }}
              >
                Fetches latest data from Supabase
              </div>
            </div>
          </div>

          <div className="col" style={{ marginTop: 12 }}>
            <label>Search by Question #</label>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <input
                type="text"
                placeholder="e.g. 12 or 10,22,48"
                value={questionNumberInput}
                onChange={(e) => setQuestionNumberInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSearchByQuestionNumber();
                  }
                }}
                style={{ maxWidth: 200 }}
              />
              <button className="btn" onClick={onSearchByQuestionNumber} disabled={loading}>
                Search
              </button>
              <button
                className="btn"
                onClick={onClearQuestionNumberSearch}
                type="button"
                style={{ visibility: questionNumberSearchActive ? 'visible' : 'hidden' }}
              >
                Clear
              </button>
            </div>
            {questionNumberError ? (
              <p className="muted" style={{ color: "#c62828", marginTop: 4 }}>{questionNumberError}</p>
            ) : questionNumberSearchActive ? (
              <p className="muted" style={{ marginTop: 4 }}>
                Showing question number{questionNumberSearch!.length > 1 ? "s" : ""}: {questionNumberSearch!.join(", ")}
              </p>
            ) : (
              <p className="muted" style={{ marginTop: 4 }}>
                Enter a single number or comma-separated list. Search overrides the topic filter.
              </p>
            )}
            <div style={{ marginTop: 8 }}>
              <button
                className="btn"
                type="button"
                onClick={() => setShowDuplicates((prev) => !prev)}
                disabled={items.length === 0}
              >
                {showDuplicates ? "Hide Duplicates" : "Show Duplicates"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDuplicates && (
        <div className="card">
          <h3 className="title">Duplicate Questions</h3>
          <p className="muted" style={{ marginTop: 4 }}>
            Found {duplicateGroups.length} duplicate group{duplicateGroups.length !== 1 ? "s" : ""} ({duplicateGroups.reduce((sum, g) => sum + g.items.length, 0)} questions total) out of {duplicateItems?.length ?? 0} total records.
          </p>
          <div style={{ marginTop: 12 }}>
            {duplicateLoading ? (
              <p className="muted">Loading duplicate data…</p>
            ) : duplicateGroups.length === 0 ? (
              <p className="muted">No duplicate questions found.</p>
            ) : (
              <ul className="clean">
                {duplicateGroups.map((group) => {
                  const isExpanded = expandedDuplicateKeys.includes(group.key);
                  return (
                    <li key={group.key}>
                      <button
                        type="button"
                        className="duplicate-group-toggle"
                        onClick={() => toggleDuplicateGroup(group.key)}
                        aria-expanded={isExpanded}
                      >
                        <div className="duplicate-group-main">
                          <strong>{group.text}</strong>
                          <div className="duplicate-group-tags">
                            {group.items.map((duplicate) => (
                              <span className="pill pill-soft" key={duplicate.id}>
                                {typeof duplicate.question_number === "number" ? `#${duplicate.question_number}` : "No #"}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="duplicate-group-meta">
                          <span className="pill pill-soft" style={{ whiteSpace: "nowrap" }}>
                            {group.items.length} duplicate{group.items.length > 1 ? "s" : ""}
                          </span>
                          <span className="duplicate-group-chevron" aria-hidden="true">{isExpanded ? "▴" : "▾"}</span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="duplicate-group-panel">
                          {group.items.map((duplicate) => (
                            <div key={duplicate.id} className="duplicate-entry">
                              <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div className="col" style={{ flex: 1 }}>
                                  <div className="row" style={{ gap: 8 }}>
                                    {typeof duplicate.question_number === "number" && (
                                      <span className="pill">#{duplicate.question_number}</span>
                                    )}
                                    <span className="pill">{duplicate.topic}</span>
                                    <span className="pill">{duplicate.difficulty}</span>
                                  </div>
                                  <strong style={{ marginTop: 6 }}>{duplicate.question_text}</strong>
                                </div>
                                <div className="row" style={{ gap: 8 }}>
                                  <button className="btn" onClick={() => setEditId((id) => (id === duplicate.id ? null : duplicate.id))}>
                                    {editId === duplicate.id ? "Close" : "Edit"}
                                  </button>
                                  <button className="btn danger" onClick={() => void onDelete(duplicate.id)}>Delete</button>
                                </div>
                              </div>
                              {editId === duplicate.id && (
                                <>
                                  <div style={{ marginTop: 10 }}>
                                    <QuestionForm
                                      initial={duplicate}
                                      topics={topics}
                                      categories={categories}
                                      onCancel={() => setEditId(null)}
                                      onSaved={handleQuestionSaved}
                                      onAskAI={() => {
                                        if (askAIForId === duplicate.id) {
                                          setAskAIForId(null);
                                          setUserQuestion("");
                                          setAiResponse("");
                                          setAiError(null);
                                          setSentPrompt("");
                                          setShowPrompt(false);
                                        } else {
                                          setAskAIForId(duplicate.id);
                                          setUserQuestion("");
                                          setAiResponse("");
                                          setAiError(null);
                                          setSentPrompt("");
                                          setShowPrompt(false);
                                        }
                                      }}
                                      askAIActive={askAIForId === duplicate.id}
                                    />
                                  </div>

                                  {/* Ask AI Expanded Section */}
                                  {askAIForId === duplicate.id && (
                                    <div style={{ marginTop: 16, borderTop: "1px solid #334155", paddingTop: 16 }}>
                                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
                                        <span style={{ color: "#94a3b8", fontSize: "14px", paddingTop: 6 }}>
                                          Ask a follow-up question about this question
                                        </span>
                                      </div>

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
                                              void askAI(duplicate);
                                            }
                                          }}
                                        />
                                        <button
                                          className="btn primary"
                                          onClick={() => void askAI(duplicate)}
                                          disabled={!userQuestion.trim() || askingAI}
                                          style={{ minWidth: "80px" }}
                                        >
                                          {askingAI ? "Asking..." : "Send"}
                                        </button>
                                      </div>
                                      <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <p style={{ fontSize: "12px", color: "#64748b", margin: 0, flex: 1 }}>
                                          AI Model: <span style={{ color: "#10b981", fontWeight: 500 }}>Gemini 3 Flash Preview</span>
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
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {!showDuplicates && (
        <div className="card">
          <h3 className="title">Questions</h3>
          <div style={{ marginTop: 12 }}>
            {filteredItems.length === 0 ? (
              <p className="muted">No questions found.</p>
            ) : (
              <ul className="clean">
                {filteredItems.map((question) => (
                  <li key={question.id}>
                    <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                      <div className="col" style={{ flex: 1 }}>
                        <div className="row" style={{ gap: 8 }}>
                          {typeof question.question_number === "number" && (
                            <span className="pill">#{question.question_number}</span>
                          )}
                          <span className="pill">{question.topic}</span>
                          <span className="pill">{question.difficulty}</span>
                        </div>
                        <strong style={{ marginTop: 6 }}>{question.question_text}</strong>
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn" onClick={() => setEditId((id) => (id === question.id ? null : question.id))}>
                          {editId === question.id ? "Close" : "Edit"}
                        </button>
                        <button className="btn danger" onClick={() => void onDelete(question.id)}>Delete</button>
                      </div>
                    </div>
                    {editId === question.id && (
                      <>
                        <div style={{ marginTop: 10 }}>
                          <QuestionForm
                            initial={question}
                            topics={topics}
                            categories={categories}
                            onCancel={() => setEditId(null)}
                            onSaved={handleQuestionSaved}
                            onAskAI={() => {
                              if (askAIForId === question.id) {
                                setAskAIForId(null);
                                setUserQuestion("");
                                setAiResponse("");
                                setAiError(null);
                                setSentPrompt("");
                                setShowPrompt(false);
                              } else {
                                setAskAIForId(question.id);
                                setUserQuestion("");
                                setAiResponse("");
                                setAiError(null);
                                setSentPrompt("");
                                setShowPrompt(false);
                              }
                            }}
                            askAIActive={askAIForId === question.id}
                          />
                        </div>

                        {/* Ask AI Expanded Section */}
                        {askAIForId === question.id && (
                          <div style={{ marginTop: 16, borderTop: "1px solid #334155", paddingTop: 16 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
                              <span style={{ color: "#94a3b8", fontSize: "14px", paddingTop: 6 }}>
                                Ask a follow-up question about this question
                              </span>
                            </div>

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
                                    void askAI(question);
                                  }
                                }}
                              />
                              <button
                                className="btn primary"
                                onClick={() => void askAI(question)}
                                disabled={!userQuestion.trim() || askingAI}
                                style={{ minWidth: "80px" }}
                              >
                                {askingAI ? "Asking..." : "Send"}
                              </button>
                            </div>
                            <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <p style={{ fontSize: "12px", color: "#64748b", margin: 0, flex: 1 }}>
                                AI Model: <span style={{ color: "#10b981", fontWeight: 500 }}>Gemini 3 Flash Preview</span>
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
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
