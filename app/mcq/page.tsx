"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Difficulty, Question, RawQuestion } from "@/lib/types";
import { normalizeQuestion } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

export default function McqPage() {
  const { user } = useAuth();
  const [q, setQ] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const userId = user?.id ?? null;

  const loadRandom = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    setSelected(null);
    setStatus("idle");
    setAttemptError(null);
    const { data, error } = await supabase.rpc("random_questions", {
      n: 1,
      topics: topic ? [topic] : null,
      difficulties: difficulty ? [difficulty] : null,
      mcq_only: true,
      include_attempted: false
    });
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
  }, [topic, difficulty, userId]);

  useEffect(() => {
    void loadRandom();
  }, [loadRandom]);

  useEffect(() => {
    const loadTopics = async () => {
      const { data } = await supabase.rpc("list_topics");
      setTopics(((data as string[]) ?? []).sort());
    };
    void loadTopics();
  }, []);

  const submit = async () => {
    if (q == null || selected == null || !q.mcq) return;
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
          <Link className="btn" href="/">
            Back to Home
          </Link>
        </div>
        {!userId && (
          <p className="muted" style={{ marginBottom: 12 }}>
            {"Sign in to save your progress and hide questions you've already attempted."}
          </p>
        )}
        <div className="row" style={{ gap: 16, marginBottom: 8 }}>
          <div className="col">
            <label>Topic</label>
            <select value={topic ?? ""} onChange={(e) => setTopic(e.target.value || null)}>
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="col">
            <label>Difficulty</label>
            <select value={difficulty ?? ""} onChange={(e) => setDifficulty((e.target.value || null) as Difficulty | null)}>
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
            <div className="row" style={{ gap: 8 }}>
              <span className="pill">Topic: {q.topic}</span>
              <span className="pill">Difficulty: {q.difficulty}</span>
            </div>
            <h3 style={{ marginTop: 8 }}>{q.question_text}</h3>
            <ul className="clean" style={{ marginTop: 12 }}>
              {(q.mcq?.choices ?? []).map((c, idx) => (
                <li
                  key={idx}
                  className={choiceClass(idx)}
                  onClick={() => status === "idle" && setSelected(idx)}
                  style={{ cursor: status === "idle" ? "pointer" : "default" }}
                >
                  {c}
                </li>
              ))}
            </ul>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button
                className="btn primary"
                disabled={selected == null || status !== "idle" || savingAttempt}
                onClick={() => void submit()}
              >
                {savingAttempt ? "Saving…" : "Submit"}
              </button>
              <button className="btn" onClick={() => void loadRandom()} disabled={loading}>
                {loading ? "Loading…" : "Next Random"}
              </button>
            </div>
            {status !== "idle" && (
              <div style={{ marginTop: 12 }}>
                {status === "correct" ? (
                  <span className="pill" style={{ borderColor: "#1b7a42" }}>Correct</span>
                ) : (
                  <>
                    <span className="pill" style={{ borderColor: "#7a1b1b" }}>Incorrect</span>
                    {(q.mcq?.explanation ?? q.answer_text) && (
                      <p style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
                        <strong>Explanation: </strong>{q.mcq?.explanation ?? q.answer_text}
                      </p>
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
