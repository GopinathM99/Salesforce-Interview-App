"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type SqlExecutionStatus = {
  state: "idle" | "running" | "success" | "error";
  message?: string;
};

const createId = () => crypto.randomUUID();

const LoadingDots = () => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setFrame((previous) => (previous + 1) % 3);
    }, 400);

    return () => window.clearInterval(interval);
  }, []);

  const dots = [".", "..", "..."][frame];

  return (
    <span role="status" aria-live="polite" style={{ minWidth: "6ch", display: "inline-block" }}>
      {`Thinking${dots}`}
    </span>
  );
};

type EventBoundary = { index: number; length: number };

const findEventBoundary = (input: string): EventBoundary | null => {
  const candidates: EventBoundary[] = [];
  const indexCRLF = input.indexOf("\r\n\r\n");
  if (indexCRLF !== -1) candidates.push({ index: indexCRLF, length: 4 });
  const indexNN = input.indexOf("\n\n");
  if (indexNN !== -1) candidates.push({ index: indexNN, length: 2 });
  const indexRR = input.indexOf("\r\r");
  if (indexRR !== -1) candidates.push({ index: indexRR, length: 2 });

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((lowest, candidate) =>
    candidate.index < lowest.index ? candidate : lowest
  );
};

const mergeText = (existing: string, incoming: string) => {
  if (!incoming) {
    return existing;
  }

  if (!existing) {
    return incoming;
  }

  if (incoming.startsWith(existing)) {
    return incoming;
  }

  if (existing.startsWith(incoming)) {
    return existing;
  }

  const maxOverlap = Math.min(existing.length, incoming.length);
  for (let i = maxOverlap; i > 0; i -= 1) {
    if (existing.slice(existing.length - i) === incoming.slice(0, i)) {
      return `${existing}${incoming.slice(i)}`;
    }
  }

  return `${existing}${incoming}`;
};

const introMessage: ChatMessage = {
  id: "intro",
  role: "assistant",
  content:
    "Hi! I can help you brainstorm and refine Salesforce interview questions. Share the topic, desired difficulty, or context, and I will draft questions with answers you can add to Supabase."
};

const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"];
const QUESTION_COUNTS = ["1", "2", "3", "4", "5"];
const QUESTION_TYPES = ["Knowledge", "Scenario", "Coding"];
const DAILY_LIMIT = 3;

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
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
      if (/^insert\s+into\s+/i.test(normalized)) {
        statements.push(statement.endsWith(";") ? statement : `${statement};`);
      }
    });
  }

  return statements;
};

export default function AddQuestionsPage() {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([introMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingStream, setAwaitingStream] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<string | null>(null);
  const [selectedQuestionType, setSelectedQuestionType] = useState<string | null>(null);
  const [attemptsToday, setAttemptsToday] = useState<number | null>(null);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [sqlStatuses, setSqlStatuses] = useState<Record<string, SqlExecutionStatus>>({});
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null);

  const limitReached = (attemptsToday ?? 0) >= DAILY_LIMIT;
  const attemptsRemaining = Math.max(DAILY_LIMIT - (attemptsToday ?? 0), 0);

  const sqlStatementsByMessage = useMemo(() => {
    const map = new Map<string, string[]>();
    messages.forEach((message) => {
      if (message.role !== "assistant") {
        return;
      }
      const statements = extractInsertStatements(message.content);
      if (statements.length > 0) {
        map.set(message.id, statements);
      }
    });
    return map;
  }, [messages]);

  const handleExecuteSql = useCallback(
    async (messageId: string) => {
      const statements = sqlStatementsByMessage.get(messageId);
      if (!statements || statements.length === 0) {
        return;
      }

      if (isAdmin === false) {
        setSqlStatuses((previous) => ({
          ...previous,
          [messageId]: {
            state: "error",
            message: "Only admin users can insert records. Contact an administrator to proceed."
          }
        }));
        return;
      }

      if (isAdmin === null) {
        setSqlStatuses((previous) => ({
          ...previous,
          [messageId]: {
            state: "error",
            message: "Verifying your admin access. Please try again in a moment."
          }
        }));
        return;
      }

      if (!session?.access_token) {
        setSqlStatuses((previous) => ({
          ...previous,
          [messageId]: { state: "error", message: "Missing session. Sign in again to insert records." }
        }));
        return;
      }

      setSqlStatuses((previous) => ({
        ...previous,
        [messageId]: { state: "running" }
      }));

      try {
        const response = await fetch("/api/admin/execute-sql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            statements: statements.map((statement) => statement.replace(/;+$/g, "").trim())
          })
        });

        const data = (await response.json()) as { error?: string; success?: boolean; executed?: number };

        if (!response.ok || data?.success !== true) {
          const message = data?.error || "Failed to insert statements.";
          setSqlStatuses((previous) => ({
            ...previous,
            [messageId]: { state: "error", message }
          }));
          return;
        }

        setSqlStatuses((previous) => ({
          ...previous,
          [messageId]: {
            state: "success",
            message: data.executed ? `Inserted ${data.executed} statement${data.executed === 1 ? "" : "s"}.` : "Insert complete."
          }
        }));
      } catch (insertError) {
        const message = insertError instanceof Error ? insertError.message : "Unexpected error inserting records.";
        setSqlStatuses((previous) => ({
          ...previous,
          [messageId]: { state: "error", message }
        }));
      }
    },
    [isAdmin, session?.access_token, sqlStatementsByMessage]
  );

  useEffect(() => {
    if (!user) {
      setAttemptsToday(null);
      setAttemptsLoading(false);
      return;
    }

    const loadAttempts = async () => {
      setAttemptsLoading(true);
      const { start, end } = getTodayRange();
      const { count, error } = await supabase
        .from("gemini_usage_logs")
        .select("id", { count: "exact", head: true })
        .gte("used_at", start)
        .lt("used_at", end);
      if (error) {
        console.error("Failed to load Gemini usage", error);
        setAttemptsToday(0);
      } else {
        setAttemptsToday(count ?? 0);
      }
      setAttemptsLoading(false);
    };

    void loadAttempts();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setAdminCheckError(null);
      return;
    }

    const verifyAdmin = async () => {
      setAdminCheckError(null);
      setIsAdmin(null);
      const { data, error } = await supabase.rpc("is_admin");
      if (error) {
        console.error("Failed to confirm admin access", error);
        setAdminCheckError("Could not confirm admin access. Only admins can insert SQL from Gemini.");
        setIsAdmin(false);
        return;
      }

      setIsAdmin(Boolean(data));
    };

    void verifyAdmin();
  }, [user]);

  useEffect(() => {
    const loadTopics = async () => {
      setTopicsLoading(true);
      const { data, error } = await supabase.rpc("list_topics");
      if (error) {
        console.error("Failed to load topics", error);
        setAvailableTopics([]);
      } else {
        const sorted = Array.from(
          new Set(((data as string[]) ?? []).filter((topic): topic is string => Boolean(topic)))
        ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
        setAvailableTopics(sorted);
      }
      setTopicsLoading(false);
    };

    void loadTopics();
  }, []);

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

  const handleQuestionTypeChange = (type: string) => {
    setSelectedQuestionType(type);
    if (type === "Coding") {
      setSelectedQuestionCount("1");
    }
  };

  const handleQuestionCountChange = (count: string) => {
    if (selectedQuestionType === "Coding" && count !== "1") {
      return;
    }
    setSelectedQuestionCount(count);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    const trimmedInput = input.trim();
    if (
      !trimmedInput &&
      selectedTopics.length === 0 &&
      selectedDifficulties.length === 0 &&
      !selectedQuestionCount &&
      !selectedQuestionType
    ) {
      return;
    }

    if (!user) {
      setError("Log in to use the Gemini chat builder.");
      return;
    }

    if (!session?.access_token) {
      setError("Could not verify your session. Please sign out and log back in.");
      return;
    }

    if (attemptsLoading) {
      setError("Checking your daily limit. Please try again in a moment.");
      return;
    }

    const { start, end } = getTodayRange();
    const { count: latestCount, error: countError } = await supabase
      .from("gemini_usage_logs")
      .select("id", { count: "exact", head: true })
      .gte("used_at", start)
      .lt("used_at", end);

    if (countError) {
      setError("Could not verify your remaining attempts. Please try again shortly.");
      return;
    }

    if ((latestCount ?? 0) >= DAILY_LIMIT) {
      setAttemptsToday(latestCount ?? 0);
      setError(
        "Max 3 attempts have been reached. Please try again tomorrow for more questions or try Flash Cards or Multiple Choice Questions."
      );
      return;
    }
    const nextCount = (latestCount ?? 0) + 1;

    const promptSections: string[] = [];
    if (selectedTopics.length) {
      promptSections.push(`Focus on these Salesforce topics: ${selectedTopics.join(", ")}.`);
    }
    if (selectedDifficulties.length) {
      promptSections.push(`Target difficulty: ${selectedDifficulties.join(", ")}.`);
    }
    if (selectedQuestionCount) {
      const count = Number.parseInt(selectedQuestionCount, 10);
      const plural = count === 1 ? "question" : "questions";
      promptSections.push(`Generate ${selectedQuestionCount} ${plural}.`);
    }
    if (selectedQuestionType) {
      promptSections.push(`Question style: ${selectedQuestionType}.`);
    }
    if (trimmedInput) {
      promptSections.push(trimmedInput);
    }

    const synthesizedInput = promptSections.join("\n\n");

    const userEntry: ChatMessage = { id: createId(), role: "user", content: synthesizedInput };
    const nextMessages = [...messages, userEntry];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);
    setAwaitingStream(true);

    let assistantId: string | null = null;
    let awaitingFirstChunk = true;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "text/event-stream"
      };
      const accessToken = session?.access_token;
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content }))
        })
      });

      if (!response.ok) {
        let detail = `Gemini request failed: ${response.status}`;
        try {
          const data = (await response.json()) as { error?: string };
          if (data?.error) {
            detail = data.error;
          }
        } catch (parseError) {
          console.warn("Failed to parse Gemini error response", parseError);
        }
        throw new Error(detail);
      }

      setAttemptsToday(nextCount);

      if (!response.body) {
        throw new Error("Gemini returned an empty stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let streamComplete = false;

      const processEvent = (rawEvent: string) => {
        const normalizedEvent = rawEvent.replace(/\r/g, "");

        if (!normalizedEvent.trim()) {
          return false;
        }

        const dataLines = normalizedEvent
          .split("\n")
          .map((line) => line.trimEnd())
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart());

        if (dataLines.length === 0) {
          return false;
        }

        const payloadText = dataLines.join("");
        if (!payloadText) {
          return false;
        }

        let payload: { text?: string; error?: string; done?: boolean };
        try {
          payload = JSON.parse(payloadText);
        } catch (parseError) {
          console.error("Gemini stream parse error", parseError, payloadText);
          return false;
        }

        if (payload.error) {
          throw new Error(payload.error);
        }

        if (typeof payload.text === "string") {
          fullText = mergeText(fullText, payload.text);
        }

        if (fullText) {
          if (!assistantId) {
            const newId = createId();
            assistantId = newId;
            setMessages((prev) => [
              ...prev,
              { id: newId, role: "assistant", content: fullText }
            ]);
          } else {
            const updatedText = fullText;
            const idToUpdate = assistantId;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === idToUpdate ? { ...message, content: updatedText } : message
              )
            );
          }

          if (awaitingFirstChunk) {
            setAwaitingStream(false);
            awaitingFirstChunk = false;
          }
        }

        if (payload.done) {
          return true;
        }

        return false;
      };

      const drainBuffer = (flush = false) => {
        while (true) {
          const boundary = findEventBoundary(buffer);
          if (boundary) {
            const rawEvent = buffer.slice(0, boundary.index);
            buffer = buffer.slice(boundary.index + boundary.length);

            if (!rawEvent.trim()) {
              continue;
            }

            const finished = processEvent(rawEvent);
            if (finished) {
              streamComplete = true;
              buffer = "";
              break;
            }
          } else {
            if (flush && buffer.trim()) {
              const finished = processEvent(buffer);
              buffer = "";
              if (finished) {
                streamComplete = true;
              }
            }
            break;
          }
        }
      };

      while (!streamComplete) {
        const { value, done } = await reader.read();

        if (done) {
          buffer += decoder.decode();
          streamComplete = true;
        } else if (value) {
          buffer += decoder.decode(value, { stream: true });
        }

        drainBuffer();
      }

      drainBuffer(true);

      if (!fullText.trim()) {
        throw new Error("Gemini returned an empty reply.");
      }
    } catch (geminiError) {
      const message =
        geminiError instanceof Error ? geminiError.message : "Unexpected Gemini error.";
      setError(message);
      const fallback = "I ran into a problem generating a suggestion. Please try again.";
      if (assistantId) {
        const idToUpdate = assistantId;
        setMessages((prev) =>
          prev.map((chatMessage) =>
            chatMessage.id === idToUpdate ? { ...chatMessage, content: fallback } : chatMessage
          )
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            content: fallback
          }
        ]);
      }
    } finally {
      setLoading(false);
      setAwaitingStream(false);
    }
  };

  const hint = useMemo(
    () =>
      "Tip: Pick the options above the prompt to set topics, difficulty, type, and count before you add extra context.",
    []
  );

  return (
    <div className="grid">
      <div className="card" style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="title" style={{ marginBottom: 0 }}>AI Question Builder</h2>
          <Link className="btn" href="/">Back to Home</Link>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>{hint}</p>
        {user && (
          <p className="muted" style={{ marginTop: 4 }}>
            {attemptsLoading
              ? "Checking remaining attempts…"
              : `You have ${attemptsRemaining} of ${DAILY_LIMIT} Gemini requests left today.`}
          </p>
        )}
        {!user && (
          <p
            style={{
              marginTop: 4,
              color: "#1F2937",
              backgroundColor: "#FDE68A",
              fontStyle: "italic",
              fontWeight: 600,
              padding: "6px 10px",
              borderRadius: 6,
              display: "inline-block"
            }}
          >
            Log in to try this out and brainstorm fresh questions.
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              border: "1px solid #233453",
              borderRadius: 12,
              background: "#0d172b",
              padding: 16
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, width: "100%" }}>Question Options</span>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 14, color: "var(--muted)" }}>Topics</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {topicsLoading && <span className="muted">Loading topics…</span>}
                {!topicsLoading && availableTopics.length === 0 && (
                  <span className="muted">No topics available. Add questions in Supabase first.</span>
                )}
                {!topicsLoading &&
                  availableTopics.length > 0 &&
                  availableTopics.map((topic) => {
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

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 14, color: "var(--muted)" }}>Difficulty</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DIFFICULTY_LEVELS.map((difficulty) => {
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

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 14, color: "var(--muted)" }}>Question type</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {QUESTION_TYPES.map((type) => {
                  const isSelected = selectedQuestionType === type;
                  return (
                    <label
                      key={type}
                      style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}
                    >
                      <input
                        type="radio"
                        name="question-type"
                        value={type}
                        checked={isSelected}
                        onChange={() => handleQuestionTypeChange(type)}
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
                        {type}
                      </span>
                    </label>
                  );
                })}
              </div>
              {selectedQuestionType && (
                <span className="muted" style={{ fontSize: 12 }}>
                  Selected type: {selectedQuestionType}
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 14, color: "var(--muted)" }}>Number of questions</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {QUESTION_COUNTS.map((count) => {
                  const isSelected = selectedQuestionCount === count;
                  const disabled = selectedQuestionType === "Coding" && count !== "1";
                  return (
                    <label
                      key={count}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.5 : 1
                      }}
                    >
                      <input
                        type="radio"
                        name="question-count"
                        value={count}
                        checked={isSelected}
                        onChange={() => handleQuestionCountChange(count)}
                        disabled={disabled}
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
                        {count}
                      </span>
                    </label>
                  );
                })}
              </div>
              {selectedQuestionCount && (
                <span className="muted" style={{ fontSize: 12 }}>
                  Selected count: {selectedQuestionCount}
                  {selectedQuestionType === "Coding" ? " (Coding questions are limited to 1)." : ""}
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 8,
              padding: 16,
              border: "1px solid #233453",
              borderRadius: 12,
              background: "#0d172b"
            }}
          >
            {messages.map((message) => {
              const statements = sqlStatementsByMessage.get(message.id) ?? [];
              const status = sqlStatuses[message.id];
              const isAssistant = message.role === "assistant";
              const hasSql = isAssistant && statements.length > 0;
              const running = status?.state === "running";
              const succeeded = status?.state === "success";

              return (
                <div key={message.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span
                    className="pill"
                    style={{
                      alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                      background: message.role === "user" ? "#1b2b46" : "#0f3323"
                    }}
                  >
                    {message.role === "user" ? "You" : "Gemini"}
                  </span>
                  <div
                    className="markdown"
                    style={{
                      alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                      background: message.role === "user" ? "#16213b" : "#122a1d",
                      border: "1px solid #233453",
                      borderRadius: 12,
                      padding: "10px 14px",
                      maxWidth: "100%",
                      wordBreak: "break-word"
                    }}
                  >
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  {hasSql && (
                    <div
                      style={{
                        alignSelf: "flex-start",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        background: "#0f1c32",
                        border: "1px solid #233453",
                        borderRadius: 12,
                        padding: "10px 14px",
                        maxWidth: "100%"
                      }}
                    >
                      <span className="muted" style={{ fontSize: 12 }}>
                        Gemini suggested {statements.length} INSERT statement
                        {statements.length === 1 ? "" : "s"}. Review them below, then click the button to run them in Supabase.
                      </span>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          background: "#0b1322",
                          border: "1px solid #1f2f4a",
                          borderRadius: 8,
                          padding: 10,
                          maxWidth: "100%"
                        }}
                      >
                        {statements.map((statement, index) => (
                          <code
                            key={`${message.id}-sql-${index}`}
                            style={{
                              display: "block",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              fontSize: 12,
                              color: "#d6e4ff"
                            }}
                          >
                            {statement}
                          </code>
                        ))}
                      </div>
                      {adminCheckError ? (
                        <span className="muted" style={{ fontSize: 12, color: "#f69988" }}>
                          {adminCheckError}
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn success"
                            onClick={() => handleExecuteSql(message.id)}
                            disabled={running || succeeded || isAdmin !== true}
                            style={{ alignSelf: "flex-start" }}
                          >
                            {running
                              ? "Inserting…"
                              : succeeded
                                ? "Inserted"
                                : isAdmin === null
                                  ? "Checking admin access…"
                                  : "Insert into Supabase"}
                          </button>
                          {isAdmin === false && (
                            <span className="muted" style={{ fontSize: 12, color: "#f69988" }}>
                              Only admin users can run these statements. Ask an administrator to sign in to execute them.
                            </span>
                          )}
                        </>
                      )}
                      {status?.message && (
                        <span
                          className="muted"
                          style={{ fontSize: 12, color: status.state === "error" ? "#f69988" : "var(--muted)" }}
                        >
                          {status.message}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {awaitingStream && (
              <div key="loading" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="pill" style={{ alignSelf: "flex-start", background: "#0f3323" }}>
                  Gemini
                </span>
                <div
                  style={{
                    alignSelf: "flex-start",
                    background: "#122a1d",
                    border: "1px solid #233453",
                    borderRadius: 12,
                    padding: "10px 14px",
                    maxWidth: "100%",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word"
                  }}
                >
                  <LoadingDots />
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              borderTop: "1px solid #233453",
              paddingTop: 16
            }}
          >
            <label htmlFor="prompt">What do you need Gemini to generate?</label>
            <textarea
              id="prompt"
              rows={4}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Example: Draft a medium difficulty Salesforce Flow scenario question with multiple choice answers."
              disabled={loading || limitReached || !user || attemptsLoading}
            />
            {error && <p className="muted">Error: {error}</p>}
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span className="muted" style={{ fontSize: 12 }}>
                Gemini 2.5 Pro will use your prompt and chat history to craft question drafts.
              </span>
              <button
                className="btn success"
                type="submit"
                disabled={loading || limitReached || !user || attemptsLoading}
              >
                {loading
                  ? "Generating…"
                  : limitReached
                    ? "Daily Limit Reached"
                    : "Generate with Gemini"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
