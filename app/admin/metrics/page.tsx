"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminAccessShell from "@/components/AdminAccessShell";
import type { UseAdminAccessResult } from "@/lib/useAdminAccess";
import type { Difficulty } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";

type MetricsRow = {
  topic: string;
  counts: Record<string, number>;
  total: number;
};

const defaultDifficultyOrder: Difficulty[] = ["easy", "medium", "hard"];

export default function AdminMetricsPage() {
  return (
    <AdminAccessShell>
      {(ctx) => <Content ctx={ctx} />}
    </AdminAccessShell>
  );
}

type ContentProps = {
  ctx: UseAdminAccessResult;
};

function Content({ ctx: _ctx }: ContentProps) {
  void _ctx;
  const [rows, setRows] = useState<MetricsRow[]>([]);
  const [difficultyOrder, setDifficultyOrder] = useState<string[]>([...defaultDifficultyOrder]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("questions")
      .select("topic, difficulty");

    if (queryError) {
      setError(queryError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const raw = (data as Array<{ topic: string | null; difficulty: Difficulty | null }> | null) ?? [];

    const topicMap = new Map<string, Record<string, number>>();
    const difficultySet = new Set<string>();

    raw.forEach((entry) => {
      const topic = (entry.topic?.trim() ?? "") || "Uncategorized";
      const difficulty = (entry.difficulty?.trim().toLowerCase() ?? "") || "unspecified";

      difficultySet.add(difficulty);

      if (!topicMap.has(topic)) {
        topicMap.set(topic, {});
      }

      const current = topicMap.get(topic)!;
      current[difficulty] = (current[difficulty] ?? 0) + 1;
    });

    const orderedDifficulties = buildDifficultyOrder(difficultySet);

    const nextRows: MetricsRow[] = Array.from(topicMap.entries())
      .map(([topic, counts]) => {
        const filledCounts: Record<string, number> = {};
        let total = 0;
        orderedDifficulties.forEach((difficulty) => {
          const value = counts[difficulty] ?? 0;
          filledCounts[difficulty] = value;
          total += value;
        });
        return { topic, counts: filledCounts, total };
      })
      .sort((a, b) => a.topic.localeCompare(b.topic, undefined, { sensitivity: "base" }));

    setDifficultyOrder(orderedDifficulties);
    setRows(nextRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    difficultyOrder.forEach((difficulty) => {
      totals[difficulty] = 0;
    });

    let overall = 0;

    rows.forEach((row) => {
      difficultyOrder.forEach((difficulty) => {
        const value = row.counts[difficulty] ?? 0;
        totals[difficulty] += value;
        overall += value;
      });
    });

    return { totals, overall };
  }, [difficultyOrder, rows]);

  return (
    <div className="admin-stack">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="title">Metrics</h2>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link className="btn" href="/admin">Back to Admin Home Page</Link>
          </div>
        </div>
        <p className="muted">
          View the distribution of questions by topic and difficulty to understand content coverage.
        </p>
        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => void loadMetrics()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh Metrics"}
          </button>
          {loading && <span className="muted">Loading latest counts…</span>}
        </div>
        {error && <p className="muted">Error: {error}</p>}
      </div>

      <div className="card">
        {rows.length === 0 && !loading ? (
          <p className="muted">No questions found yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={cellStyles.headerLeft}>Topic</th>
                  {difficultyOrder.map((difficulty) => (
                    <th key={difficulty} style={cellStyles.headerRight}>{formatDifficultyLabel(difficulty)}</th>
                  ))}
                  <th style={cellStyles.headerRight}>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.topic}>
                    <td style={cellStyles.topic}>{row.topic}</td>
                    {difficultyOrder.map((difficulty) => (
                      <td key={difficulty} style={cellStyles.cell}>
                        {row.counts[difficulty]?.toLocaleString() ?? "0"}
                      </td>
                    ))}
                    <td style={cellStyles.total}>{row.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={cellStyles.footerLeft}>Total</td>
                  {difficultyOrder.map((difficulty) => (
                    <td key={difficulty} style={cellStyles.footer}>
                      {columnTotals.totals[difficulty]?.toLocaleString() ?? "0"}
                    </td>
                  ))}
                  <td style={cellStyles.footer}>{columnTotals.overall.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function buildDifficultyOrder(difficultySet: Set<string>) {
  const normalized = Array.from(difficultySet).filter(Boolean);
  const extras = normalized
    .filter((diff) => !defaultDifficultyOrder.includes(diff))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  return [...defaultDifficultyOrder, ...extras];
}

function formatDifficultyLabel(label: string) {
  if (label === "unspecified") return "Unspecified";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const cellStyles = {
  headerLeft: {
    textAlign: "left" as const,
    borderBottom: "1px solid var(--border-muted, #ddd)",
    padding: "8px 12px",
    fontWeight: 600
  },
  headerRight: {
    textAlign: "right" as const,
    borderBottom: "1px solid var(--border-muted, #ddd)",
    padding: "8px 12px",
    fontWeight: 600
  },
  topic: {
    padding: "8px 12px",
    fontWeight: 600
  },
  cell: {
    padding: "8px 12px",
    textAlign: "right" as const
  },
  total: {
    padding: "8px 12px",
    textAlign: "right" as const,
    fontWeight: 600
  },
  footer: {
    padding: "8px 12px",
    textAlign: "right" as const,
    borderTop: "1px solid var(--border-muted, #ddd)",
    fontWeight: 600
  },
  footerLeft: {
    padding: "8px 12px",
    textAlign: "left" as const,
    borderTop: "1px solid var(--border-muted, #ddd)",
    fontWeight: 600
  }
};
