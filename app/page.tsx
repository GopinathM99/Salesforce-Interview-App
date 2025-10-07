"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { WelcomeMessage } from "@/components/WelcomeMessage";

export default function Page() {
  const { user } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [attemptsToday, setAttemptsToday] = useState<number | null>(null);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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

  const limitReached = attemptsToday != null && attemptsToday >= DAILY_LIMIT;


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

  return (
    <div className="grid">
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        {user && (
          <div style={{ marginBottom: 12 }}>
            <WelcomeMessage />
          </div>
        )}
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
                  className="btn primary"
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
        <div className="card">
          <h3>Subscribe to Daily Challenges</h3>
          <p>
            Get personalized Salesforce interview questions delivered to your inbox. 
            Choose your topics, difficulty levels, and question types to create the perfect study plan.
          </p>
          <Link
            className="btn primary"
            href="/subscribe"
            style={{ marginTop: 12, display: "inline-block" }}
          >
            Customize Your Subscription
          </Link>
        </div>
        {user && isAdmin && !checkingAdmin && (
          <div className="card">
            <h3>Admin Panel</h3>
            <p>Manage your Salesforce question bank, categories, and AI quotas.</p>
            <Link
              className="btn primary"
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
        </div>
      </div>
    </div>
  );
}
