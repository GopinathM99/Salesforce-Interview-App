"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";

interface OTPSignInProps {
  onClose: () => void;
}

export function OTPSignIn({ onClose }: OTPSignInProps) {
  const { signInWithOTP, loading } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, flow: "signin" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP code");
      }

      setStep("otp");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send OTP code";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code: otp, flow: "signin" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify OTP code");
      }

      // Sign in with the magic link
      await signInWithOTP(data.magicLink);

      // Close the modal
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to verify OTP code";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setOtp("");
    setError(null);
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
        zIndex: 9999,
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
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {step === "email" ? (
          <>
            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, color: "white", textAlign: "left" }}>
              Sign In with One-Time Code
            </h2>
            <p style={{ marginBottom: 24, color: "rgba(255, 255, 255, 0.7)", fontSize: 14, textAlign: "left" }}>
              Enter your email address and we&apos;ll email you OTP code.
            </p>

            {error && (
              <div
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  textAlign: "left",
                }}
              >
                <span style={{ color: "#ef4444", fontSize: 14, whiteSpace: "pre-line", lineHeight: 1.5 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleEmailSubmit}>
              <div style={{ marginBottom: 24 }}>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    color: "white",
                    fontSize: 16,
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.6)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={isSubmitting || !email}
                  style={{
                    width: "160px",
                    height: "44px",
                    fontSize: "16px",
                    background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                    cursor: "pointer",
                  }}
                >
                  {isSubmitting ? "Sending..." : "Send Code"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{ width: "160px", height: "44px", fontSize: "16px", cursor: "pointer" }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, color: "white" }}>
              Enter Verification Code
            </h2>
            <p style={{ marginBottom: 24, color: "rgba(255, 255, 255, 0.7)", fontSize: 14 }}>
              If an eligible account exists, we&apos;ve sent a 6-digit code to <strong>{email}</strong>.
              Enter it below to sign in.
            </p>

            {error && (
              <div
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  textAlign: "left",
                }}
              >
                <span style={{ color: "#ef4444", fontSize: 14, whiteSpace: "pre-line", lineHeight: 1.5 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleOTPSubmit}>
              <div style={{ marginBottom: 24 }}>
                <label
                  htmlFor="otp"
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "white",
                  }}
                >
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(value);
                  }}
                  placeholder="000000"
                  required
                  disabled={isSubmitting || loading}
                  maxLength={6}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    color: "white",
                    fontSize: 24,
                    letterSpacing: 8,
                    textAlign: "center",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.6)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 24, marginBottom: 16, justifyContent: "center" }}>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={isSubmitting || loading || otp.length !== 6}
                  style={{
                    width: "160px",
                    height: "44px",
                    fontSize: "16px",
                    background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                    cursor: "pointer",
                  }}
                >
                  {isSubmitting || loading ? "Verifying..." : "Verify & Sign In"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBackToEmail}
                  disabled={isSubmitting || loading}
                  style={{ width: "160px", height: "44px", fontSize: "16px", cursor: "pointer" }}
                >
                  Back
                </Button>
              </div>

              <button
                type="button"
                onClick={handleBackToEmail}
                disabled={isSubmitting || loading}
                style={{
                  width: "100%",
                  padding: 8,
                  background: "transparent",
                  border: "none",
                  color: "rgba(59, 130, 246, 0.8)",
                  fontSize: 14,
                  cursor: isSubmitting || loading ? "not-allowed" : "pointer",
                  textDecoration: "underline",
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting && !loading) {
                    e.currentTarget.style.color = "rgba(59, 130, 246, 1)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(59, 130, 246, 0.8)";
                }}
              >
                Didn&apos;t receive the code? Try again
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
