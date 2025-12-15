"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import AdminAccessShell from "@/components/AdminAccessShell";
import { supabase } from "@/lib/supabaseClient";
import { getFollowUpPrompt, type PromptOptions } from "@/lib/followUpPromptTemplate";

const DIFFICULTY_CHOICES = ["Easy", "Medium", "Hard"];
const QUESTION_COUNT_CHOICES = ["1", "2", "5"];
const QUESTION_KIND_CHOICES = ["Knowledge", "Scenario", "Coding"];

type GeminiMessage = {
  role: "user" | "assistant";
  content: string;
};

type SqlExecutionStatus = {
  state: "idle" | "running" | "success" | "error";
  message?: string;
};

const extractInsertStatements = (content: string): string[] => {
  const statements: string[] = [];
  const blockRegex = /```(?:sql)?\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(content)) !== null) {
    const block = match[1];
    const splits = block
      .split(/;\s*(?:\r?\n|$)/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    splits.forEach((statement) => {
      const normalized = statement.replace(/;+$/g, "").trim();
      const startsWithInsert = /^insert\s+into\s+/i.test(normalized);
      const startsWithWith = /^with\s+/i.test(normalized) && /insert\s+into\s+/i.test(normalized);

      if (startsWithInsert || startsWithWith) {
        statements.push(statement.endsWith(";") ? statement : `${statement};`);
      }
    });
  }

  if (statements.length === 0) {
    const fallbackSplits = content
      .split(/;\s*(?:\r?\n|$)/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    fallbackSplits.forEach((statement) => {
      const normalized = statement.replace(/;+$/g, "").trim();
      const startsWithInsert = /^insert\s+into\s+/i.test(normalized);
      const startsWithWith = /^with\s+/i.test(normalized) && /insert\s+into\s+/i.test(normalized);

      if (startsWithInsert || startsWithWith) {
        statements.push(statement.endsWith(";") ? statement : `${statement};`);
      }
    });
  }

  return statements;
};

const responsePanelStyle: CSSProperties = {
  background: "#0b1730",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 12,
  padding: "14px 16px",
  lineHeight: 1.65,
  width: "100%",
  maxHeight: "none",
  overflow: "visible",
  wordBreak: "break-word"
};

const responseSectionStyle: CSSProperties = {
  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  paddingTop: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8
};


export default function AdminNewQuestionPage() {
  return (
    <AdminAccessShell>
      {() => <Content />}
    </AdminAccessShell>
  );
}

function Content() {
  // Note: We don't use session from context - we always fetch fresh from supabase.auth.getSession()
  // to ensure the token is valid and refreshed
  const [topics, setTopics] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [questionTypes, setQuestionTypes] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(["Medium", "Hard"]);
  const [selectedCount, setSelectedCount] = useState<string | null>("5");
  const [selectedKind, setSelectedKind] = useState<string | null>("Scenario");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [geminiResponse, setGeminiResponse] = useState<string>("");
  const [geminiFollowUpResponse, setGeminiFollowUpResponse] = useState<string>("");
  const [followUpPromptSent, setFollowUpPromptSent] = useState<string>("");
  const [showFollowUpPrompt, setShowFollowUpPrompt] = useState(false);
  const [followUpCopied, setFollowUpCopied] = useState(false);
  const [followUpCopyError, setFollowUpCopyError] = useState<string | null>(null);
  const [insertStatus, setInsertStatus] = useState<SqlExecutionStatus>({ state: "idle" });

  const insertStatements = useMemo(() => extractInsertStatements(geminiFollowUpResponse), [geminiFollowUpResponse]);

  const loadTopics = useCallback(async () => {
    setTopicsLoading(true);
    const { data, error } = await supabase.rpc("list_topics");
    if (error) {
      console.error("Failed to load topics", error);
      setTopics([]);
    } else {
      const list = Array.from(
        new Set(((data as string[]) ?? []).filter((topic): topic is string => Boolean(topic)))
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
      setTopics(list);
    }
    setTopicsLoading(false);
  }, []);

  const loadMetadata = useCallback(async () => {
    // Load categories
    const { data: categoriesData } = await supabase.rpc("list_categories");
    if (categoriesData) {
      setCategories((categoriesData as string[]).filter(Boolean));
    }

    // Load difficulty levels
    const { data: difficultiesData } = await supabase.rpc("list_difficulty_levels");
    if (difficultiesData) {
      setDifficulties((difficultiesData as string[]).filter(Boolean));
    }

    // Load question types
    const { data: questionTypesData } = await supabase.rpc("list_question_types");
    if (questionTypesData) {
      setQuestionTypes((questionTypesData as string[]).filter(Boolean));
    }
  }, []);

  useEffect(() => {
    void loadTopics();
    void loadMetadata();
  }, [loadTopics, loadMetadata]);

  const topicOptions = useMemo(() => [...topics], [topics]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((previous) =>
      previous.includes(topic)
        ? previous.filter((item) => item !== topic)
        : [...previous, topic]
    );
  };

  const toggleDifficulty = (difficulty: string) => {
    setSelectedDifficulties((previous) =>
      previous.includes(difficulty)
        ? previous.filter((item) => item !== difficulty)
        : [...previous, difficulty]
    );
  };

  const handleKindChange = (kind: string) => {
    setSelectedKind(kind);
    if (kind === "Coding") {
      setSelectedCount("1");
    } else {
      setSelectedCount("5");
    }
  };

  const handleCountChange = (count: string) => {
    if (selectedKind === "Coding" && count !== "1" && count !== "2") return;
    setSelectedCount(count);
  };

  const streamGemini = async (messages: GeminiMessage[], onChunk?: (text: string) => void) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    };

    // Force refresh the session to get a fresh access token
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    // If refresh fails, the session is invalid - user must sign in again
    if (refreshError || !refreshData.session?.access_token) {
      await supabase.auth.signOut();
      throw new Error("Your session has expired or is invalid. Please sign in again.");
    }

    headers.Authorization = `Bearer ${refreshData.session.access_token}`;

    const response = await fetch("/api/gemini", {
      method: "POST",
      headers,
      body: JSON.stringify({ messages })
    });

    if (!response.ok) {
      let detail = `Gemini request failed: ${response.status}`;
      try {
        const data = (await response.json()) as { error?: string };
        if (data?.error) detail = data.error;
      } catch {
        // ignore parse errors
      }
      throw new Error(detail);
    }

    if (!response.body) {
      throw new Error("Gemini returned an empty stream.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let output = "";
    let finished = false;

    const processEvent = (eventChunk: string) => {
      const trimmed = eventChunk.trim();
      if (!trimmed.startsWith("data:")) return;
      const payloadText = trimmed.slice(5).trim();
      if (!payloadText) return;

      let payload: { text?: string; error?: string; done?: boolean };
      try {
        payload = JSON.parse(payloadText);
      } catch (error) {
        console.warn("Gemini parse error", error, payloadText);
        return;
      }

      if (payload.error) {
        throw new Error(payload.error);
      }

      if (typeof payload.text === "string" && payload.text.length > 0) {
        output += payload.text;
        onChunk?.(output);
      }

      if (payload.done) {
        finished = true;
      }
    };

    while (!finished) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const eventChunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        processEvent(eventChunk);
        boundary = buffer.indexOf("\n\n");
      }

      if (done) {
        if (buffer.trim()) {
          processEvent(buffer);
          buffer = "";
        }
        finished = true;
      }
    }

    return output.trim();
  };

  const sendPromptToGemini = async () => {
    if (geminiLoading || !geminiPrompt.trim()) return;
    setGeminiLoading(true);
    setGeminiError(null);
    setGeminiResponse("");
    setGeminiFollowUpResponse("");
    setFollowUpPromptSent("");
    setShowFollowUpPrompt(false);
    setFollowUpCopied(false);
    setFollowUpCopyError(null);

    try {
      const primaryMessages: GeminiMessage[] = [{ role: "user", content: geminiPrompt }];
      const primary = await streamGemini(primaryMessages, (text) => setGeminiResponse(text));

      if (!primary.trim()) {
        throw new Error("Gemini returned an empty reply.");
      }

      setGeminiResponse(primary);

      // Skip the Supabase INSERT SQL request for coding questions
      if (selectedKind !== "Coding") {
        const promptOptions: PromptOptions = {
          topics: topics.length > 0 ? topics : undefined,
          categories: categories.length > 0 ? categories : undefined,
          difficulties: difficulties.length > 0 ? difficulties : undefined,
          questionTypes: questionTypes.length > 0 ? questionTypes : undefined,
        };

        const followUpPrompt = getFollowUpPrompt(promptOptions);
        setFollowUpPromptSent(followUpPrompt);

        const followUpMessages: GeminiMessage[] = [
          { role: "user", content: geminiPrompt },
          { role: "assistant", content: primary },
          { role: "user", content: followUpPrompt }
        ];

        const followUp = await streamGemini(followUpMessages);
        setGeminiFollowUpResponse(followUp);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Gemini error.";
      setGeminiError(message);
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleCopyFollowUp = async () => {
    if (!geminiFollowUpResponse || followUpCopied) return;
    try {
      await navigator.clipboard.writeText(geminiFollowUpResponse);
      setFollowUpCopied(true);
      setFollowUpCopyError(null);
      window.setTimeout(() => {
        setFollowUpCopied(false);
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to copy.";
      setFollowUpCopyError(message);
    }
  };

  const handleInsertIntoSupabase = useCallback(async () => {
    if (!geminiFollowUpResponse || insertStatements.length === 0 || insertStatus.state === "running") {
      if (geminiFollowUpResponse && insertStatements.length === 0 && insertStatus.state !== "running") {
        setInsertStatus({ state: "error", message: "No INSERT statements detected in Gemini follow-up." });
      }
      return;
    }

    // Force refresh the session to get a fresh access token
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    // If refresh fails, the session is invalid - user must sign in again
    if (refreshError || !refreshData.session?.access_token) {
      await supabase.auth.signOut();
      setInsertStatus({ state: "error", message: "Your session has expired or is invalid. Please sign in again." });
      return;
    }

    const accessToken = refreshData.session.access_token;

    setInsertStatus({ state: "running" });

    try {
      const sanitizedStatements = insertStatements.map((statement) => statement.replace(/;+$/g, "").trim());

      const response = await fetch("/api/admin/execute-sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ statements: sanitizedStatements })
      });

      const data = (await response.json()) as { error?: string; success?: boolean; executed?: number };

      if (!response.ok || data?.success !== true) {
        const message = data?.error || "Failed to insert statements.";
        setInsertStatus({ state: "error", message });
        return;
      }

      setInsertStatus({
        state: "success",
        message:
          data.executed && data.executed > 0
            ? `Inserted ${data.executed} statement${data.executed === 1 ? "" : "s"}.`
            : "Insert complete."
      });
    } catch (insertError) {
      const message = insertError instanceof Error ? insertError.message : "Unexpected error inserting records.";
      setInsertStatus({ state: "error", message });
    }
  }, [geminiFollowUpResponse, insertStatements, insertStatus.state]);

  useEffect(() => {
    setInsertStatus({ state: "idle" });
  }, [geminiFollowUpResponse]);

  const geminiPrompt = useMemo(() => {
    const countLabel = selectedCount ?? "3";
    const topicsLabel = selectedTopics.length > 0 ? selectedTopics.join(", ") : "core Salesforce concepts";
    const difficultyLabel =
      selectedDifficulties.length > 0 ? selectedDifficulties.join(", ") : "mixed difficulty";

    switch (selectedKind) {
      case "Coding":
        return (
          `Give me ${countLabel} Senior Salesforce Developer Interview coding questions and answers. ` +
          `Code should follow best salesforce practices. ` +
          `Cover topics like ${topicsLabel}\n\n` +
          `Difficulty level - ${difficultyLabel}`
        );
      case "Scenario":
        return (
          `Give me ${countLabel} Senior Salesforce Developer Interview questions and answers. ` +
          `Answers have to be short paragraph. ` +
          `Questions should be scenario based on topics like ${topicsLabel}\n\n` +
          `Difficulty level - ${difficultyLabel}`
        );
      case "Knowledge":
      default:
        return (
          `Give me ${countLabel} Senior Salesforce Developer Interview questions and answers. ` +
          `Answers have to be short paragraph. ` +
          `Cover topics like ${topicsLabel}\n\n` +
          `Difficulty level - ${difficultyLabel}`
        );
    }
  }, [selectedCount, selectedKind, selectedTopics, selectedDifficulties]);

  return (
    <div className="admin-stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h2 className="title" style={{ marginBottom: 0 }}>Add Questions</h2>
        <Link className="btn" href="/admin">Back to Admin Home Page</Link>
      </div>

      <p className="muted" style={{ marginTop: 4 }}>
        Use the question options to stage presets for the upcoming creation workflow. Your selections will carry over
        once the new builder is ready.
      </p>

      <div
        className="card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          border: "1px solid #233453",
          background: "#0d172b",
          maxWidth: 900,
          margin: "0 auto",
          width: "100%"
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>Question Options</span>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>Topics</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {topicsLoading && <span className="muted">Loading topics…</span>}
            {!topicsLoading && topicOptions.length === 0 && (
              <span className="muted">No topics available. Add questions in Supabase first.</span>
            )}
            {!topicsLoading &&
              topicOptions.length > 0 &&
              topicOptions.map((topic) => {
                const isSelected = selectedTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    className="pill"
                    onClick={() => toggleTopic(topic)}
                    aria-pressed={isSelected}
                    style={{
                      background: isSelected ? "#122a1d" : "#16213b",
                      borderColor: isSelected ? "var(--accent)" : "#233453",
                      color: "inherit",
                      cursor: "pointer"
                    }}
                  >
                    {topic}
                  </button>
                );
              })}
          </div>
          {selectedTopics.length > 0 && (
            <span className="muted" style={{ fontSize: 12 }}>
              Selected: {selectedTopics.join(", ")}
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>Difficulty</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DIFFICULTY_CHOICES.map((difficulty) => {
              const isSelected = selectedDifficulties.includes(difficulty);
              return (
                <button
                  key={difficulty}
                  type="button"
                  className="pill"
                  onClick={() => toggleDifficulty(difficulty)}
                  aria-pressed={isSelected}
                  style={{
                    background: isSelected ? "#122a1d" : "#16213b",
                    borderColor: isSelected ? "var(--accent)" : "#233453",
                    color: "inherit",
                    cursor: "pointer"
                  }}
                >
                  {difficulty}
                </button>
              );
            })}
          </div>
          {selectedDifficulties.length > 0 && (
            <span className="muted" style={{ fontSize: 12 }}>
              Selected: {selectedDifficulties.join(", ")}
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>Question type</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {QUESTION_KIND_CHOICES.map((kind) => {
              const isSelected = selectedKind === kind;
              return (
                <label key={kind} style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="question-kind"
                    value={kind}
                    checked={isSelected}
                    onChange={() => handleKindChange(kind)}
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  />
                  <span
                    className="pill"
                    style={{
                      background: isSelected ? "#122a1d" : "#16213b",
                      borderColor: isSelected ? "var(--accent)" : "#233453",
                      padding: "4px 12px"
                    }}
                  >
                    {kind}
                  </span>
                </label>
              );
            })}
          </div>
          {selectedKind && (
            <span className="muted" style={{ fontSize: 12 }}>
              Selected type: {selectedKind}
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>Number of questions</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(selectedKind === "Coding" ? ["1", "2"] : QUESTION_COUNT_CHOICES).map((count) => {
              const isSelected = selectedCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  className="pill"
                  onClick={() => handleCountChange(count)}
                  aria-pressed={isSelected}
                  style={{
                    background: isSelected ? "#122a1d" : "#16213b",
                    borderColor: isSelected ? "var(--accent)" : "#233453",
                    color: "inherit",
                    cursor: "pointer"
                  }}
                >
                  {count}
                </button>
              );
            })}
          </div>
          {selectedCount && (
            <span className="muted" style={{ fontSize: 12 }}>
              Requested count: {selectedCount}
            </span>
          )}
        </div>

        <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end", width: "100%" }}>
          <button className="btn" type="button" onClick={() => void loadTopics()} disabled={topicsLoading}>
            {topicsLoading ? "Refreshing…" : "Refresh Topics"}
          </button>
        </div>

        <span className="muted" style={{ fontSize: 12 }}>
          Builder coming soon — selections will preload the next experience.
        </span>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 className="title" style={{ marginBottom: 0 }}>Gemini Prompt</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Send the generated prompt to Gemini 3 Pro Preview or copy it manually to draft questions tailored to your
          selections.
        </p>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "#0f172a",
            borderRadius: 8,
            padding: 16,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: 14,
            lineHeight: 1.5
          }}
        >{geminiPrompt}</pre>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn primary"
            type="button"
            onClick={sendPromptToGemini}
            disabled={geminiLoading || !geminiPrompt.trim()}
            style={{ marginLeft: "auto" }}
          >
            {geminiLoading ? "Sending…" : "Send Request"}
          </button>
          {geminiError && <span className="muted" style={{ color: "var(--danger, #f87171)" }}>Error: {geminiError}</span>}
        </div>
        {geminiResponse && (
          <div style={responseSectionStyle}>
            <strong>Gemini Response</strong>
            <div className="markdown" style={responsePanelStyle}>
              <ReactMarkdown>{geminiResponse}</ReactMarkdown>
            </div>
          </div>
        )}
        {geminiFollowUpResponse && (
          <div style={responseSectionStyle}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <strong>Supabase Insert Payload</strong>
              <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {followUpCopyError && (
                  <span className="muted" style={{ color: "var(--danger, #f87171)", fontSize: 12 }}>
                    {followUpCopyError}
                  </span>
                )}
                {followUpCopied && !followUpCopyError && (
                  <span className="muted" style={{ fontSize: 12 }}>Copied!</span>
                )}
                <button className="btn" type="button" onClick={() => void handleCopyFollowUp()}>
                  Copy
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => setShowFollowUpPrompt(!showFollowUpPrompt)}
                  disabled={!followUpPromptSent}
                >
                  {showFollowUpPrompt ? "Hide" : "Show"} Follow Up Prompt
                </button>
                <button
                  className="btn success"
                  type="button"
                  onClick={() => void handleInsertIntoSupabase()}
                  disabled={insertStatus.state === "running" || insertStatements.length === 0}
                >
                  {insertStatus.state === "running"
                    ? "Inserting…"
                    : insertStatus.state === "success"
                      ? "Inserted"
                      : "Insert into Supabase"}
                </button>
              </div>
            </div>
            {showFollowUpPrompt && followUpPromptSent && (
              <div style={{ marginTop: 12 }}>
                <strong style={{ fontSize: 14, marginBottom: 8, display: "block" }}>Follow Up Prompt Sent to Gemini</strong>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    background: "#0f172a",
                    borderRadius: 8,
                    padding: 16,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: "#e2e8f0"
                  }}
                >{followUpPromptSent}</pre>
              </div>
            )}
            {insertStatements.length === 0 && geminiFollowUpResponse && (
              <span className="muted" style={{ fontSize: 12 }}>
                No INSERT statements detected. Ask Gemini to return SQL INSERT statements.
              </span>
            )}
            {insertStatus.message && (
              <span
                className="muted"
                style={{ fontSize: 12, color: insertStatus.state === "error" ? "var(--danger, #f87171)" : "var(--muted)" }}
              >
                {insertStatus.message}
              </span>
            )}
            <div
              className="markdown"
              style={{
                ...responsePanelStyle,
                fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
              }}
            >
              <ReactMarkdown>{geminiFollowUpResponse}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
