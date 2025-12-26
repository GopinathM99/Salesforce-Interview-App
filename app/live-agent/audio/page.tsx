"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

type RealtimeEvent = {
  type?: string;
  delta?: string;
  response?: unknown;
  item?: { type?: string; role?: string; content?: unknown };
  item_id?: string;
  call_id?: string;
  id?: string;
  name?: string;
  arguments?: unknown;
  arguments_json?: unknown;
  arguments_text?: unknown;
  error?: { message?: string };
};

const ROLE_OPTIONS = [
  "Salesforce Developer",
  "Salesforce Admin",
  "Salesforce Architect",
  "Salesforce Consultant"
];

const DEFAULT_QUESTION_COUNT = 5;
const QUESTION_COUNT_MIN = 1;
const QUESTION_COUNT_MAX = 10;

const TOOL_DEFINITIONS = [
  {
    type: "function",
    name: "fetch_next_question",
    description: "Fetch the next interview question for the current role.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Optional topic or skill area." },
        difficulty: { type: "string", description: "easy, medium, or hard." },
        category: { type: "string", description: "Optional category filter." }
      },
      required: []
    }
  },
  {
    type: "function",
    name: "store_answer",
    description: "Store the user's answer and any scoring metadata.",
    parameters: {
      type: "object",
      properties: {
        question_id: { type: "string" },
        answer_text: { type: "string" },
        score: { type: "number" },
        tags: { type: "array", items: { type: "string" } }
      },
      required: ["answer_text"]
    }
  },
  {
    type: "function",
    name: "store_feedback",
    description: "Store brief feedback and rubric scoring for the user's answer.",
    parameters: {
      type: "object",
      properties: {
        question_text: { type: "string" },
        score: { type: "number" },
        rubric: { type: "object" },
        feedback: { type: "string" }
      },
      required: ["feedback"]
    }
  }
] as const;

const buildSystemPrompt = (options: {
  role: string;
  interviewType: string;
  level?: string;
  topics?: string[];
  questionCount?: number;
}) => {
  const levelLabel = options.level ? ` (${options.level})` : "";
  const topicsLine =
    options.topics && options.topics.length > 0
      ? `Focus on these topics: ${options.topics.join(", ")}. Prioritize them when selecting questions.`
      : "If the user shares focus topics, prioritize them when selecting questions.";
  const questionCountLine =
    typeof options.questionCount === "number" && options.questionCount > 0
      ? `Plan for ${options.questionCount} total questions. After the last question, share a brief wrap-up and stop asking new questions.`
      : "If the user provides a target number of questions, follow it and wrap up at the end.";
  return [
    `You are a concise mock interviewer for a ${options.role}${levelLabel} role.`,
    `Interview type: ${options.interviewType}. Ask one question at a time and wait for the user's answer.`,
    "Keep your questions to 1-2 sentences. After each answer, give 1-2 short feedback bullets and a 0-5 score.",
    "Use fetch_next_question to pick a new question. Use store_answer and store_feedback after the user responds.",
    topicsLine,
    questionCountLine,
    "Avoid long monologues. Prioritize clarity, accuracy, and actionable feedback."
  ].join("\n");
};

const parseToolArgs = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object" && raw) {
    return raw as Record<string, unknown>;
  }
  return {};
};

const extractTextFromContent = (content: unknown) => {
  if (!Array.isArray(content)) return "";
  const parts = content
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const typed = entry as {
        type?: string;
        text?: string;
        content?: string;
        transcript?: string;
      };
      if (
        typed.type === "output_text" ||
        typed.type === "text" ||
        typed.type === "input_text"
      ) {
        return typed.text ?? typed.content ?? "";
      }
      if (typed.transcript) {
        return typed.transcript;
      }
      return "";
    })
    .filter(Boolean);
  return parts.join(" ").trim();
};

const extractTextFromResponse = (response: unknown) => {
  if (!response || typeof response !== "object") return "";
  const typed = response as { output?: Array<{ content?: unknown; text?: string }> };
  if (!Array.isArray(typed.output)) return "";
  const parts = typed.output
    .map((item) => {
      if (typeof item?.text === "string" && item.text.trim()) {
        return item.text.trim();
      }
      return extractTextFromContent(item?.content);
    })
    .filter(Boolean);
  return parts.join(" ").trim();
};

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const parseTopics = (value: string) => {
  const normalized = value
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean);
  return Array.from(new Set(normalized));
};

const normalizeQuestionCount = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_QUESTION_COUNT;
  const rounded = Math.round(value);
  return Math.min(QUESTION_COUNT_MAX, Math.max(QUESTION_COUNT_MIN, rounded));
};

export default function LiveAgentAudioPage() {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveInputTranscript, setLiveInputTranscript] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{
    role: string;
    interview_type: string;
    level?: string;
    topics?: string[];
    question_count?: number;
  } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("Salesforce Developer");
  const [customRole, setCustomRole] = useState("");
  const [selectedInterviewType, setSelectedInterviewType] = useState("mixed");
  const [selectedLevel, setSelectedLevel] = useState("Mid-level");
  const [focusTopics, setFocusTopics] = useState("");
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputTranscriptsRef = useRef<Record<string, string>>({});
  const isConnectingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const functionCallBufferRef = useRef<Record<string, { name?: string; args: string }>>({});
  const lastAssistantTextRef = useRef<string>("");

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

  const appendAssistantDelta = useCallback((delta: string) => {
    if (!delta) return;
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (!last || last.role !== "assistant" || !last.streaming) {
        next.push({ id: makeId(), role: "assistant", content: delta, streaming: true });
      } else {
        last.content += delta;
      }
      return next;
    });
  }, []);

  const finalizeAssistantMessage = useCallback(() => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === "assistant" && last.streaming) {
        const finalized = { ...last, streaming: false };
        next[next.length - 1] = finalized;
        if (finalized.content.trim()) {
          void persistMessage({
            role: "assistant",
            content: finalized.content,
            source: "text"
          });
        }
      }
      return next;
    });
  }, [persistMessage]);

  const addUserMessage = useCallback(
    (text: string, source: "text" | "transcript") => {
      if (!text.trim()) return;
      const content = text.trim();
      setMessages((prev) => [...prev, { id: makeId(), role: "user", content }]);
      void persistMessage({
        role: "user",
        content,
        source
      });
    },
    [persistMessage]
  );

  const handleBargeIn = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const resumeAudioPlayback = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      void audioRef.current.play().catch(() => undefined);
    }
  }, []);

  const sendEvent = useCallback((payload: Record<string, unknown>) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
      return;
    }
    dataChannelRef.current.send(JSON.stringify(payload));
  }, []);

  const persistFeedback = useCallback(
    async ({
      questionText,
      score,
      rubric,
      feedback
    }: {
      questionText?: string | null;
      score?: number | null;
      rubric?: Record<string, unknown>;
      feedback: string;
    }) => {
      const sessionIdValue = sessionIdRef.current;
      if (!sessionIdValue || !session?.access_token) return;
      try {
        await fetch("/api/live-agent/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            session_id: sessionIdValue,
            question_text: questionText ?? null,
            score: typeof score === "number" ? score : null,
            rubric: rubric ?? {},
            feedback
          })
        });
      } catch (persistError) {
        console.error("Failed to persist feedback", persistError);
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

  const sendToolOutput = useCallback(
    (callId: string, output: Record<string, unknown>) => {
      sendEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify(output)
        }
      });
    sendEvent({
      type: "response.create",
      response: {
        output_modalities: ["audio"]
      }
    });
    },
    [sendEvent]
  );

  const runTool = useCallback(
    async (callId: string, name: string, args: Record<string, unknown>) => {
      try {
        if (name === "fetch_next_question") {
          const topic = typeof args.topic === "string" ? args.topic : undefined;
          const difficulty = typeof args.difficulty === "string" ? args.difficulty : undefined;
          const category = typeof args.category === "string" ? args.category : undefined;
          const response = await fetch("/api/live-agent/question", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token ?? ""}`
            },
            body: JSON.stringify({
              topic,
              difficulty,
              category
            })
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            sendToolOutput(callId, { error: data?.error || "Unable to fetch question." });
            return;
          }
          sendToolOutput(callId, { question: data?.question ?? null });
          return;
        }

        if (name === "store_answer") {
          const answerText = typeof args.answer_text === "string" ? args.answer_text.trim() : "";
          if (answerText) {
            const score = typeof args.score === "number" ? args.score : null;
            const tags = Array.isArray(args.tags) ? args.tags : null;
            void persistMessage({
              role: "user",
              content: answerText,
              source: "text",
              metadata: {
                tool: "store_answer",
                question_id: args.question_id ?? null,
                score,
                tags
              }
            });
          }
          sendToolOutput(callId, { ok: true });
          return;
        }

        if (name === "store_feedback") {
          const feedbackText = typeof args.feedback === "string" ? args.feedback.trim() : "";
          if (feedbackText) {
            const rubric =
              typeof args.rubric === "object" && args.rubric ? args.rubric : {};
            void persistFeedback({
              questionText: typeof args.question_text === "string" ? args.question_text : null,
              score: typeof args.score === "number" ? args.score : null,
              rubric: rubric as Record<string, unknown>,
              feedback: feedbackText
            });
          }
          sendToolOutput(callId, { ok: true });
          return;
        }

        sendToolOutput(callId, { error: `Unknown tool: ${name}` });
      } catch (toolError) {
        console.error("Tool execution failed", toolError);
        sendToolOutput(callId, { error: "Tool execution failed." });
      }
    },
    [persistFeedback, persistMessage, sendToolOutput, session?.access_token]
  );

  const handleServerEvent = useCallback((event: RealtimeEvent) => {
    const eventType = event.type;
    if (!eventType) return;

    switch (eventType) {
      case "session.created":
        setStatus("connected");
        break;
      case "response.created":
        resumeAudioPlayback();
        break;
      case "response.output_text.delta":
        appendAssistantDelta(event.delta ?? "");
        break;
      case "response.output_text.done":
      case "response.done":
        if (event.response) {
          const text = extractTextFromResponse(event.response);
          if (text && text !== lastAssistantTextRef.current) {
            lastAssistantTextRef.current = text;
            setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: text }]);
            void persistMessage({
              role: "assistant",
              content: text,
              source: "text"
            });
          }
          const responseRecord = event.response as {
            status_details?: { error?: { message?: string }; message?: string };
          } | null;
          const statusDetails = responseRecord?.status_details;
          const errorMessage = statusDetails?.error?.message || statusDetails?.message;
          if (errorMessage) {
            setError(errorMessage);
          }
        }
        resumeAudioPlayback();
        finalizeAssistantMessage();
        break;
      case "conversation.item.added":
      case "conversation.item.done": {
        const item = event.item;
        if (item?.type !== "message") return;
        if (item?.role !== "assistant") return;
        const text = extractTextFromContent(item?.content);
        if (text) {
          if (text === lastAssistantTextRef.current) {
            break;
          }
          lastAssistantTextRef.current = text;
          setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: text }]);
          void persistMessage({
            role: "assistant",
            content: text,
            source: "text"
          });
        }
        resumeAudioPlayback();
        break;
      }
      case "conversation.item.input_audio_transcription.delta": {
        const itemId = typeof event.item_id === "string" ? event.item_id : undefined;
        if (!itemId || !event.delta) return;
        const current = inputTranscriptsRef.current[itemId] ?? "";
        const updated = current + event.delta;
        inputTranscriptsRef.current[itemId] = updated;
        setLiveInputTranscript(updated);
        break;
      }
      case "conversation.item.input_audio_transcription.completed":
      case "conversation.item.input_audio_transcription.done": {
        const itemId = typeof event.item_id === "string" ? event.item_id : undefined;
        if (!itemId) return;
        const transcript = inputTranscriptsRef.current[itemId];
        if (transcript?.trim()) {
          addUserMessage(transcript.trim(), "transcript");
        }
        delete inputTranscriptsRef.current[itemId];
        setLiveInputTranscript("");
        break;
      }
      case "input_audio_buffer.speech_started":
        handleBargeIn();
        break;
      case "response.function_call_arguments.delta": {
        const callId = event.call_id ?? event.item_id ?? event.id;
        if (!callId) return;
        const entry = functionCallBufferRef.current[callId] ?? { name: event.name, args: "" };
        if (event.name) {
          entry.name = event.name;
        }
        entry.args += event.delta ?? "";
        functionCallBufferRef.current[callId] = entry;
        break;
      }
      case "response.function_call_arguments.done": {
        const callId = event.call_id ?? event.item_id ?? event.id;
        if (!callId) return;
        const buffered = functionCallBufferRef.current[callId];
        const name = event.name ?? buffered?.name;
        const rawArgs = event.arguments ?? buffered?.args ?? "";
        delete functionCallBufferRef.current[callId];
        if (!name) return;
        void runTool(callId, name, parseToolArgs(rawArgs));
        break;
      }
      case "response.function_call": {
        const callId = event.call_id ?? event.id;
        if (!callId || !event.name) return;
        const rawArgs = event.arguments ?? event.arguments_json ?? event.arguments_text ?? {};
        void runTool(callId, event.name, parseToolArgs(rawArgs));
        break;
      }
      case "error":
        setError(event.error?.message || "Realtime session error.");
        setStatus("error");
        break;
      default:
        break;
    }
  }, [
    addUserMessage,
    appendAssistantDelta,
    finalizeAssistantMessage,
    handleBargeIn,
    persistMessage,
    runTool,
    resumeAudioPlayback
  ]);

  const resetTranscript = useCallback(() => {
    setMessages([]);
    setLiveInputTranscript("");
    inputTranscriptsRef.current = {};
    lastAssistantTextRef.current = "";
  }, []);

  const disconnect = useCallback((nextStatus: ConnectionStatus = "idle") => {
    if (nextStatus !== "connecting") {
      void endSessionRecord(nextStatus === "error" ? "error" : "ended");
    }
    dataChannelRef.current?.close();
    peerConnectionRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());

    dataChannelRef.current = null;
    peerConnectionRef.current = null;
    localStreamRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }

    setStatus(nextStatus);
    setIsMuted(false);
    setSessionId(null);
  }, [endSessionRecord]);

  const connect = useCallback(async () => {
    if (!session?.access_token) {
      setError("Please sign in to start a live session.");
      return;
    }
    if (isConnectingRef.current || status === "connected") return;

    resetTranscript();
    setError(null);
    setStatus("connecting");
    isConnectingRef.current = true;

    try {
      const roleToSend =
        selectedRole === "custom" ? customRole.trim() : selectedRole;
      const topicsToSend = parseTopics(focusTopics);
      const questionCountToSend = normalizeQuestionCount(questionCount);
      const systemPrompt = buildSystemPrompt({
        role: roleToSend || "Salesforce Developer",
        interviewType: selectedInterviewType,
        level: selectedLevel,
        topics: topicsToSend,
        questionCount: questionCountToSend
      });

      const tokenResponse = await fetch("/api/realtime/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          role: roleToSend || "Salesforce Developer",
          interview_type: selectedInterviewType,
          level: selectedLevel,
          topics: topicsToSend,
          question_count: questionCountToSend
        })
      });

      const tokenData = await tokenResponse.json().catch(() => null);
      if (!tokenResponse.ok) {
        throw new Error(tokenData?.error || "Failed to create a realtime session.");
      }

      const clientSecret = tokenData?.value || tokenData?.client_secret?.value;
      if (!clientSecret) {
        throw new Error("Realtime client secret missing from response.");
      }

      setSessionInfo({
        role: roleToSend || "Salesforce Developer",
        interview_type: selectedInterviewType,
        level: selectedLevel,
        topics: topicsToSend.length > 0 ? topicsToSend : undefined,
        question_count: questionCountToSend
      });

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
          model: tokenData?.session?.model ?? null,
          metadata: {
            source: "realtime",
            topics: topicsToSend,
            question_count: questionCountToSend
          }
        })
      });

      const sessionRecordPayload = await sessionRecordResponse.json().catch(() => null);
      if (sessionRecordResponse.ok) {
        setSessionId(sessionRecordPayload?.session?.id ?? null);
      } else {
        console.warn("Failed to persist live session", sessionRecordPayload?.error);
      }

      const peerConnection = new RTCPeerConnection();
      const dataChannel = peerConnection.createDataChannel("oai-events");
      dataChannelRef.current = dataChannel;
      peerConnectionRef.current = peerConnection;

      dataChannel.onopen = () => {
        sendEvent({
          type: "session.update",
          session: {
            type: "realtime",
            output_modalities: ["audio"],
            audio: {
              input: {
                format: {
                  type: "audio/pcm",
                  rate: 24000
                },
                transcription: {
                  model: "gpt-4o-transcribe"
                },
                turn_detection: {
                  type: "semantic_vad",
                  create_response: true,
                  interrupt_response: true
                }
              },
              output: {
                format: {
                  type: "audio/pcm",
                  rate: 24000
                }
              }
            },
            instructions: systemPrompt,
            tools: TOOL_DEFINITIONS,
            tool_choice: "auto"
          }
        });
        sendEvent({
          type: "response.create",
          response: {
            output_modalities: ["audio"]
          }
        });
      };

      dataChannel.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleServerEvent(payload);
        } catch (parseError) {
          console.error("Failed to parse realtime event", parseError);
        }
      };

      peerConnection.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
          void audioRef.current.play().catch(() => undefined);
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "failed") {
          setStatus("error");
          setError("Realtime connection failed. Please reconnect.");
        }
      };

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const answerResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });

      const answerSdp = await answerResponse.text();
      if (!answerResponse.ok) {
        throw new Error(answerSdp || "Failed to establish realtime connection.");
      }

      await peerConnection.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      console.error("Realtime connect error", err);
      setError(err instanceof Error ? err.message : "Failed to start realtime session.");
      setStatus("error");
      disconnect("error");
    } finally {
      isConnectingRef.current = false;
    }
  }, [
    customRole,
    disconnect,
    focusTopics,
    handleServerEvent,
    questionCount,
    selectedInterviewType,
    selectedLevel,
    selectedRole,
    sendEvent,
    session?.access_token,
    status,
    resetTranscript
  ]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  }, [isMuted]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

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

    if (storedRole) {
      setSelectedRole(storedRole);
    }
    if (storedCustomRole) {
      setCustomRole(storedCustomRole);
    }
    if (storedType) {
      setSelectedInterviewType(storedType);
    }
    if (storedLevel) {
      setSelectedLevel(storedLevel);
    }
    if (storedTopics) {
      setFocusTopics(storedTopics);
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
    window.localStorage.setItem("live_agent_topics", focusTopics);
    window.localStorage.setItem("live_agent_question_count", String(questionCount));
  }, [selectedRole, customRole, selectedInterviewType, selectedLevel, focusTopics, questionCount]);

  useEffect(() => {
    if (!sessionInfo?.role) return;
    if (ROLE_OPTIONS.includes(sessionInfo.role)) {
      setSelectedRole(sessionInfo.role);
      setCustomRole("");
    } else {
      setSelectedRole("custom");
      setCustomRole(sessionInfo.role);
    }
    if (sessionInfo.interview_type) {
      setSelectedInterviewType(sessionInfo.interview_type);
    }
    if (sessionInfo.level) {
      setSelectedLevel(sessionInfo.level);
    }
    if (sessionInfo.topics?.length) {
      setFocusTopics(sessionInfo.topics.join(", "));
    } else {
      setFocusTopics("");
    }
    if (typeof sessionInfo.question_count === "number") {
      setQuestionCount(normalizeQuestionCount(sessionInfo.question_count));
    }
  }, [sessionInfo]);

  const clearSavedSettings = useCallback(() => {
    setSelectedRole("Salesforce Developer");
    setCustomRole("");
    setSelectedInterviewType("mixed");
    setSelectedLevel("Mid-level");
    setFocusTopics("");
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

  const isRoleValid = selectedRole !== "custom" || customRole.trim().length > 1;

  return (
    <div className="grid">
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 className="title">Live Audio Interview</h2>
          <Link className="btn back-btn" href="/live-agent">
            Back to Live Agent
          </Link>
        </div>
        <p>
          Practice live mock interviews with an AI interviewer using voice. Speak naturally and receive
          real-time audio responses and feedback.
        </p>
        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <span
            className="pill"
            style={{
              background:
                status === "connected"
                  ? "rgba(16, 185, 129, 0.2)"
                  : status === "connecting"
                  ? "rgba(59, 130, 246, 0.2)"
                  : status === "error"
                  ? "rgba(239, 68, 68, 0.2)"
                  : "rgba(148, 163, 184, 0.2)",
              borderColor:
                status === "connected"
                  ? "rgba(16, 185, 129, 0.5)"
                  : status === "connecting"
                  ? "rgba(59, 130, 246, 0.5)"
                  : status === "error"
                  ? "rgba(239, 68, 68, 0.5)"
                  : "rgba(148, 163, 184, 0.4)",
              color:
                status === "connected"
                  ? "#10b981"
                  : status === "connecting"
                  ? "#60a5fa"
                  : status === "error"
                  ? "#f87171"
                  : "#cbd5f5",
              fontWeight: 600
            }}
          >
            Status: {status === "idle" ? "Idle" : status === "connecting" ? "Connecting" : status === "connected" ? "Connected" : "Error"}
          </span>
          <button
            className="btn primary"
            onClick={() => void connect()}
            disabled={!user || status !== "idle" || !isRoleValid}
          >
            Start Live Session
          </button>
          <button
            className="btn"
            onClick={() => void disconnect()}
            disabled={status !== "connected" && status !== "error"}
          >
            End Session
          </button>
          <button
            className="btn"
            onClick={toggleMute}
            disabled={status !== "connected"}
          >
            {isMuted ? "Unmute Mic" : "Mute Mic"}
          </button>
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
            Log in to start a live session.
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
            {typeof sessionInfo.question_count === "number" && (
              <span className="pill pill-soft">
                {sessionInfo.question_count} questions
              </span>
            )}
          </div>
        )}
        <div style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 8 }}>Interview setup</h3>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Role</span>
              <select
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value)}
                disabled={status === "connecting" || status === "connected"}
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
                  disabled={status === "connecting" || status === "connected"}
                />
              )}
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Interview type</span>
              <select
                value={selectedInterviewType}
                onChange={(event) => setSelectedInterviewType(event.target.value)}
                disabled={status === "connecting" || status === "connected"}
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
                disabled={status === "connecting" || status === "connected"}
              >
                <option value="Junior">Junior</option>
                <option value="Mid-level">Mid-level</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Question count</span>
              <select
                value={questionCount}
                onChange={(event) => {
                  const nextValue = Number.parseInt(event.target.value, 10);
                  if (Number.isFinite(nextValue)) {
                    setQuestionCount(normalizeQuestionCount(nextValue));
                  }
                }}
                disabled={status === "connecting" || status === "connected"}
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
              <span className="muted" style={{ fontSize: 12 }}>
                Choose how many questions to cover in this session.
              </span>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Focus topics</span>
              <input
                type="text"
                value={focusTopics}
                onChange={(event) => setFocusTopics(event.target.value)}
                placeholder="e.g., Apex, LWC, SOQL"
                disabled={status === "connecting" || status === "connected"}
              />
              <span className="muted" style={{ fontSize: 12 }}>
                Comma-separated topics help the interviewer stay focused.
              </span>
            </label>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            These settings are saved locally and sent when starting a new session.
          </p>
          {!isRoleValid && (
            <p className="muted" style={{ marginTop: 6 }}>
              Enter a custom role name to start the session.
            </p>
          )}
          <button
            className="btn"
            style={{ marginTop: 8 }}
            onClick={clearSavedSettings}
            disabled={status === "connecting" || status === "connected"}
          >
            Clear saved settings
          </button>
        </div>
        <div style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 8 }}>Transcript</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {messages.length === 0 && (
              <p className="muted">Start a session and speak to see the transcript.</p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
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
                  {message.streaming ? " (streaming...)" : ""}
                </div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{message.content}</div>
              </div>
            ))}
            {liveInputTranscript && (
              <div className="muted" style={{ fontStyle: "italic" }}>
                Listening: {liveInputTranscript}
              </div>
            )}
          </div>
        </div>
        <audio ref={audioRef} autoPlay />
      </div>
    </div>
  );
}
