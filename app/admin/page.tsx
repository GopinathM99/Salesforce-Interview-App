"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Question } from "@/lib/types";
import QuestionForm from "@/components/QuestionForm";
import ImportExportPanel from "@/components/ImportExportPanel";

type FilterType = "all" | "mcq" | "nonmcq";

export default function AdminPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [topics, setTopics] = useState<string[]>([]);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [items, setItems] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
      setSessionReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSignedIn(Boolean(sess)));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  };
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const loadTopics = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_topics");
    if (!error) setTopics((data as string[]) ?? []);
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("questions").select("*").order("created_at", { ascending: false }).limit(50);
    if (topicFilter) q = q.eq("topic", topicFilter);
    const { data, error } = await q;
    if (!error) setItems((data as Question[]) ?? []);
    setLoading(false);
  }, [topicFilter]);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);
  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    if (typeFilter === "all") return items;
    if (typeFilter === "mcq") return items.filter((i) => Array.isArray(i.choices) && i.correct_choice_index !== null);
    return items.filter((i) => !Array.isArray(i.choices) || i.correct_choice_index === null);
  }, [items, typeFilter]);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (!error) {
      setItems((arr) => arr.filter((i) => i.id !== id));
    }
  };

  if (!sessionReady) return null;

  if (!signedIn) {
    return (
      <div className="card">
        <h2 className="title">Admin Sign In</h2>
        <form className="col" style={{ gap: 12 }} onSubmit={signIn}>
          {authError && <p className="muted">Error: {authError}</p>}
          <div className="col">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
          </div>
          <div className="col">
            <label>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary" type="submit">Sign In</button>
          </div>
          <p className="muted">Use a Supabase Auth email/password user. Create one in your project’s Authentication tab.</p>
        </form>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="title">Admin</h2>
          <button className="btn" onClick={signOut}>Sign Out</button>
        </div>
        <QuestionForm
          topics={topics}
          onSaved={(q) => {
            setItems((arr) => [q, ...arr]);
          }}
        />
      </div>

      <ImportExportPanel />

      <div className="card">
        <div className="row" style={{ gap: 12, alignItems: "center" }}>
          <div className="col">
            <label>Filter by Topic</label>
            <select value={topicFilter ?? ""} onChange={(e) => setTopicFilter(e.target.value || null)}>
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="col">
            <label>Type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as FilterType)}>
              <option value="all">All</option>
              <option value="mcq">MCQ Only</option>
              <option value="nonmcq">Non-MCQ Only</option>
            </select>
          </div>
          <button className="btn" onClick={() => void loadItems()} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
        </div>

        <div style={{ marginTop: 12 }}>
          {filteredItems.length === 0 ? (
            <p className="muted">No questions found.</p>
          ) : (
            <ul className="clean">
              {filteredItems.map((q) => (
                <li key={q.id}>
                  <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                    <div className="col" style={{ flex: 1 }}>
                      <div className="row" style={{ gap: 8 }}>
                        <span className="pill">{q.topic}</span>
                        <span className="pill">{q.difficulty}</span>
                        {Array.isArray(q.choices) && q.correct_choice_index !== null && <span className="pill">MCQ</span>}
                      </div>
                      <strong style={{ marginTop: 6 }}>{q.question_text}</strong>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn" onClick={() => setEditId((id) => (id === q.id ? null : q.id))}>
                        {editId === q.id ? "Close" : "Edit"}
                      </button>
                      <button className="btn danger" onClick={() => void onDelete(q.id)}>Delete</button>
                    </div>
                  </div>
                  {editId === q.id && (
                    <div style={{ marginTop: 10 }}>
                      <QuestionForm
                        initial={q}
                        topics={topics}
                        onCancel={() => setEditId(null)}
                        onSaved={(updated) => {
                          setItems((arr) => arr.map((it) => (it.id === updated.id ? updated : it)));
                          setEditId(null);
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
