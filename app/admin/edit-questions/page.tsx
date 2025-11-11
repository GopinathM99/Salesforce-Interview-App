"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
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
    return items.filter((item) => {
      const matchesTopic = questionNumberSearchActive ? true : topicFilter ? item.topic === topicFilter : true;
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
        <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
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
          <div className="col" style={{ minWidth: 280 }}>
            <label>Search by Question #</label>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
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
                style={{ flex: 1, minWidth: 160 }}
              />
              <button className="btn" onClick={onSearchByQuestionNumber} disabled={loading}>
                Search
              </button>
              {questionNumberSearchActive && (
                <button className="btn" onClick={onClearQuestionNumberSearch} type="button">
                  Clear
                </button>
              )}
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
          </div>
          <button
            className="btn"
            onClick={() => {
              void loadItems();
              if (showDuplicates) void loadDuplicateItems();
            }}
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
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

      {showDuplicates && (
        <div className="card">
          <h3 className="title">Duplicate Questions</h3>
          <p className="muted" style={{ marginTop: 4 }}>
            Showing questions with identical text within the {duplicateItems?.length ?? 0} records currently loaded for
            duplicate analysis.
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
                                <div style={{ marginTop: 10 }}>
                                  <QuestionForm
                                    initial={duplicate}
                                    topics={topics}
                                    onCancel={() => setEditId(null)}
                                    onSaved={handleQuestionSaved}
                                  />
                                </div>
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
                      <div style={{ marginTop: 10 }}>
                        <QuestionForm
                          initial={question}
                          topics={topics}
                          onCancel={() => setEditId(null)}
                          onSaved={handleQuestionSaved}
                        />
                      </div>
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
