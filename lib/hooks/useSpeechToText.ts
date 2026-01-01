"use client";

import { useState, useCallback, useEffect } from "react";
import { STTProvider, STTTranscriptResponse } from "@/lib/types";

export interface UseSpeechToTextReturn {
  transcribe: (audioBlob: Blob) => Promise<string>;
  isTranscribing: boolean;
  error: string | null;
  provider: STTProvider;
  setProvider: (provider: STTProvider) => void;
  clearError: () => void;
}

const LOCAL_STORAGE_KEY = "stt_provider";
const DEFAULT_PROVIDER: STTProvider = "deepgram";

export function useSpeechToText(accessToken: string | null): UseSpeechToTextReturn {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProviderState] = useState<STTProvider>(DEFAULT_PROVIDER);

  // Load provider preference from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored === "deepgram" || stored === "assemblyai") {
      setProviderState(stored);
    }
  }, []);

  // Save provider preference to localStorage
  const setProvider = useCallback((newProvider: STTProvider) => {
    setProviderState(newProvider);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, newProvider);
    }
  }, []);

  const transcribe = useCallback(
    async (audioBlob: Blob): Promise<string> => {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      setIsTranscribing(true);
      setError(null);

      try {
        // Determine API endpoint based on provider
        const endpoint =
          provider === "deepgram"
            ? "/api/stt/deepgram"
            : "/api/stt/assemblyai";

        // Create form data with audio
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.error || `Transcription failed: ${response.status}`;
          throw new Error(errorMessage);
        }

        const data: STTTranscriptResponse = await response.json();

        if (!data.transcript || data.transcript.trim() === "") {
          throw new Error("No speech detected. Please speak clearly and try again.");
        }

        return data.transcript;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Transcription failed";
        setError(errorMessage);
        throw err;
      } finally {
        setIsTranscribing(false);
      }
    },
    [accessToken, provider]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    transcribe,
    isTranscribing,
    error,
    provider,
    setProvider,
    clearError
  };
}
