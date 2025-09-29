"use client";

import { useCallback, useEffect, useState } from "react";
import AdminAccessShell from "@/components/AdminAccessShell";
import QuestionForm from "@/components/QuestionForm";
import type { Question } from "@/lib/types";
import type { UseAdminAccessResult } from "@/lib/useAdminAccess";
import { supabase } from "@/lib/supabaseClient";

export default function AdminNewQuestionPage() {
  return (
    <AdminAccessShell>
      {(ctx) => <Content ctx={ctx} />}
    </AdminAccessShell>
  );
}

type ContentProps = {
  ctx: UseAdminAccessResult;
};

function Content({ ctx }: ContentProps) {
  const [topics, setTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Question | null>(null);

  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    const { data, error } = await supabase.rpc("list_topics");
    if (!error) {
      const list = ((data as string[]) ?? []).filter((t): t is string => Boolean(t));
      setTopics(list);
    }
    setTopicsLoading(false);
  }, []);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  return (
    <div className="admin-stack">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="title">New Question</h2>
          <button className="btn" onClick={() => void ctx.signOut()}>Sign Out</button>
        </div>
        {ctx.currentUserEmail && (
          <p className="muted" style={{ marginBottom: 12 }}>Signed in as {ctx.currentUserEmail}</p>
        )}
        <p className="muted">
          Use this form to create new interview questions. Newly added topics are stored automatically and will
          appear in other admin tools after a refresh.
        </p>
        <div className="row" style={{ marginTop: 12, gap: 8 }}>
          <button className="btn" onClick={() => void loadTopics()} disabled={topicsLoading}>
            {topicsLoading ? "Refreshing…" : "Refresh Topics"}
          </button>
          {lastSaved && (
            <span className="muted" style={{ fontSize: 12 }}>
              Saved: {lastSaved.question_text.length > 60 ? `${lastSaved.question_text.slice(0, 57)}…` : lastSaved.question_text}
            </span>
          )}
        </div>
      </div>

      <QuestionForm
        topics={topics}
        onSaved={(question) => {
          setLastSaved(question);
          void loadTopics();
        }}
      />
    </div>
  );
}
