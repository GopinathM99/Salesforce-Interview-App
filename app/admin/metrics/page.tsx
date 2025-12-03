"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminAccessShell from "@/components/AdminAccessShell";
import type { UseAdminAccessResult } from "@/lib/useAdminAccess";
import type { Difficulty } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";

type MetricsRow = {
  label: string;
  counts: Record<string, number>;
  total: number;
};

const defaultDifficultyOrder: Difficulty[] = ["easy", "medium", "hard"];
const defaultQuestionTypeOrder = ["Knowledge", "Scenarios"];
type GroupByOption = "topic" | "category";
type BreakdownOption = "difficulty" | "question_type";

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
  const [columnOrder, setColumnOrder] = useState<string[]>([...defaultDifficultyOrder]);
  const [groupBy, setGroupBy] = useState<GroupByOption>("topic");
  const [breakdownBy, setBreakdownBy] = useState<BreakdownOption>("difficulty");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("questions")
      .select("topic, category, difficulty, question_type");

    if (queryError) {
      setError(queryError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const raw =
      (data as
        Array<{
          topic: string | null;
          category: string | null;
          difficulty: Difficulty | null;
          question_type: string | null;
        }> | null) ?? [];

    const bucketMap = new Map<string, Record<string, number>>();
    const columnValueSet = new Set<string>();

    raw.forEach((entry) => {
      const bucketLabel =
        groupBy === "topic" ? entry.topic?.trim() ?? "" : entry.category?.trim() ?? "";
      const label = bucketLabel || "Uncategorized";
      const rawColumnValue =
        breakdownBy === "difficulty" ? entry.difficulty?.trim().toLowerCase() ?? "" : entry.question_type?.trim() ?? "";
      const columnValue = normalizeColumnValue(rawColumnValue, breakdownBy);

      columnValueSet.add(columnValue);

      if (!bucketMap.has(label)) {
        bucketMap.set(label, {});
      }

      const current = bucketMap.get(label)!;
      current[columnValue] = (current[columnValue] ?? 0) + 1;
    });

    const orderedColumns = buildColumnOrder(columnValueSet, breakdownBy);

    const nextRows: MetricsRow[] = Array.from(bucketMap.entries())
      .map(([label, counts]) => {
        const filledCounts: Record<string, number> = {};
        let total = 0;
        orderedColumns.forEach((column) => {
          const value = counts[column] ?? 0;
          filledCounts[column] = value;
          total += value;
        });
        return { label, counts: filledCounts, total };
      })
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

    setColumnOrder(orderedColumns);
    setRows(nextRows);
    setLoading(false);
  }, [groupBy, breakdownBy]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    columnOrder.forEach((column) => {
      totals[column] = 0;
    });

    let overall = 0;

    rows.forEach((row) => {
      columnOrder.forEach((column) => {
        const value = row.counts[column] ?? 0;
        totals[column] += value;
        overall += value;
      });
    });

    return { totals, overall };
  }, [columnOrder, rows]);

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
          View the distribution of questions by topic or category and difficulty or question type to understand content
          coverage.
        </p>
        <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
          <label className="muted" htmlFor="groupBy">Group by</label>
          <select
            id="groupBy"
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value as GroupByOption)}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border-muted, #ddd)" }}
            disabled={loading}
          >
            <option value="topic">Topic</option>
            <option value="category">Category</option>
          </select>
          <label className="muted" htmlFor="breakdownBy">Breakdown by</label>
          <select
            id="breakdownBy"
            value={breakdownBy}
            onChange={(event) => setBreakdownBy(event.target.value as BreakdownOption)}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border-muted, #ddd)" }}
            disabled={loading}
          >
            <option value="difficulty">Difficulty</option>
            <option value="question_type">Question Type</option>
          </select>
        </div>
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
                  <th style={cellStyles.headerLeft}>{groupBy === "topic" ? "Topic" : "Category"}</th>
                  {columnOrder.map((column) => (
                    <th key={column} style={cellStyles.headerRight}>
                      {breakdownBy === "difficulty" ? formatDifficultyLabel(column) : formatQuestionTypeLabel(column)}
                    </th>
                  ))}
                  <th style={cellStyles.headerRight}>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td style={cellStyles.topic}>{row.label}</td>
                    {columnOrder.map((column) => (
                      <td key={column} style={cellStyles.cell}>
                        {row.counts[column]?.toLocaleString() ?? "0"}
                      </td>
                    ))}
                    <td style={cellStyles.total}>{row.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={cellStyles.footerLeft}>Total</td>
                  {columnOrder.map((column) => (
                    <td key={column} style={cellStyles.footer}>
                      {columnTotals.totals[column]?.toLocaleString() ?? "0"}
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
  const normalized = Array.from(difficultySet).filter(Boolean) as string[];
  const extras = normalized
    .filter((diff) => !defaultDifficultyOrder.includes(diff as Difficulty))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  return [...defaultDifficultyOrder, ...extras];
}

function buildQuestionTypeOrder(typeSet: Set<string>) {
  const normalized = Array.from(typeSet).filter(Boolean);
  const extras = normalized
    .filter((type) => !defaultQuestionTypeOrder.includes(type))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  return [...defaultQuestionTypeOrder, ...extras];
}

function buildColumnOrder(values: Set<string>, breakdown: BreakdownOption) {
  if (breakdown === "difficulty") return buildDifficultyOrder(values);
  return buildQuestionTypeOrder(values);
}

function normalizeColumnValue(value: string, breakdown: BreakdownOption) {
  const sanitized = value.trim();
  if (!sanitized) return "unspecified";
  if (breakdown === "difficulty") return sanitized.toLowerCase();
  return sanitized;
}

function formatDifficultyLabel(label: string) {
  if (label === "unspecified") return "Unspecified";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatQuestionTypeLabel(label: string) {
  if (label === "unspecified") return "Unspecified";
  return label;
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
