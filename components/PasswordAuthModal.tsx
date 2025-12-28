"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";

interface PasswordAuthModalProps {
  onClose: () => void;
  initialMode?: "signup" | "signin";
}

export function PasswordAuthModal({ onClose, initialMode = "signup" }: PasswordAuthModalProps) {
  const { signInWithPassword, signInWithOTP, loading } = useAuth();
  const [mode, setMode] = useState<"signup" | "signin">(initialMode);
  const [signupStep, setSignupStep] = useState<"details" | "otp">("details");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(false);
    setOtp("");
    setSignupStep("details");
  }, [mode]);

  const resolveEmailForSignIn = async (identifier: string) => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      throw new Error("Email or username is required");
    }

    if (trimmed.includes("@")) {
      return trimmed.toLowerCase();
    }

    const response = await fetch("/api/auth/resolve-identifier", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ identifier: trimmed })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to resolve username");
    }

    return data.email as string;
  };

  const sendSignupOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const response = await fetch("/api/otp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: normalizedEmail, flow: "signup" }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to send verification code");
    }
  };

  const handleSignUpStart = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await sendSignupOtp();
      setSignupStep("otp");
      setSuccess("We sent a verification code to your email.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send verification code";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          code: otp,
          flow: "signup",
          password,
          username: username.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify code");
      }

      await signInWithOTP(data.magicLink);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to verify code";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const resolvedEmail = await resolveEmailForSignIn(email);
      await signInWithPassword({ email: resolvedEmail, password });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign in";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await sendSignupOtp();
      setSuccess("Verification code sent again. Please check your inbox.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend verification code";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSignup = mode === "signup";
  const isOtpStep = isSignup && signupStep === "otp";
  const title = isOtpStep ? "Verify your email" : isSignup ? "Sign Up" : "Sign In";

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
          maxWidth: 520,
          width: "92%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, color: "white", textAlign: "left" }}>
          {title}
        </h2>
        <p style={{ marginBottom: 24, color: "rgba(255, 255, 255, 0.7)", fontSize: 14, textAlign: "left" }}>
          {isOtpStep
            ? `We sent a 6-digit code to ${email.trim() || "your email"}. Enter it below to finish creating your account.`
            : isSignup
              ? "We will send a one-time code to verify your email after you create the account."
              : "Enter your username or email and password to access your account."}
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

        {isSignup ? (
          isOtpStep ? (
            <form onSubmit={handleSignUpVerify}>
              <div style={{ marginBottom: 24 }}>
                <label
                  htmlFor="otp"
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "white"
                  }}
                >
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(event) => {
                    const value = event.target.value.replace(/\D/g, "").slice(0, 6);
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

              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 12 }}>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={isSubmitting || loading || otp.length !== 6}
                  style={{
                    width: "180px",
                    height: "44px",
                    fontSize: "16px",
                    background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                    cursor: "pointer"
                  }}
                >
                  {isSubmitting || loading ? "Verifying..." : "Verify & Create"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSignupStep("details")}
                  disabled={isSubmitting || loading}
                  style={{ width: "140px", height: "44px", fontSize: "16px", cursor: "pointer" }}
                >
                  Back
                </Button>
              </div>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={isSubmitting || loading}
                style={{
                  width: "100%",
                  padding: 8,
                  background: "transparent",
                  border: "none",
                  color: "rgba(59, 130, 246, 0.8)",
                  fontSize: 14,
                  cursor: isSubmitting || loading ? "not-allowed" : "pointer",
                  textDecoration: "underline"
                }}
                onMouseEnter={(event) => {
                  if (!isSubmitting && !loading) {
                    event.currentTarget.style.color = "rgba(59, 130, 246, 1)";
                  }
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.color = "rgba(59, 130, 246, 0.8)";
                }}
              >
                Resend verification code
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUpStart}>
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="firstName"
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "white"
                  }}
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First name"
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
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="lastName"
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "white"
                  }}
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last name"
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
              <div style={{ marginBottom: 16 }}>
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
                  placeholder="Username"
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
              <div style={{ marginBottom: 16 }}>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "white"
                  }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
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
              <div style={{ marginBottom: 24 }}>
                <label
                  htmlFor="password"
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "white"
                  }}
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
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

              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 12 }}>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={
                    isSubmitting ||
                    loading ||
                    !email ||
                    !password ||
                    !username ||
                    !firstName ||
                    !lastName
                  }
                  style={{
                    width: "180px",
                    height: "44px",
                    fontSize: "16px",
                    background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                    cursor: "pointer"
                  }}
                >
                  {isSubmitting || loading ? "Sending code..." : "Create account"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={isSubmitting || loading}
                  style={{ width: "140px", height: "44px", fontSize: "16px", cursor: "pointer" }}
                >
                  Cancel
                </Button>
              </div>

              <p style={{ marginTop: -4, marginBottom: 0, fontSize: 12, color: "rgba(255, 255, 255, 0.6)" }}>
                You&apos;ll be provisionally approved until you verify your email address.
              </p>
            </form>
          )
        ) : (
          <form onSubmit={handleSignIn}>
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  color: "white"
                }}
              >
                Email or Username
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com or username"
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

            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  color: "white"
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
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

            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 12 }}>
              <Button
                type="submit"
                variant="secondary"
                disabled={isSubmitting || loading || !email || !password}
                style={{
                  width: "180px",
                  height: "44px",
                  fontSize: "16px",
                  background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                  cursor: "pointer"
                }}
              >
                {isSubmitting || loading ? "Signing in..." : "Sign in"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting || loading}
                style={{ width: "140px", height: "44px", fontSize: "16px", cursor: "pointer" }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setError(null);
            setSuccess(null);
            setMode((current) => (current === "signup" ? "signin" : "signup"));
          }}
          disabled={isSubmitting || loading}
          style={{
            width: "100%",
            marginTop: 16,
            padding: 8,
            background: "transparent",
            border: "none",
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: 14,
            cursor: isSubmitting || loading ? "not-allowed" : "pointer"
          }}
        >
          {mode === "signup"
            ? "Already have an account? Sign in instead"
            : "Need an account? Create one"}
        </button>
      </div>
    </div>
  );
}
