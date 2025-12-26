"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function LiveAgentPage() {
  const { user } = useAuth();

  return (
    <div className="grid">
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 className="title">Live Agent Prep</h2>
          <Link className="btn back-btn" href="/">
            Back to Home
          </Link>
        </div>
        <p>
          Practice mock interviews with an AI interviewer. Choose your preferred interaction mode below.
        </p>

        {!user && (
          <p
            style={{
              marginTop: 16,
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
            Log in to access live mock interviews.
          </p>
        )}

        <div
          className="grid"
          style={{
            marginTop: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20
          }}
        >
          {/* Live Chat Option */}
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)",
              borderColor: "rgba(59, 130, 246, 0.3)",
              opacity: user ? 1 : 0.6
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span
                style={{
                  fontSize: 32,
                  width: 48,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(59, 130, 246, 0.2)",
                  borderRadius: 12
                }}
              >
                💬
              </span>
              <h3 style={{ margin: 0 }}>Live Chat</h3>
            </div>
            <p style={{ marginBottom: 16, color: "#94a3b8" }}>
              Type your responses and interact with the AI interviewer through text messages.
              Great for practicing articulation and reviewing your answers.
            </p>
            <ul style={{ margin: "0 0 16px 0", padding: "0 0 0 20px", color: "#94a3b8", fontSize: 14 }}>
              <li>Text-based conversation</li>
              <li>Easy to review and edit responses</li>
              <li>Works without microphone access</li>
            </ul>
            {user ? (
              <Link
                className="btn primary"
                href="/live-agent/chat"
                style={{ display: "inline-block" }}
              >
                Start Live Chat
              </Link>
            ) : (
              <button
                className="btn"
                disabled
                style={{ cursor: "not-allowed" }}
              >
                Start Live Chat
              </button>
            )}
          </div>

          {/* Live Audio Option */}
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)",
              borderColor: "rgba(16, 185, 129, 0.3)",
              opacity: user ? 1 : 0.6
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span
                style={{
                  fontSize: 32,
                  width: 48,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(16, 185, 129, 0.2)",
                  borderRadius: 12
                }}
              >
                🎙️
              </span>
              <h3 style={{ margin: 0 }}>Live Audio</h3>
            </div>
            <p style={{ marginBottom: 16, color: "#94a3b8" }}>
              Speak naturally with the AI interviewer using your microphone.
              The most realistic interview simulation experience.
            </p>
            <ul style={{ margin: "0 0 16px 0", padding: "0 0 0 20px", color: "#94a3b8", fontSize: 14 }}>
              <li>Voice-based real-time conversation</li>
              <li>Natural interview experience</li>
              <li>Automatic speech transcription</li>
            </ul>
            {user ? (
              <Link
                className="btn primary"
                href="/live-agent/audio"
                style={{ display: "inline-block" }}
              >
                Start Live Audio
              </Link>
            ) : (
              <button
                className="btn"
                disabled
                style={{ cursor: "not-allowed" }}
              >
                Start Live Audio
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
