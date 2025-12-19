"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminAccessShell from "@/components/AdminAccessShell";
import { supabase } from "@/lib/supabaseClient";

type ModelUsage = {
  date: string;
  model: string;
  api_calls: number;
};

type DailyUsage = {
  date: string;
  total: number;
  perModel: Record<string, number>;
};

type ModelHealthResult = {
  model: string;
  label?: string;
  ok: boolean;
  latencyMs?: number;
  sample?: string;
  error?: string;
};

type ModelHealthResponse = {
  ok: boolean;
  checkedAt: string;
  results: ModelHealthResult[];
};

const DAILY_LIMIT = 100;
const MODEL_COLORS = ["#7dd3fc", "#a78bfa", "#f472b6", "#facc15", "#34d399", "#38bdf8"];

export default function ApiUsagePage() {
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [modelTotals, setModelTotals] = useState<Record<string, number>>({});
  const [todayModelUsage, setTodayModelUsage] = useState<Record<string, number>>({});
  const [todayUsage, setTodayUsage] = useState<number>(0);
  const [healthResults, setHealthResults] = useState<ModelHealthResult[]>([]);
  const [healthCheckedAt, setHealthCheckedAt] = useState<string | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatModel, setChatModel] = useState<string>("gemini-3-pro-preview");
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; text: string; x: number; y: number }>(
    { visible: false, text: "", x: 0, y: 0 }
  );

  useEffect(() => {
    const fetchUsageData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch daily usage statistics grouped by model
        const { data, error: usageError } = await supabase.rpc("get_daily_gemini_usage_by_model");

        if (usageError) {
          console.error("Failed to fetch daily usage:", usageError);
          setError("Failed to load API usage statistics.");
          return;
        }

        const usageData = (data as ModelUsage[]) ?? [];
        const uniqueModels = Array.from(new Set(usageData.map((item) => item.model))).sort();
        const today = new Date().toISOString().split("T")[0];

        const dailyMap = new Map<string, { total: number; perModel: Record<string, number> }>();
        const totalsByModel: Record<string, number> = {};

        usageData.forEach((item) => {
          const current = dailyMap.get(item.date) ?? { total: 0, perModel: {} };
          const calls = Number(item.api_calls) || 0;

          current.total += calls;
          current.perModel[item.model] = (current.perModel[item.model] || 0) + calls;
          dailyMap.set(item.date, current);

          totalsByModel[item.model] = (totalsByModel[item.model] || 0) + calls;
        });

        const dailyRows = Array.from(dailyMap.entries())
          .map(([date, values]) => ({ date, total: values.total, perModel: values.perModel }))
          .sort((a, b) => (a.date < b.date ? 1 : -1));

        const todayRow = dailyRows.find((item) => item.date === today);

        setDailyUsage(dailyRows);
        setModels(uniqueModels);
        setModelTotals(totalsByModel);
        setTodayUsage(todayRow?.total ?? 0);
        setTodayModelUsage(todayRow?.perModel ?? {});
      } catch (err) {
        console.error("Error fetching usage data:", err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    void fetchUsageData();
  }, []);

  const totalLast30 = dailyUsage.reduce((sum, item) => sum + item.total, 0);
  const averagePerDay = dailyUsage.length > 0 ? totalLast30 / dailyUsage.length : 0;
  const peakUsage = dailyUsage.length > 0 ? Math.max(...dailyUsage.map((item) => item.total)) : 0;

  const formatModelLabel = (model: string) =>
    model
      .replace(/^gemini-/, "Gemini ")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const getModelColor = (model: string) => {
    const idx = models.indexOf(model);
    return MODEL_COLORS[idx >= 0 ? idx % MODEL_COLORS.length : 0];
  };

  const showTooltip = (event: React.MouseEvent<HTMLDivElement>, text: string) => {
    setTooltip({ visible: true, text, x: event.clientX, y: event.clientY });
  };

  const hideTooltip = () => setTooltip((prev) => ({ ...prev, visible: false }));

  const runModelHealthCheck = async () => {
    setHealthLoading(true);
    setHealthError(null);

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error("Missing Supabase session. Please sign in again.");
      }

      const response = await fetch("/api/admin/model-health", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const payload = (await response.json()) as ModelHealthResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload?.error ?? `Model health check failed (${response.status}).`);
      }

      setHealthResults(payload.results ?? []);
      setHealthCheckedAt(payload.checkedAt ?? null);
      setHealthOk(typeof payload.ok === "boolean" ? payload.ok : null);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : "Failed to check model APIs.");
      setHealthResults([]);
      setHealthOk(null);
      setHealthCheckedAt(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    if (models.length > 0) {
      setChatModel(models[0]);
    }
  }, [models]);

  const handleChatSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chatPrompt.trim()) {
      setChatError("Enter a prompt to send to the model.");
      return;
    }

    setChatLoading(true);
    setChatError(null);
    setChatResponse("");

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new Error("Missing Supabase session. Please sign in again.");
      }

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: chatPrompt.trim() }],
          model: chatModel
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage = "Failed to send prompt.";
        if (contentType && contentType.includes("application/json")) {
          try {
            const payload = await response.json();
            errorMessage = payload?.error || errorMessage;
          } catch {
            // ignore parse errors
          }
        }
        setChatError(errorMessage);
        setChatLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setChatError("No response stream received.");
        setChatLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              setChatError(parsed.error);
              setChatLoading(false);
              return;
            }
            if (parsed.text) {
              setChatResponse((prev) => prev + parsed.text);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error while sending prompt.";
      setChatError(message);
    } finally {
      setChatLoading(false);
    }
  };

  const chatModels =
    healthResults.length > 0
      ? healthResults.map((result) => ({
          value: result.model,
          label: result.label ?? formatModelLabel(result.model)
        }))
      : models.map((model) => ({
          value: model,
          label: formatModelLabel(model)
        }));

  if (chatModels.length === 0) {
    chatModels.push(
      { value: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview" },
      { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" }
    );
  }

  return (
    <AdminAccessShell>
      {() => (
        <div className="admin-stack">
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="title">Gemini API Usage Statistics</h2>
              <Link className="btn back-btn" href="/admin">
                Back to Admin
              </Link>
            </div>
            <p className="muted">Track daily Gemini API calls across all users (last 30 days)</p>

            <div
              className="card"
              style={{
                marginTop: 16,
                background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(16,185,129,0.08))",
                border: "1px solid rgba(255,255,255,0.08)"
              }}
            >
              <div
                className="row"
                style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}
              >
                <div>
                  <h3 style={{ marginBottom: 4 }}>AI Models API Health</h3>
                  <p className="muted" style={{ margin: 0 }}>
                    Verify we can reach every configured model endpoint before relying on them.
                  </p>
                </div>
                <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {healthOk !== null && (
                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: 12,
                        background: healthOk ? "rgba(16,185,129,0.16)" : "rgba(239,68,68,0.14)",
                        color: healthOk ? "var(--accent-2)" : "var(--error)",
                        fontWeight: 700,
                        fontSize: 12,
                        border: `1px solid ${healthOk ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)"}`
                      }}
                    >
                      {healthOk ? "All model APIs responding" : "At least one model failing"}
                    </span>
                  )}
                  <button
                    className="btn primary"
                    style={{ whiteSpace: "nowrap" }}
                    onClick={runModelHealthCheck}
                    disabled={healthLoading}
                  >
                    {healthLoading ? "Checking..." : "Run Health Check"}
                  </button>
                  <button
                    className="btn"
                    style={{ whiteSpace: "nowrap" }}
                    onClick={() => setChatOpen((prev) => !prev)}
                  >
                    AI Chat
                  </button>
                </div>
              </div>

              {healthError && (
                <p style={{ color: "var(--error)", marginTop: 12 }}>
                  {healthError}
                </p>
              )}

              {healthCheckedAt && (
                <p className="muted" style={{ marginTop: 8 }}>
                  Last checked at {new Date(healthCheckedAt).toLocaleString()}
                </p>
              )}

              {healthResults.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 12,
                    marginTop: 12
                  }}
                >
                  {healthResults.map((result) => (
                    <div
                      key={result.model}
                      className="card"
                      style={{
                        border: `1px solid ${
                          result.ok ? "rgba(16,185,129,0.45)" : "rgba(239,68,68,0.45)"
                        }`,
                        background: result.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)"
                      }}
                    >
                      <div
                        className="row"
                        style={{
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6
                        }}
                      >
                        <strong>{result.label ?? result.model}</strong>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: result.ok ? "var(--accent-2)" : "var(--error)"
                          }}
                        >
                          {result.ok ? "Healthy" : "Failed"}
                        </span>
                      </div>
                      <p className="muted" style={{ marginBottom: 6 }}>
                        {result.latencyMs != null ? `${result.latencyMs} ms` : "—"} response
                      </p>
                      {result.ok && result.sample && (
                        <p className="muted" style={{ fontSize: 12 }}>
                          Sample: {result.sample}
                        </p>
                      )}
                      {!result.ok && result.error && (
                        <p style={{ color: "var(--error)", fontSize: 12 }}>
                          {result.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {chatOpen && (
                <div className="card" style={{ marginTop: 12, background: "rgba(255,255,255,0.02)" }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ margin: 0 }}>AI Chat</h4>
                    <span className="muted" style={{ fontSize: 12 }}>
                      Send a quick prompt to any available model.
                    </span>
                  </div>
                  <form onSubmit={handleChatSubmit} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
                      <span className="muted" style={{ fontSize: 12 }}>
                        Model
                      </span>
                      <select
                        value={chatModel}
                        onChange={(event) => setChatModel(event.target.value)}
                        disabled={chatLoading}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid #233453",
                          background: "#0f172a",
                          color: "#e2e8f0"
                        }}
                      >
                        {chatModels.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
                      <span className="muted" style={{ fontSize: 12 }}>
                        Prompt
                      </span>
                      <textarea
                        rows={4}
                        value={chatPrompt}
                        onChange={(event) => setChatPrompt(event.target.value)}
                        placeholder="Ask the selected model anything..."
                        disabled={chatLoading}
                        style={{
                          borderRadius: 10,
                          border: "1px solid #233453",
                          padding: "10px 12px",
                          background: "#0f172a",
                          color: "#e2e8f0"
                        }}
                      />
                    </label>

                    {chatError && (
                      <p style={{ color: "var(--error)", margin: 0 }}>
                        {chatError}
                      </p>
                    )}

                    {chatResponse && (
                      <div
                        style={{
                          border: "1px solid #233453",
                          borderRadius: 10,
                          padding: "12px 14px",
                          background: "#0b1222",
                          color: "#e2e8f0",
                          whiteSpace: "pre-wrap"
                        }}
                      >
                        {chatResponse}
                      </div>
                    )}

                    <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setChatPrompt("");
                          setChatResponse("");
                          setChatError(null);
                        }}
                        disabled={chatLoading}
                      >
                        Reset
                      </button>
                      <button className="btn primary" type="submit" disabled={chatLoading}>
                        {chatLoading ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {loading && (
              <div style={{ marginTop: 24 }}>
                <p className="muted">Loading usage statistics...</p>
              </div>
            )}

            {error && (
              <div style={{ marginTop: 24 }}>
                <p style={{ color: "var(--error)" }}>Error: {error}</p>
              </div>
            )}

            {!loading && !error && (
              <>
                {/* Today's Usage Card */}
                <div
                  className="card"
                  style={{
                    marginTop: 24,
                    background: "linear-gradient(135deg, #1a2942 0%, #0d172b 100%)",
                    border: "2px solid var(--accent)"
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <p className="muted" style={{ fontSize: 14, marginBottom: 8 }}>
                      Today&apos;s API Calls
                    </p>
                    <h1 style={{ fontSize: 48, fontWeight: 700, color: "var(--accent)", margin: 0 }}>
                      {todayUsage}
                    </h1>
                    <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                      out of {DAILY_LIMIT} daily limit
                    </p>
                    <div
                      style={{
                        width: "100%",
                        height: 8,
                        background: "#16213b",
                        borderRadius: 4,
                        marginTop: 16,
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min((todayUsage / DAILY_LIMIT) * 100, 100)}%`,
                          height: "100%",
                          background: todayUsage >= DAILY_LIMIT ? "var(--error)" : "var(--accent)",
                          transition: "width 0.3s ease"
                        }}
                      />
                    </div>
                    {models.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "center",
                          gap: 8,
                          marginTop: 12
                        }}
                      >
                        {models.map((model) => (
                          <span
                            key={`today-${model}`}
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              padding: "6px 10px",
                              borderRadius: 12,
                              fontSize: 12,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6
                            }}
                          >
                            <span className="muted">{formatModelLabel(model)}</span>
                            <strong style={{ color: "var(--accent)", fontWeight: 700 }}>
                              {todayModelUsage[model] ?? 0}
                            </strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Stats */}
                <div
                  style={{
                    marginTop: 32,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16
                  }}
                >
                  <div className="card" style={{ textAlign: "center" }}>
                    <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                      Total (30 days)
                    </p>
                    <p style={{ fontSize: 24, fontWeight: 700 }}>{totalLast30}</p>
                  </div>
                  <div className="card" style={{ textAlign: "center" }}>
                    <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                      Average per day
                    </p>
                    <p style={{ fontSize: 24, fontWeight: 700 }}>
                      {averagePerDay.toFixed(1)}
                    </p>
                  </div>
                  <div className="card" style={{ textAlign: "center" }}>
                    <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                      Peak usage
                    </p>
                    <p style={{ fontSize: 24, fontWeight: 700 }}>{peakUsage}</p>
                  </div>
                  <div className="card" style={{ textAlign: "center" }}>
                    <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                      Days with data
                    </p>
                    <p style={{ fontSize: 24, fontWeight: 700 }}>{dailyUsage.length}</p>
                  </div>
                </div>

                {/* Model Breakdown */}
                {models.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <h3 style={{ marginBottom: 12 }}>Model Breakdown (Last 30 Days)</h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 12
                      }}
                    >
                      {models.map((model) => (
                        <div key={model} className="card" style={{ textAlign: "center" }}>
                          <p className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                            {formatModelLabel(model)}
                          </p>
                          <p style={{ fontSize: 24, fontWeight: 700 }}>{modelTotals[model] ?? 0}</p>
                          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                            Today: {todayModelUsage[model] ?? 0}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last 30 Days Table */}
                <div style={{ marginTop: 32 }}>
                  <h3 style={{ marginBottom: 12 }}>Daily Usage (Last 30 Days)</h3>
                  {models.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "center",
                        marginBottom: 8
                      }}
                    >
                      {models.map((model) => (
                        <span
                          key={`legend-${model}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 10px",
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            fontSize: 12
                          }}
                        >
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 4,
                              background: getModelColor(model)
                            }}
                          />
                          <span className="muted">{formatModelLabel(model)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {dailyUsage.length === 0 ? (
                    <p className="muted">No API usage data available for the last 30 days.</p>
                  ) : (
                    <div style={{ overflowX: "auto", position: "relative" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: 14
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              borderBottom: "2px solid #233453",
                              textAlign: "left"
                            }}
                          >
                            <th style={{ padding: "12px 16px", fontWeight: 600 }}>Date</th>
                            <th style={{ padding: "12px 16px", fontWeight: 600 }}>Day</th>
                            <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "right" }}>
                              Total
                            </th>
                            <th style={{ padding: "12px 16px", fontWeight: 600 }}>Usage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyUsage.map((item) => {
                            const date = new Date(item.date);
                            const isToday = item.date === new Date().toISOString().split("T")[0];
                            const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                            const formattedDate = date.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            });
                            const percentage = Math.min((item.total / DAILY_LIMIT) * 100, 100);
                            const tooltipText = models
                              .map((model) => `${formatModelLabel(model)}: ${item.perModel[model] ?? 0}`)
                              .join(" | ");

                            return (
                              <tr
                                key={item.date}
                                style={{
                                  borderBottom: "1px solid #16213b",
                                  background: isToday ? "rgba(74, 222, 128, 0.05)" : "transparent"
                                }}
                              >
                                <td
                                  style={{
                                    padding: "12px 16px",
                                    fontWeight: isToday ? 600 : 400
                                  }}
                                >
                                  {formattedDate}
                                  {isToday && (
                                    <span
                                      style={{
                                        marginLeft: 8,
                                        fontSize: 12,
                                        color: "var(--accent)",
                                        fontWeight: 600
                                      }}
                                    >
                                      Today
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: "12px 16px" }} className="muted">
                                  {dayName}
                                </td>
                                <td
                                  style={{
                                    padding: "12px 16px",
                                    textAlign: "right",
                                    fontWeight: 600,
                                    fontSize: 16
                                  }}
                                >
                                  {item.total}
                                </td>
                                <td style={{ padding: "12px 16px", minWidth: 200 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div
                                      style={{
                                        flex: 1,
                                        height: 6,
                                        background: "#16213b",
                                        borderRadius: 3,
                                        overflow: "hidden"
                                      }}
                                      title={tooltipText}
                                      aria-label={`Usage breakdown: ${tooltipText}`}
                                      onMouseEnter={(e) => showTooltip(e, tooltipText)}
                                      onMouseMove={(e) => showTooltip(e, tooltipText)}
                                      onMouseLeave={hideTooltip}
                                    >
                                      <div
                                        style={{
                                          width: `${percentage}%`,
                                          height: "100%",
                                          display: "flex",
                                          overflow: "hidden",
                                          transition: "width 0.3s ease"
                                        }}
                                      >
                                        {models.map((model) => {
                                          const modelUsage = item.perModel[model] ?? 0;
                                          if (modelUsage <= 0 || item.total <= 0) return null;
                                          const share = (modelUsage / item.total) * 100;
                                          return (
                                            <div
                                              key={`${item.date}-${model}`}
                                              style={{
                                                width: `${share}%`,
                                                height: "100%",
                                                background: getModelColor(model)
                                              }}
                                            />
                                          );
                                        })}
                                      </div>
                                    </div>
                                    <span className="muted" style={{ fontSize: 12, minWidth: 40 }}>
                                      {percentage.toFixed(0)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {tooltip.visible && (
                        <div
                          style={{
                            position: "fixed",
                            top: tooltip.y + 12,
                            left: tooltip.x + 12,
                            background: "rgba(15, 23, 42, 0.9)",
                            color: "#fff",
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.08)",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                            fontSize: 12,
                            zIndex: 20,
                            pointerEvents: "none",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {tooltip.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminAccessShell>
  );
}
