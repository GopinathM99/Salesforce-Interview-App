"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/components/AuthProvider";
import type { InspirationQuestion } from "@/lib/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

type SessionStatus = "idle" | "active" | "ended";

const ROLE_OPTIONS = [
  "Salesforce Developer",
  "Salesforce Admin",
  "Salesforce Architect",
  "Salesforce Consultant"
];

const DEFAULT_QUESTION_COUNT = 5;
const QUESTION_COUNT_MIN = 1;
const QUESTION_COUNT_MAX = 10;

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};


const normalizeQuestionCount = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_QUESTION_COUNT;
  const rounded = Math.round(value);
  return Math.min(QUESTION_COUNT_MAX, Math.max(QUESTION_COUNT_MIN, rounded));
};

const buildInterviewerSystemPrompt = (options: {
  role: string;
  interviewType: string;
  level: string;
  topics?: string[];
  questionCount: number;
  questionsAsked: number;
  isFirstMessage: boolean;
  inspirationQuestions?: InspirationQuestion[];
}) => {
  const topicsLine = options.topics?.length
    ? `Focus on these topics: ${options.topics.join(", ")}.`
    : "";

  const questionProgress = options.isFirstMessage
    ? `You will ask ${options.questionCount} questions total.`
    : `This is question ${options.questionsAsked + 1} of ${options.questionCount}.`;

  const isLastQuestion = options.questionsAsked + 1 >= options.questionCount;
  const closingInstruction = isLastQuestion
    ? "This is the last question. After the candidate answers, provide final feedback and a brief summary of their performance, then conclude the interview."
    : "After the candidate answers, provide brief constructive feedback (2-3 bullet points) with a score out of 5, then ask the next question.";

  // Build inspiration section from database questions
  let inspirationSection = "";
  if (options.inspirationQuestions && options.inspirationQuestions.length > 0) {
    const conceptsList = options.inspirationQuestions
      .map((q, i) => `${i + 1}. [${q.topic}/${q.question_type}] ${q.question_text}`)
      .join("\n");

    inspirationSection = `
REFERENCE QUESTIONS FOR INSPIRATION:
The following are sample questions from our database covering key concepts. Use these as INSPIRATION ONLY - create your own original questions that test similar concepts but are phrased differently:

${conceptsList}

IMPORTANT: Do NOT repeat these questions verbatim. Instead:
- Identify the underlying concept being tested
- Create a new, original question that evaluates the same knowledge area
- Adapt the difficulty and framing to match the candidate's ${options.level} experience level
- You may combine concepts from multiple reference questions into one integrated question
`;
  } else if (options.interviewType !== "behavioral" && options.topics?.length) {
    inspirationSection = `
Note: No specific reference questions available for the selected topics. Generate original questions based on your knowledge of ${options.topics.join(", ")} concepts appropriate for a ${options.level} level candidate.
`;
  }

  return `You are a professional Salesforce interviewer conducting a mock interview for a ${options.role} position at the ${options.level} level.

Interview type: ${options.interviewType}
${topicsLine}
${questionProgress}
${inspirationSection}
Instructions:
- Be professional, encouraging, and constructive
- Ask one question at a time and wait for the candidate's response
- Keep questions concise (1-3 sentences)
- ${closingInstruction}
- Tailor questions to the ${options.level} experience level
- For feedback, be specific about what was good and what could be improved
- Score answers from 0-5 based on accuracy, completeness, and clarity

${options.isFirstMessage ? "Start by welcoming the candidate and asking your first interview question." : ""}`;
};

export default function LiveAgentChatPage() {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{
    role: string;
    interview_type: string;
    level?: string;
    topics?: string[];
    question_count?: number;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState("Salesforce Developer");
  const [customRole, setCustomRole] = useState("");
  const [selectedInterviewType, setSelectedInterviewType] = useState("mixed");
  const [selectedLevel, setSelectedLevel] = useState("Mid-level");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [inspirationQuestions, setInspirationQuestions] = useState<InspirationQuestion[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Fetch available topics from Supabase
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await fetch("/api/topics");
        if (response.ok) {
          const data = await response.json();
          setAvailableTopics(data.topics || []);
        }
      } catch (error) {
        console.error("Failed to fetch topics", error);
      } finally {
        setTopicsLoading(false);
      }
    };
    void fetchTopics();
  }, []);

  const persistMessage = useCallback(
    async ({
      role,
      content,
      source,
      metadata
    }: {
      role: "user" | "assistant" | "system";
      content: string;
      source: "text" | "audio" | "transcript";
      metadata?: Record<string, unknown>;
    }) => {
      const sessionIdValue = sessionIdRef.current;
      if (!sessionIdValue || !session?.access_token) return;
      try {
        await fetch("/api/live-agent/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            session_id: sessionIdValue,
            role,
            content,
            source,
            metadata: metadata ?? {}
          })
        });
      } catch (persistError) {
        console.error("Failed to persist message", persistError);
      }
    },
    [session?.access_token]
  );

  const endSessionRecord = useCallback(
    async (status: string) => {
      const sessionIdValue = sessionIdRef.current;
      if (!sessionIdValue || !session?.access_token) return;
      try {
        await fetch("/api/live-agent/session", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            session_id: sessionIdValue,
            status
          })
        });
      } catch (persistError) {
        console.error("Failed to close live session", persistError);
      }
    },
    [session?.access_token]
  );

  const callGeminiStream = useCallback(
    async (
      messages: Array<{ role: "user" | "assistant"; content: string }>,
      onChunk: (text: string) => void,
      onDone: (fullText: string) => void,
      onError: (error: string) => void
    ) => {
      if (!session?.access_token) {
        onError("Not authenticated");
        return;
      }

      abortControllerRef.current = new AbortController();
      let fullText = "";

      try {
        const response = await fetch("/api/gemini", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            messages,
            model: "flash"
          }),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          onError(errorData.error || "Failed to get response from AI");
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          onError("No response stream available");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.error) {
                onError(parsed.error);
                return;
              }
              if (parsed.done) {
                onDone(fullText);
                return;
              }
              if (parsed.text) {
                fullText += parsed.text;
                onChunk(parsed.text);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }

        onDone(fullText);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        onError(err instanceof Error ? err.message : "Failed to communicate with AI");
      }
    },
    [session?.access_token]
  );

  const fetchInspirationQuestions = useCallback(
    async (
      topics: string[],
      level: string,
      interviewType: string,
      count: number
    ): Promise<InspirationQuestion[]> => {
      if (!session?.access_token) return [];

      // Skip fetching for behavioral interviews - AI generates these
      if (interviewType === "behavioral") return [];

      try {
        const response = await fetch("/api/live-agent/questions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            topics,
            level,
            interview_type: interviewType,
            question_count: count
          })
        });

        if (!response.ok) {
          console.warn("Failed to fetch inspiration questions:", response.status);
          return [];
        }

        const data = await response.json();
        return data.questions || [];
      } catch (err) {
        console.warn("Error fetching inspiration questions:", err);
        return [];
      }
    },
    [session?.access_token]
  );

  const startSession = useCallback(async () => {
    if (!session?.access_token) {
      setError("Please sign in to start a chat session.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const roleToSend = selectedRole === "custom" ? customRole.trim() : selectedRole;
      const topicsToSend = selectedTopics;
      const questionCountToSend = normalizeQuestionCount(questionCount);

      // Fetch inspiration questions from database
      const fetchedQuestions = await fetchInspirationQuestions(
        topicsToSend,
        selectedLevel,
        selectedInterviewType,
        questionCountToSend
      );
      setInspirationQuestions(fetchedQuestions);

      const sessionRecordResponse = await fetch("/api/live-agent/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          role: roleToSend || "Salesforce Developer",
          interview_type: selectedInterviewType,
          level: selectedLevel,
          model: "gemini-3-flash",
          metadata: {
            source: "chat",
            topics: topicsToSend,
            question_count: questionCountToSend
          }
        })
      });

      const sessionRecordPayload = await sessionRecordResponse.json().catch(() => null);
      if (sessionRecordResponse.ok && sessionRecordPayload?.session?.id) {
        setSessionId(sessionRecordPayload.session.id);
        sessionIdRef.current = sessionRecordPayload.session.id;
      } else {
        throw new Error(sessionRecordPayload?.error || "Failed to create session.");
      }

      const newSessionInfo = {
        role: roleToSend || "Salesforce Developer",
        interview_type: selectedInterviewType,
        level: selectedLevel,
        topics: topicsToSend.length > 0 ? topicsToSend : undefined,
        question_count: questionCountToSend
      };
      setSessionInfo(newSessionInfo);
      setStatus("active");
      setMessages([]);
      setConversationHistory([]);
      setQuestionsAsked(0);

      // Build system prompt and get first question from Gemini
      const systemPrompt = buildInterviewerSystemPrompt({
        role: roleToSend || "Salesforce Developer",
        interviewType: selectedInterviewType,
        level: selectedLevel,
        topics: topicsToSend.length > 0 ? topicsToSend : undefined,
        questionCount: questionCountToSend,
        questionsAsked: 0,
        isFirstMessage: true,
        inspirationQuestions: fetchedQuestions
      });

      const assistantMessageId = makeId();
      setMessages([{ id: assistantMessageId, role: "assistant", content: "", streaming: true }]);

      await callGeminiStream(
        [{ role: "user", content: systemPrompt }],
        (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        (fullText) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullText, streaming: false }
                : msg
            )
          );
          setConversationHistory([
            { role: "user", content: systemPrompt },
            { role: "assistant", content: fullText }
          ]);
          setQuestionsAsked(1);
          void persistMessage({ role: "assistant", content: fullText, source: "text" });
          setIsLoading(false);
        },
        (error) => {
          setError(error);
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error("Failed to start chat session", err);
      setError(err instanceof Error ? err.message : "Failed to start chat session.");
      setIsLoading(false);
    }
  }, [
    callGeminiStream,
    customRole,
    fetchInspirationQuestions,
    selectedTopics,
    persistMessage,
    questionCount,
    selectedInterviewType,
    selectedLevel,
    selectedRole,
    session?.access_token
  ]);

  const endSession = useCallback(() => {
    void endSessionRecord("ended");
    setStatus("ended");

    const wrapUpMessage = `Thank you for completing this mock interview session! You answered ${questionsAsked} question${questionsAsked !== 1 ? "s" : ""}. Review the transcript above to see your responses. Good luck with your Salesforce interview!`;
    setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: wrapUpMessage }]);
  }, [endSessionRecord, questionsAsked]);

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading || status !== "active" || !sessionInfo) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { id: makeId(), role: "user", content: userMessage }]);
    void persistMessage({ role: "user", content: userMessage, source: "text" });

    setIsLoading(true);

    try {
      const currentQuestionCount = sessionInfo.question_count ?? DEFAULT_QUESTION_COUNT;
      const isLastQuestion = questionsAsked >= currentQuestionCount;

      // Build context prompt for this turn
      const contextPrompt = buildInterviewerSystemPrompt({
        role: sessionInfo.role,
        interviewType: sessionInfo.interview_type,
        level: sessionInfo.level || "Mid-level",
        topics: sessionInfo.topics,
        questionCount: currentQuestionCount,
        questionsAsked: questionsAsked,
        isFirstMessage: false,
        inspirationQuestions: inspirationQuestions
      });

      // Build messages array with conversation history
      const messagesForGemini: Array<{ role: "user" | "assistant"; content: string }> = [
        ...conversationHistory,
        { role: "user", content: `[Context: ${contextPrompt}]\n\nCandidate's answer: ${userMessage}` }
      ];

      const assistantMessageId = makeId();
      setMessages((prev) => [...prev, { id: assistantMessageId, role: "assistant", content: "", streaming: true }]);

      await callGeminiStream(
        messagesForGemini,
        (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        (fullText) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullText, streaming: false }
                : msg
            )
          );

          // Update conversation history
          setConversationHistory((prev) => [
            ...prev,
            { role: "user", content: userMessage },
            { role: "assistant", content: fullText }
          ]);

          if (isLastQuestion) {
            setStatus("ended");
            void endSessionRecord("ended");
          } else {
            setQuestionsAsked((prev) => prev + 1);
          }

          void persistMessage({ role: "assistant", content: fullText, source: "text" });
          setIsLoading(false);
        },
        (error) => {
          setError(error);
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error("Failed to process message", err);
      setError("Failed to process your response. Please try again.");
      setIsLoading(false);
    }
  }, [
    callGeminiStream,
    conversationHistory,
    endSessionRecord,
    inputValue,
    inspirationQuestions,
    isLoading,
    persistMessage,
    questionsAsked,
    sessionInfo,
    status
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedRole = window.localStorage.getItem("live_agent_role");
    const storedCustomRole = window.localStorage.getItem("live_agent_custom_role");
    const storedType = window.localStorage.getItem("live_agent_type");
    const storedLevel = window.localStorage.getItem("live_agent_level");
    const storedTopics = window.localStorage.getItem("live_agent_topics");
    const storedQuestionCount = window.localStorage.getItem("live_agent_question_count");

    if (storedRole) setSelectedRole(storedRole);
    if (storedCustomRole) setCustomRole(storedCustomRole);
    if (storedType) setSelectedInterviewType(storedType);
    if (storedLevel) setSelectedLevel(storedLevel);
    if (storedTopics) {
      try {
        const parsed = JSON.parse(storedTopics);
        if (Array.isArray(parsed)) {
          setSelectedTopics(parsed);
        }
      } catch {
        // Ignore invalid JSON
      }
    }
    if (storedQuestionCount) {
      const parsedCount = Number.parseInt(storedQuestionCount, 10);
      if (Number.isFinite(parsedCount)) {
        setQuestionCount(normalizeQuestionCount(parsedCount));
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("live_agent_role", selectedRole);
    window.localStorage.setItem("live_agent_custom_role", customRole);
    window.localStorage.setItem("live_agent_type", selectedInterviewType);
    window.localStorage.setItem("live_agent_level", selectedLevel);
    window.localStorage.setItem("live_agent_topics", JSON.stringify(selectedTopics));
    window.localStorage.setItem("live_agent_question_count", String(questionCount));
  }, [selectedRole, customRole, selectedInterviewType, selectedLevel, selectedTopics, questionCount]);

  const clearSavedSettings = useCallback(() => {
    setSelectedRole("Salesforce Developer");
    setCustomRole("");
    setSelectedInterviewType("mixed");
    setSelectedLevel("Mid-level");
    setSelectedTopics([]);
    setQuestionCount(DEFAULT_QUESTION_COUNT);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("live_agent_role");
      window.localStorage.removeItem("live_agent_custom_role");
      window.localStorage.removeItem("live_agent_type");
      window.localStorage.removeItem("live_agent_level");
      window.localStorage.removeItem("live_agent_topics");
      window.localStorage.removeItem("live_agent_question_count");
    }
  }, []);

  const resetSession = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus("idle");
    setMessages([]);
    setConversationHistory([]);
    setSessionId(null);
    sessionIdRef.current = null;
    setSessionInfo(null);
    setQuestionsAsked(0);
    setError(null);
    setInspirationQuestions([]);
  }, []);

  const isRoleValid = selectedRole !== "custom" || customRole.trim().length > 1;

  return (
    <div className="grid">
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 className="title">Live Chat Interview</h2>
          <Link className="btn back-btn" href="/live-agent">
            Back to Live Agent
          </Link>
        </div>
        <p>
          Practice mock interviews by typing your responses. Get feedback and practice articulating your answers.
        </p>

        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <span
            className="pill"
            style={{
              background:
                status === "active"
                  ? "rgba(16, 185, 129, 0.2)"
                  : status === "ended"
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(148, 163, 184, 0.2)",
              borderColor:
                status === "active"
                  ? "rgba(16, 185, 129, 0.5)"
                  : status === "ended"
                  ? "rgba(139, 92, 246, 0.5)"
                  : "rgba(148, 163, 184, 0.4)",
              color:
                status === "active"
                  ? "#10b981"
                  : status === "ended"
                  ? "#a78bfa"
                  : "#cbd5e1",
              fontWeight: 600
            }}
          >
            Status: {status === "idle" ? "Ready" : status === "active" ? "In Progress" : "Completed"}
          </span>
          {status === "active" && sessionInfo?.question_count && (
            <span className="pill pill-soft">
              Question {questionsAsked} of {sessionInfo.question_count}
            </span>
          )}
          {status === "idle" && (
            <button
              className="btn"
              onClick={clearSavedSettings}
              style={{ marginLeft: "auto", padding: "10px 12px", background: "rgba(59, 130, 246, 0.35)" }}
            >
              Clear saved settings
            </button>
          )}
          {status === "active" && (
            <button className="btn" onClick={endSession}>
              End Session
            </button>
          )}
          {status === "ended" && (
            <button className="btn primary" onClick={resetSession}>
              Start New Session
            </button>
          )}
        </div>

        {!user && (
          <p
            style={{
              marginTop: 12,
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
            Log in to start a chat session.
          </p>
        )}

        {error && (
          <p
            style={{
              marginTop: 12,
              color: "#f87171",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              fontStyle: "italic",
              fontWeight: 600,
              padding: "8px 12px",
              borderRadius: 12,
              display: "inline-block"
            }}
          >
            {error}
          </p>
        )}

        {sessionInfo && (
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span className="pill pill-soft">{sessionInfo.role}</span>
            <span className="pill pill-soft">{sessionInfo.interview_type}</span>
            {sessionInfo.level && <span className="pill pill-soft">{sessionInfo.level}</span>}
            {sessionInfo.topics?.map((topic) => (
              <span key={topic} className="pill pill-soft">
                {topic}
              </span>
            ))}
          </div>
        )}

        {status === "idle" && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ marginBottom: 8 }}>Interview setup</h3>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Role</span>
                <select
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value)}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                  <option value="custom">Custom role</option>
                </select>
                {selectedRole === "custom" && (
                  <input
                    type="text"
                    value={customRole}
                    onChange={(event) => setCustomRole(event.target.value)}
                    placeholder="Enter a custom role"
                  />
                )}
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Interview type</span>
                <select
                  value={selectedInterviewType}
                  onChange={(event) => setSelectedInterviewType(event.target.value)}
                >
                  <option value="mixed">Mixed</option>
                  <option value="knowledge">Knowledge</option>
                  <option value="scenario">Scenario</option>
                  <option value="behavioral">Behavioral</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>Level</span>
                <select
                  value={selectedLevel}
                  onChange={(event) => setSelectedLevel(event.target.value)}
                >
                  <option value="Junior">Junior</option>
                  <option value="Mid-level">Mid-level</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead">Lead</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6, alignContent: "start" }}>
                <span style={{ fontWeight: 600 }}>Question count</span>
                <select
                  value={questionCount}
                  onChange={(event) => {
                    const nextValue = Number.parseInt(event.target.value, 10);
                    if (Number.isFinite(nextValue)) {
                      setQuestionCount(normalizeQuestionCount(nextValue));
                    }
                  }}
                >
                  {Array.from(
                    { length: QUESTION_COUNT_MAX - QUESTION_COUNT_MIN + 1 },
                    (_, index) => QUESTION_COUNT_MIN + index
                  ).map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6, alignContent: "start", gridColumn: "1 / -1" }}>
                <span style={{ fontWeight: 600 }}>Focus topics</span>
                {topicsLoading ? (
                  <span className="muted" style={{ fontSize: 14 }}>Loading topics...</span>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      padding: "8px 12px",
                      background: "rgba(15, 23, 42, 0.4)",
                      borderRadius: 8,
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      maxHeight: 200,
                      overflowY: "auto"
                    }}
                  >
                    {availableTopics.map((topic) => {
                      const isSelected = selectedTopics.includes(topic);
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => {
                            setSelectedTopics((prev) =>
                              isSelected
                                ? prev.filter((t) => t !== topic)
                                : [...prev, topic]
                            );
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 16,
                            border: isSelected
                              ? "1px solid rgba(59, 130, 246, 0.8)"
                              : "1px solid rgba(148, 163, 184, 0.3)",
                            background: isSelected
                              ? "rgba(59, 130, 246, 0.25)"
                              : "rgba(15, 23, 42, 0.4)",
                            color: isSelected ? "#93c5fd" : "#cbd5e1",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: isSelected ? 600 : 400,
                            transition: "all 0.15s ease"
                          }}
                        >
                          {topic}
                        </button>
                      );
                    })}
                    {availableTopics.length === 0 && (
                      <span className="muted" style={{ fontSize: 13 }}>No topics available</span>
                    )}
                  </div>
                )}
                <span className="muted" style={{ fontSize: 12 }}>
                  Click to select multiple topics to focus the interview.
                  {selectedTopics.length > 0 && ` Selected: ${selectedTopics.length}`}
                </span>
              </label>
            </div>
            <p className="muted" style={{ marginTop: 8 }}>
              These settings are saved locally.
            </p>
            {!isRoleValid && (
              <p className="muted" style={{ marginTop: 6 }}>
                Enter a custom role name to start the session.
              </p>
            )}
            <button
              className="btn primary"
              style={{ marginTop: 8 }}
              onClick={() => void startSession()}
              disabled={!user || isLoading || !isRoleValid}
            >
              {isLoading ? "Starting..." : "Start Chat Session"}
            </button>
          </div>
        )}

        {(status === "active" || status === "ended") && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ marginBottom: 8 }}>Conversation</h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                maxHeight: 400,
                overflowY: "auto",
                padding: 12,
                background: "rgba(15, 23, 42, 0.4)",
                borderRadius: 12,
                border: "1px solid rgba(148, 163, 184, 0.2)"
              }}
            >
              {messages.length === 0 && (
                <p className="muted">Starting the interview...</p>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    padding: "12px 14px",
                    borderRadius: 14,
                    background:
                      message.role === "user"
                        ? "rgba(59, 130, 246, 0.18)"
                        : "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(148, 163, 184, 0.25)"
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>
                    {message.role === "user" ? "You" : "Interviewer"}
                    {message.streaming && " (typing...)"}
                  </div>
                  <div className="markdown" style={{ fontSize: "15px", lineHeight: 1.7, color: "#e2e8f0" }}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {status === "active" && (
              <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your response... (Press Enter to send, Shift+Enter for new line)"
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    minHeight: 80,
                    resize: "vertical"
                  }}
                />
                <button
                  className="btn primary"
                  onClick={() => void sendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  style={{ alignSelf: "flex-end" }}
                >
                  {isLoading ? "Sending..." : "Send"}
                </button>
              </div>
            )}

            <p style={{ fontSize: "12px", color: "#64748b", margin: "12px 0 0 0" }}>
              AI Model: <span style={{ color: "#10b981", fontWeight: 500 }}>Gemini 3 Flash Preview</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
