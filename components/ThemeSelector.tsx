"use client";

import { useTheme } from "@/lib/ThemeContext";
import { type ThemeId } from "@/lib/themes";
import { Palette, X } from "lucide-react";
import { useEffect } from "react";

export function ThemeSelector() {
  const { themeId, setTheme, availableThemes } = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "var(--muted)",
          marginBottom: 4,
        }}
      >
        <Palette size={14} />
        <span>Theme</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {availableThemes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setTheme(theme.id as ThemeId)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 8,
              border:
                themeId === theme.id
                  ? "1px solid var(--accent)"
                  : "1px solid var(--border-subtle)",
              background:
                themeId === theme.id
                  ? "var(--accent-bg-subtle)"
                  : "transparent",
              cursor: "pointer",
              transition: "all 0.2s ease",
              width: "100%",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: theme.colors.accent,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 13,
                color: themeId === theme.id ? "var(--accent)" : "var(--text)",
                fontWeight: themeId === theme.id ? 600 : 400,
              }}
            >
              {theme.name}
            </span>
            {themeId === theme.id && (
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  color: "var(--accent)",
                }}
              >
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ThemeModal({ onClose }: { onClose: () => void }) {
  const { themeId, setTheme, availableThemes } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, var(--card) 0%, var(--gradient-card-end) 100%)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 16,
          padding: 24,
          minWidth: 320,
          maxWidth: 400,
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Palette size={20} style={{ color: "var(--accent)" }} />
            <h2 style={{ margin: 0, fontSize: 18, color: "var(--text)" }}>Select Theme</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close"
          >
            <X size={20} style={{ color: "var(--muted)" }} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {availableThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                setTheme(theme.id as ThemeId);
                onClose();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 10,
                border:
                  themeId === theme.id
                    ? "2px solid var(--accent)"
                    : "1px solid var(--border-subtle)",
                background:
                  themeId === theme.id
                    ? "var(--accent-bg-subtle)"
                    : "linear-gradient(135deg, var(--gradient-btn-start) 0%, var(--gradient-btn-end) 100%)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                width: "100%",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (themeId !== theme.id) {
                  e.currentTarget.style.borderColor = "var(--border-highlight)";
                }
              }}
              onMouseLeave={(e) => {
                if (themeId !== theme.id) {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                }
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: theme.colors.accent,
                  flexShrink: 0,
                  border: "2px solid var(--border-subtle)",
                }}
              />
              <span
                style={{
                  fontSize: 14,
                  color: themeId === theme.id ? "var(--accent)" : "var(--text)",
                  fontWeight: themeId === theme.id ? 600 : 400,
                }}
              >
                {theme.name}
              </span>
              {themeId === theme.id && (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 14,
                    color: "var(--accent)",
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ThemeDropdown({
  onClose,
}: {
  onClose?: () => void;
}) {
  const { themeId, setTheme, availableThemes } = useTheme();

  return (
    <div
      style={{
        display: "grid",
        gap: 4,
      }}
    >
      {availableThemes.map((theme) => (
        <button
          key={theme.id}
          onClick={() => {
            setTheme(theme.id as ThemeId);
            onClose?.();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderRadius: 8,
            border:
              themeId === theme.id
                ? "1px solid var(--accent)"
                : "1px solid transparent",
            background:
              themeId === theme.id
                ? "var(--accent-bg-subtle)"
                : "transparent",
            cursor: "pointer",
            transition: "all 0.15s ease",
            width: "100%",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            if (themeId !== theme.id) {
              e.currentTarget.style.background = "var(--accent-bg-subtle)";
            }
          }}
          onMouseLeave={(e) => {
            if (themeId !== theme.id) {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: theme.colors.accent,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 13,
              color: themeId === theme.id ? "var(--accent)" : "var(--text)",
              fontWeight: themeId === theme.id ? 500 : 400,
            }}
          >
            {theme.name}
          </span>
          {themeId === theme.id && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                color: "var(--accent)",
              }}
            >
              ✓
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
