"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminAccessShell from "@/components/AdminAccessShell";
import { supabase } from "@/lib/supabaseClient";

type DailyUsage = {
  date: string;
  api_calls: number;
};

export default function ApiUsagePage() {
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [todayUsage, setTodayUsage] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsageData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch daily usage statistics
        const { data, error: usageError } = await supabase.rpc("get_daily_gemini_usage");

        if (usageError) {
          console.error("Failed to fetch daily usage:", usageError);
          setError("Failed to load API usage statistics.");
          return;
        }

        const today = new Date().toISOString().split("T")[0];
        const usageData = (data as DailyUsage[]) ?? [];

        // Find today's usage
        const todayData = usageData.find((item) => item.date === today);
        setTodayUsage(todayData?.api_calls ?? 0);

        // Set all daily usage
        setDailyUsage(usageData);
      } catch (err) {
        console.error("Error fetching usage data:", err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    void fetchUsageData();
  }, []);

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
                      out of 100 daily limit
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
                          width: `${Math.min((todayUsage / 100) * 100, 100)}%`,
                          height: "100%",
                          background: todayUsage >= 100 ? "var(--error)" : "var(--accent)",
                          transition: "width 0.3s ease"
                        }}
                      />
                    </div>
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
                    <p style={{ fontSize: 24, fontWeight: 700 }}>
                      {dailyUsage.reduce((sum, item) => sum + item.api_calls, 0)}
                    </p>
                  </div>
                  <div className="card" style={{ textAlign: "center" }}>
                    <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                      Average per day
                    </p>
                    <p style={{ fontSize: 24, fontWeight: 700 }}>
                      {dailyUsage.length > 0
                        ? (
                            dailyUsage.reduce((sum, item) => sum + item.api_calls, 0) /
                            dailyUsage.length
                          ).toFixed(1)
                        : 0}
                    </p>
                  </div>
                  <div className="card" style={{ textAlign: "center" }}>
                    <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                      Peak usage
                    </p>
                    <p style={{ fontSize: 24, fontWeight: 700 }}>
                      {dailyUsage.length > 0 ? Math.max(...dailyUsage.map((item) => item.api_calls)) : 0}
                    </p>
                  </div>
                  <div className="card" style={{ textAlign: "center" }}>
                    <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                      Days with data
                    </p>
                    <p style={{ fontSize: 24, fontWeight: 700 }}>{dailyUsage.length}</p>
                  </div>
                </div>

                {/* Last 30 Days Table */}
                <div style={{ marginTop: 32 }}>
                  <h3 style={{ marginBottom: 16 }}>Daily Usage (Last 30 Days)</h3>
                  {dailyUsage.length === 0 ? (
                    <p className="muted">No API usage data available for the last 30 days.</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
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
                              API Calls
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
                            const percentage = Math.min((item.api_calls / 100) * 100, 100);

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
                                  {item.api_calls}
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
                                    >
                                      <div
                                        style={{
                                          width: `${percentage}%`,
                                          height: "100%",
                                          background:
                                            item.api_calls >= 100 ? "var(--error)" : "var(--accent)",
                                          transition: "width 0.3s ease"
                                        }}
                                      />
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
