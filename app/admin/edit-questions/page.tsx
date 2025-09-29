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

function Content({ ctx: _ctx }: ContentProps) {
  void _ctx;
  const [topics, setTopics] = useState<string[]>([]);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [items, setItems] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

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
    if (topicFilter) query = query.eq("topic", topicFilter);
    const { data, error } = await query;
    if (!error) {
      const rows = (data as RawQuestion[] | null) ?? [];
      setItems(rows.map((row) => normalizeQuestion(row)));
    }
    setLoading(false);
  }, [topicFilter]);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesTopic = topicFilter ? item.topic === topicFilter : true;
      const matchesDifficulty = difficultyFilter === "all" ? true : item.difficulty === difficultyFilter;
      return matchesTopic && matchesDifficulty;
    });
  }, [difficultyFilter, items, topicFilter]);

  const onDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (!error) {
      setItems((arr) => arr.filter((item) => item.id !== id));
      if (editId === id) setEditId(null);
    }
  }, [editId]);

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
          <button className="btn" onClick={() => void loadItems()} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

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
                        onSaved={(updated) => {
                          setItems((arr) => arr.map((item) => (item.id === updated.id ? updated : item)));
                          setEditId(null);
                          void loadTopics();
                        }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
