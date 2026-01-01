"use client";

import { useCallback, useEffect } from "react";
import { useAudioRecorder } from "@/lib/hooks/useAudioRecorder";
import { useSpeechToText } from "@/lib/hooks/useSpeechToText";
import { STTProvider } from "@/lib/types";

interface VoiceRecordButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  accessToken: string | null;
  showProviderSelector?: boolean;
}

const PROVIDER_LABELS: Record<STTProvider, string> = {
  deepgram: "Deepgram Nova-3",
  assemblyai: "AssemblyAI Universal-2"
};

export function VoiceRecordButton({
  onTranscript,
  disabled = false,
  accessToken,
  showProviderSelector = false
}: VoiceRecordButtonProps) {
  const {
    isRecording,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
    audioLevel,
    duration,
    error: recorderError,
    clearError: clearRecorderError
  } = useAudioRecorder();

  const {
    transcribe,
    isTranscribing,
    error: sttError,
    provider,
    setProvider,
    clearError: clearSttError
  } = useSpeechToText(accessToken);

  const error = recorderError || sttError;

  const clearErrors = useCallback(() => {
    clearRecorderError();
    clearSttError();
  }, [clearRecorderError, clearSttError]);

  // Clear errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearErrors, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearErrors]);

  const handleClick = useCallback(async () => {
    if (isRecording) {
      // Stop recording and transcribe
      const audioBlob = await stopRecording();
      if (audioBlob && audioBlob.size > 0) {
        try {
          const transcript = await transcribe(audioBlob);
          onTranscript(transcript);
        } catch {
          // Error is already handled in the hook
        }
      }
    } else {
      // Start recording
      clearErrors();
      await startRecording();
    }
  }, [isRecording, stopRecording, startRecording, transcribe, onTranscript, clearErrors]);

  const handleCancel = useCallback(() => {
    cancelRecording();
    clearErrors();
  }, [cancelRecording, clearErrors]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isSupported) {
    return (
      <div
        style={{
          padding: "8px 12px",
          fontSize: "12px",
          color: "#f87171",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          borderRadius: "8px"
        }}
      >
        Voice recording not supported
      </div>
    );
  }

  const isProcessing = isTranscribing;
  const isDisabled = disabled || isProcessing;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Provider selector */}
      {showProviderSelector && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>STT:</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as STTProvider)}
            disabled={isRecording || isTranscribing || disabled}
            style={{
              fontSize: "12px",
              padding: "4px 8px",
              borderRadius: "6px",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
              color: "#e2e8f0",
              cursor: isRecording || isTranscribing || disabled ? "not-allowed" : "pointer",
              opacity: isRecording || isTranscribing || disabled ? 0.5 : 1
            }}
          >
            <option value="deepgram">{PROVIDER_LABELS.deepgram}</option>
            <option value="assemblyai">{PROVIDER_LABELS.assemblyai}</option>
          </select>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Main mic/stop button */}
        <button
          type="button"
          onClick={handleClick}
          disabled={isDisabled}
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            border: isRecording
              ? "1px solid rgba(239, 68, 68, 0.5)"
              : "1px solid rgba(59, 130, 246, 0.3)",
            background: isRecording
              ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
              : "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
            cursor: isDisabled ? "not-allowed" : "pointer",
            opacity: isDisabled ? 0.5 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            animation: isRecording ? "pulse 1.5s ease-in-out infinite" : "none",
            boxShadow: isRecording
              ? "0 0 20px rgba(239, 68, 68, 0.3)"
              : "0 4px 12px rgba(0, 0, 0, 0.3)"
          }}
          title={isRecording ? "Stop recording" : "Start recording"}
        >
          {isProcessing ? (
            // Loading spinner
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              style={{ animation: "spin 1s linear infinite" }}
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="3"
                fill="none"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          ) : isRecording ? (
            // Stop icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            // Mic icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" />
              <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" />
              <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" />
            </svg>
          )}
        </button>

        {/* Cancel button (only shown while recording) */}
        {isRecording && (
          <button
            type="button"
            onClick={handleCancel}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Cancel recording"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#94a3b8">
              <path d="M18 6L6 18M6 6l12 12" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Duration */}
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "#f87171",
                fontFamily: "monospace"
              }}
            >
              {formatDuration(duration)}
            </span>

            {/* Audio level bars */}
            <div style={{ display: "flex", alignItems: "center", gap: "2px", height: "20px" }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "3px",
                    height: `${Math.max(4, audioLevel * 20 * (1 + i * 0.2))}px`,
                    maxHeight: "20px",
                    backgroundColor: audioLevel > i * 0.2 ? "#f87171" : "#475569",
                    borderRadius: "2px",
                    transition: "height 0.1s ease"
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Transcribing indicator */}
        {isProcessing && (
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Transcribing...</span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            fontSize: "12px",
            color: "#f87171",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            padding: "8px 12px",
            borderRadius: "8px",
            maxWidth: "300px"
          }}
        >
          {error}
        </div>
      )}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.5);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
