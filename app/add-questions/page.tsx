"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
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

const AVAILABLE_TOPICS = [
  "SSO and IDP configuration",
  "Connected Apps (OAuth)",
  "IDP JIT Handler",
  "Composite Query experience",
  "Best Practices",
  "Performance improvements",
  "Troubleshooting issues",
  "Agentforce",
  "Apex",
  "LWC",
  "Aura",
  "Triggers",
  "Trigger handlers",
  "Users",
  "Role hierarchy",
  "Sharing rules",
  "Flows",
  "Security",
  "Sales Cloud",
  "Service Cloud",
  "Financial Services Cloud",
  "Named credentials"
];

const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"];
const QUESTION_COUNTS = ["1", "2", "3", "4", "5"];
const QUESTION_TYPES = ["Knowledge", "Scenario", "Coding"];

export default function AddQuestionsPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([introMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingStream, setAwaitingStream] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<string | null>(null);
  const [selectedQuestionType, setSelectedQuestionType] = useState<string | null>(null);

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
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
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
                {AVAILABLE_TOPICS.map((topic) => {
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
              background: "#0d172b",
              maxHeight: 320,
              overflowY: "auto"
            }}
          >
            {messages.map((message) => (
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
              </div>
            ))}
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
              disabled={loading}
            />
            {error && <p className="muted">Error: {error}</p>}
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span className="muted" style={{ fontSize: 12 }}>
                Gemini 2.5 Pro will use your prompt and chat history to craft question drafts.
              </span>
              <button className="btn success" type="submit" disabled={loading}>
                {loading ? "Generating…" : "Generate with Gemini"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
