"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bot,
  Layers,
  ListChecks,
  LogIn,
  RefreshCcw,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";

interface ModeCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconTint?: string;
  children: ReactNode;
}

function ModeCard({ title, description, icon: Icon, iconTint, children }: ModeCardProps) {
  return (
    <div className="flex h-full flex-col gap-5 rounded-2xl border border-white/10 bg-card/80 p-6 shadow-lg shadow-black/20 transition-transform duration-200 ease-out hover:-translate-y-1">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-10 items-center justify-center rounded-xl bg-white/10 text-accent", iconTint)}>
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted">{description}</p>
      <div className="mt-auto flex flex-col gap-3">{children}</div>
    </div>
  );
}

export default function Page() {
  const { user } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [attemptsToday, setAttemptsToday] = useState<number | null>(null);
  const [attemptsLoading, setAttemptsLoading] = useState(false);

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
  const attemptsUsed = attemptsToday ?? 0;
  const remainingAttempts = Math.max(0, DAILY_LIMIT - attemptsUsed);
  const progressPercent = Math.min(100, (attemptsUsed / DAILY_LIMIT) * 100);
  const usageStatus = attemptsLoading
    ? "Checking your Gemini quota…"
    : !user
      ? "Sign in to unlock Gemini powered prompts."
      : limitReached
        ? "You reached today's Gemini limit. Come back tomorrow."
        : `You can spin up ${remainingAttempts} more Gemini ${remainingAttempts === 1 ? "prompt" : "prompts"} today.`;

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
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#060b16] via-[#0b1326] to-[#050910]">
      <div className="pointer-events-none absolute inset-x-0 top-[-15%] h-64 bg-[radial-gradient(circle_at_top,_rgba(106,167,255,0.25),_transparent_65%)] blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-16 md:px-6 md:py-24">
        <section className="grid gap-10 lg:grid-cols-[1.3fr,0.7fr]">
          <div className="flex flex-col gap-7">
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.04] px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted">
              <Sparkles className="h-4 w-4 text-accent" />
              Salesforce Interview Coach
            </span>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold leading-tight text-foreground md:text-4xl">
                Get a focused daily routine for Salesforce interviews.
              </h1>
              <p className="max-w-2xl text-base text-muted md:text-lg">
                Alternate between quick recall, applied scenarios, and AI-generated prompts to steadily cover core platform, integration, and architecture topics without the noise.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/flashcards">
                  Start flashcards
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/mcq">Review MCQs</Link>
              </Button>
            </div>
            <div className="grid gap-3 text-xs text-muted md:text-sm">
              <div className="inline-flex items-center gap-2 text-muted">
                <Layers className="h-4 w-4 text-accent" />
                Structured flows for discovery, design, and technical rounds
              </div>
              {user ? (
                <div className="inline-flex items-center gap-2 text-muted">
                  <Sparkles className="h-4 w-4 text-accent" />
                  {attemptsLoading
                    ? "Syncing your Gemini usage…"
                    : `${Math.min(attemptsUsed, DAILY_LIMIT)}/${DAILY_LIMIT} Gemini prompts used today`}
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 text-muted">
                  <LogIn className="h-4 w-4 text-accent" />
                  Sign in to track progress and unlock Gemini brainstorming
                </div>
              )}
            </div>
          </div>
          <aside className="rounded-2xl border border-white/10 bg-card/80 p-6 shadow-lg shadow-black/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted">Gemini prompts today</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {attemptsLoading ? "—" : `${Math.min(attemptsUsed, DAILY_LIMIT)}/${DAILY_LIMIT}`}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-accent">
                <Bot className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-5 text-sm text-muted">{usageStatus}</p>
            <div className="mt-6">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6aa7ff] to-[#22c55e] transition-all duration-500"
                  style={{ width: `${limitReached ? 100 : progressPercent}%` }}
                />
              </div>
              {user && !attemptsLoading && !limitReached && (
                <p className="mt-3 text-xs text-muted">
                  {remainingAttempts} {remainingAttempts === 1 ? "prompt" : "prompts"} left today.
                </p>
              )}
              {limitReached && user && !attemptsLoading && (
                <p className="mt-3 text-xs text-danger">
                  Daily cap reached—come back tomorrow or switch modes.
                </p>
              )}
              {!user && (
                <p className="mt-3 text-xs text-muted">
                  Create an account to persist usage history and notes.
                </p>
              )}
            </div>
          </aside>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <ModeCard
            title="Flash Cards"
            description="Cycle through curated prompts and model answers to lock in fundamentals."
            icon={Layers}
            iconTint="text-[#8ab6ff]"
          >
            <Button asChild>
              <Link href="/flashcards">
                Open flashcards
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </ModeCard>

          <ModeCard
            title="Multiple Choice"
            description="Stress-test scenario judgment with quick MCQs and instant feedback."
            icon={ListChecks}
            iconTint="text-[#7dd3fc]"
          >
            <Button asChild>
              <Link href="/mcq">
                Practice MCQs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </ModeCard>

          <ModeCard
            title="Gemini Brainstorm"
            description="Ask Gemini for net-new questions tailored to the product cloud or role you care about."
            icon={Bot}
            iconTint="text-[#a5f3fc]"
          >
            {user ? (
              limitReached ? (
                <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                  You used all {DAILY_LIMIT} Gemini prompts today.
                </div>
              ) : (
                <Button asChild>
                  <Link href="/add-questions">
                    Launch Gemini chat
                    <Sparkles className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )
            ) : (
              <div className="space-y-2 text-xs text-muted">
                <Button disabled>
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign in to access
                  </span>
                </Button>
                <p>Log in to ideate custom prompts with Gemini.</p>
              </div>
            )}
          </ModeCard>

          <ModeCard
            title="Reset Progress"
            description="Clear your attempt history and restart every mode from the top."
            icon={RefreshCcw}
            iconTint="text-[#fca5a5]"
          >
            <Button variant="outline" onClick={() => void resetProgress()} disabled={resetting}>
              {resetting ? "Resetting…" : "Reset progress"}
            </Button>
            {message && <p className="text-xs text-muted">{message}</p>}
          </ModeCard>
        </section>
      </div>
    </main>
  );
}
