"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import AdminAccessShell from "@/components/AdminAccessShell";
import type { UseAdminAccessResult } from "@/lib/useAdminAccess";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_TOPIC_OPTIONS = [
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

const DIFFICULTY_CHOICES = ["Easy", "Medium", "Hard"];
const QUESTION_COUNT_CHOICES = ["5", "10"];
const QUESTION_KIND_CHOICES = ["Knowledge", "Scenario", "Coding"];

type GeminiMessage = {
  role: "user" | "assistant";
  content: string;
};

const FOLLOW_UP_PROMPT = `I want to insert the above questions into supabase database. Convert the above questions to the below sql format. don't output anything else

---

with mcq_rows as (
select *
from (
values
(
'Which collection type in Apex maintains insertion order and allows duplicates?',
'List maintains insertion order and allows duplicates. Set does not allow duplicates; Map stores key-value pairs.',
'Apex',
'easy'::public.difficulty_level,
'["List", "Set", "Map", "sObject"]'::jsonb,
0
),
(
'What is the max number of records that a single SOQL query can return?',
'50,000 records per transaction. Use Batch Apex for larger data volumes.',
'SOQL',
'easy'::public.difficulty_level,
'["10,000", "50,000", "100,000", "250,000"]'::jsonb,
1
),
(
'Which trigger context variable holds the list of IDs of records that were deleted?',
'Trigger.old contains the old version of sObjects; Trigger.oldMap maps Id to old records. For delete triggers, use Trigger.old and Trigger.oldMap (there is no Trigger.new).',
'Triggers',
'medium'::public.difficulty_level,
'["Trigger.new", "Trigger.old", "Trigger.newMap", "Trigger.size"]'::jsonb,
1
)
) as t(question_text, explanation, topic, difficulty, choices, correct_choice_index)
),
inserted_questions as (
insert into public.questions (question_text, answer_text, topic, difficulty)
select question_text, explanation, topic, difficulty
from mcq_rows
returning id, question_text, answer_text
)
insert into public.multiple_choice_questions (question_id, choices, correct_choice_index, explanation)
select iq.id, mr.choices, mr.correct_choice_index, mr.explanation
from inserted_questions iq
join mcq_rows mr on mr.question_text = iq.question_text;`;

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

function Content({ ctx: _ctx }: ContentProps) {
  void _ctx;
  const [topics, setTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedCount, setSelectedCount] = useState<string | null>("10");
  const [selectedKind, setSelectedKind] = useState<string | null>("Knowledge");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [geminiResponse, setGeminiResponse] = useState<string>("");
  const [geminiFollowUpResponse, setGeminiFollowUpResponse] = useState<string>("");
  const [followUpCopied, setFollowUpCopied] = useState(false);
  const [followUpCopyError, setFollowUpCopyError] = useState<string | null>(null);

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

  const topicOptions = useMemo(() => {
    const merged = new Set<string>(DEFAULT_TOPIC_OPTIONS);
    topics.forEach((topic) => {
      if (topic) merged.add(topic);
    });
    return Array.from(merged).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [topics]);

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
      setSelectedCount("5");
    } else {
      setSelectedCount("10");
    }
  };

  const handleCountChange = (count: string) => {
    if (selectedKind === "Coding" && count !== "5") return;
    setSelectedCount(count);
  };

  const streamGemini = async (messages: GeminiMessage[], onChunk?: (text: string) => void) => {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
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
    setFollowUpCopied(false);
    setFollowUpCopyError(null);

    try {
      const primaryMessages: GeminiMessage[] = [{ role: "user", content: geminiPrompt }];
      const primary = await streamGemini(primaryMessages, (text) => setGeminiResponse(text));

      if (!primary.trim()) {
        throw new Error("Gemini returned an empty reply.");
      }

      setGeminiResponse(primary);

      const followUpMessages: GeminiMessage[] = [
        { role: "user", content: geminiPrompt },
        { role: "assistant", content: primary },
        { role: "user", content: FOLLOW_UP_PROMPT }
      ];

      const followUp = await streamGemini(followUpMessages);
      setGeminiFollowUpResponse(followUp);
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
            {topicOptions.map((topic) => {
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
            {QUESTION_COUNT_CHOICES.map((count) => {
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
          Send the generated prompt to Gemini 2.5 Pro or copy it manually to draft questions tailored to your
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
          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 12 }}>
            <strong style={{ display: "block", marginBottom: 8 }}>Gemini Response</strong>
            <div style={{ lineHeight: 1.6 }}>
              <ReactMarkdown>{geminiResponse}</ReactMarkdown>
            </div>
          </div>
        )}
        {geminiFollowUpResponse && (
          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 12 }}>
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
              </div>
            </div>
            <div style={{ lineHeight: 1.6, overflowX: "auto" }}>
              <ReactMarkdown>{geminiFollowUpResponse}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
