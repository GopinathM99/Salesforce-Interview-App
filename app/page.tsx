"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";

export default function Page() {
  const { user } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <div className="grid">
      <div className="card">
        <h2 className="title">Choose a Mode</h2>
        <p className="muted">Random questions are pulled from your Supabase database.</p>
        <div className="grid" style={{ marginTop: 12 }}>
          <div className="card">
            <h3>Flash Cards</h3>
            <p>Reveal answers, swipe through, and focus on understanding.</p>
            <Link
              className="btn primary"
              href="/flashcards"
              style={{ marginTop: 12, display: "inline-block" }}
            >
              Start Flashcards
            </Link>
          </div>
          <div className="card">
            <h3>Multiple Choice</h3>
            <p>Pick the right option and get instant feedback.</p>
            <Link
              className="btn primary"
              href="/mcq"
              style={{ marginTop: 12, display: "inline-block" }}
            >
              Start MCQs
            </Link>
          </div>
          <div className="card">
            <h3>Try New Questions</h3>
            <p>Attempt new knowledge, scenario based, or coding questions with Gemini.</p>
            <Link
              className="btn primary"
              href="/add-questions"
              style={{ marginTop: 12, display: "inline-block" }}
            >
              Live Gemini Chat
            </Link>
          </div>
          <div className="card">
            <h3>Reset Progress</h3>
            <p>Clear your attempt history so every question appears again.</p>
            <button className="btn" onClick={() => void resetProgress()} disabled={resetting}>
              {resetting ? "Resetting…" : "Reset Progress"}
            </button>
            {message && <p className="muted" style={{ marginTop: 8 }}>{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
