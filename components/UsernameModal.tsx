"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";

interface UsernameModalProps {
  onClose: () => void;
  initialUsername?: string;
}

export function UsernameModal({ onClose, initialUsername = "" }: UsernameModalProps) {
  const { updateUsername, loading } = useAuth();
  const [username, setUsername] = useState(initialUsername);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await updateUsername(username);
      setSuccess("Username updated.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update username";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1a1f2e 0%, rgba(26, 31, 46, 0.95) 100%)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          borderRadius: 16,
          padding: 32,
          maxWidth: 480,
          width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, color: "white", textAlign: "left" }}>
          Update Username
        </h2>
        <p style={{ marginBottom: 24, color: "rgba(255, 255, 255, 0.7)", fontSize: 14, textAlign: "left" }}>
          Your new username will show up on your account menu.
        </p>

        {error && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              textAlign: "left"
            }}
          >
            <span style={{ color: "#ef4444", fontSize: 14, whiteSpace: "pre-line", lineHeight: 1.5 }}>{error}</span>
          </div>
        )}

        {success && (
          <div
            style={{
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              textAlign: "left"
            }}
          >
            <span style={{ color: "#22c55e", fontSize: 14, whiteSpace: "pre-line", lineHeight: 1.5 }}>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="username"
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 500,
                color: "white"
              }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Your name"
              required
              disabled={isSubmitting || loading}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid rgba(59, 130, 246, 0.3)",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                color: "white",
                fontSize: 16,
                outline: "none"
              }}
              onFocus={(event) => {
                event.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.6)";
              }}
              onBlur={(event) => {
                event.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <Button
              type="submit"
              variant="secondary"
              disabled={isSubmitting || loading || !username.trim()}
              style={{
                width: "170px",
                height: "44px",
                fontSize: "16px",
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                cursor: "pointer"
              }}
            >
              {isSubmitting || loading ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting || loading}
              style={{ width: "140px", height: "44px", fontSize: "16px", cursor: "pointer" }}
            >
              Close
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
