"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";
import { User } from "lucide-react";

export function AuthStatus() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
      setMenuOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign out";
      setError(message);
    }
  };

  useEffect(() => {
    if (!user) {
      setMenuOpen(false);
    }
  }, [user]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="auth-status" aria-live="polite">
      {error && (
        <span className="muted" role="alert">
          Error: {error}
        </span>
      )}
      {user ? (
        <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "nowrap" }}>
          <div ref={menuRef} style={{ position: "relative" }}>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close account actions" : "Open account actions"}
              onClick={() => setMenuOpen((open) => !open)}
              style={{ cursor: "pointer" }}
              disabled={loading}
            >
              <User aria-hidden style={{ width: 18, height: 18 }} />
            </Button>
            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  minWidth: 220,
                  background: "#101a2e",
                  border: "1px solid #1d2840",
                  borderRadius: 10,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                  padding: 12,
                  display: "grid",
                  gap: 8
                }}
              >
                <span className="pill" title={user.email ?? undefined} style={{ whiteSpace: "nowrap" }}>
                  Signed in as {user.user_metadata.full_name ?? user.email}
                </span>
                <Button
                  variant="secondary"
                  onClick={handleSignOut}
                  disabled={loading}
                  style={{ cursor: "pointer" }}
                >
                  Sign out
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "nowrap" }}>
          <span className="muted optional-tag">Optional</span>
          <Button
            variant="secondary"
            onClick={handleSignIn}
            disabled={loading}
          >
            {loading ? "Connecting..." : "Sign in with Google"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={handleSignIn}
            disabled={loading}
            aria-label="Sign in with Google"
            style={{ cursor: "pointer" }}
          >
            <User aria-hidden style={{ width: 18, height: 18 }} />
          </Button>
        </div>
      )}
    </div>
  );
}
