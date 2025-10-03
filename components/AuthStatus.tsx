"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";

export function AuthStatus() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign in";
      setError(message);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await signOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign out";
      setError(message);
    }
  };

  return (
    <div className="auth-status" aria-live="polite">
      {error && (
        <span className="muted" role="alert">
          Error: {error}
        </span>
      )}
      {user ? (
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <span className="pill" title={user.email ?? undefined}>
            Signed in as {user.user_metadata.full_name ?? user.email}
          </span>
          <Button
            variant="secondary"
            onClick={handleSignOut}
            disabled={loading}
          >
            Sign out
          </Button>
        </div>
      ) : (
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <span className="muted optional-tag">Optional</span>
          <Button
            variant="secondary"
            onClick={handleSignIn}
            disabled={loading}
          >
            {loading ? "Connecting..." : "Sign in with Google"}
          </Button>
        </div>
      )}
    </div>
  );
}
