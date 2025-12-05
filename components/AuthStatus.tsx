"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";
import { User } from "lucide-react";
import { OTPSignIn } from "./OTPSignIn";

export function AuthStatus() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
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
              style={{ 
                cursor: "pointer",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                border: "2px solid rgba(59, 130, 246, 0.3)",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden"
              }}
              disabled={loading}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(59, 130, 246, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
              }}
            >
              <User aria-hidden style={{ 
                width: 24, 
                height: 24, 
                color: "white",
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))"
              }} />
            </Button>
            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  minWidth: 220,
                  background: "linear-gradient(135deg, #1a1f2e 0%, rgba(26, 31, 46, 0.95) 100%)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  borderRadius: 12,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)",
                  padding: 16,
                  display: "grid",
                  gap: 12,
                  zIndex: 1000,
                  backdropFilter: "blur(10px)"
                }}
              >
                <span className="pill" title={user.email ?? undefined} style={{ whiteSpace: "nowrap", textAlign: "center" }}>
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
        <>
          <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "nowrap" }}>
            <Button
              variant="secondary"
              onClick={handleSignIn}
              disabled={loading}
            >
              {loading ? "Connecting..." : "Sign in with Google"}
            </Button>
            <div ref={menuRef} style={{ position: "relative" }}>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-label={menuOpen ? "Close sign in options" : "Open sign in options"}
                onClick={() => setMenuOpen((open) => !open)}
                disabled={loading}
                style={{
                  cursor: "pointer",
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
                  border: "2px solid rgba(245, 158, 11, 0.3)",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.1)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(245, 158, 11, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.3)";
                }}
              >
                <User aria-hidden style={{
                  width: 24,
                  height: 24,
                  color: "white",
                  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))"
                }} />
              </Button>
              {menuOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    minWidth: 240,
                    background: "linear-gradient(135deg, #1a1f2e 0%, rgba(26, 31, 46, 0.95) 100%)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: 12,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)",
                    padding: 16,
                    display: "grid",
                    gap: 12,
                    zIndex: 1000,
                    backdropFilter: "blur(10px)"
                  }}
                >
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMenuOpen(false);
                      void handleSignIn();
                    }}
                    disabled={loading}
                    style={{ cursor: "pointer", textAlign: "left" }}
                  >
                    Sign in with Google
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowOTPModal(true);
                    }}
                    disabled={loading}
                    style={{ cursor: "pointer", textAlign: "left" }}
                  >
                    Sign In with One Time Code
                  </Button>
                </div>
              )}
            </div>
          </div>
          {showOTPModal && <OTPSignIn onClose={() => setShowOTPModal(false)} />}
        </>
      )}
    </div>
  );
}
