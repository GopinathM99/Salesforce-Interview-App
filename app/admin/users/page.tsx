"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import AdminAccessShell from "@/components/AdminAccessShell";
import { supabase } from "@/lib/supabaseClient";

type UserProfile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  first_signed_in_at: string;
  last_signed_in_at: string;
};

const formatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short"
});

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatter.format(date);
};

export default function AdminUserDirectoryPage() {
  return (
    <AdminAccessShell>
      {() => <Content />}
    </AdminAccessShell>
  );
}

function Content() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("user_profiles")
      .select("user_id, first_name, last_name, email, first_signed_in_at, last_signed_in_at")
      .order("last_signed_in_at", { ascending: false, nullsFirst: false });
    if (error) {
      setError(error.message);
      setProfiles([]);
    } else {
      setProfiles(((data ?? []) as UserProfile[]).map((row) => ({ ...row })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const totalUsers = profiles.length;
  const latestSignIn = useMemo(() => profiles[0]?.last_signed_in_at ?? null, [profiles]);

  return (
    <div className="admin-stack">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 className="title" style={{ marginBottom: 4 }}>User Directory</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              Track everyone who has authenticated, plus their first and most recent sign-ins.
            </p>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => void loadProfiles()} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <Link className="btn" href="/admin">
              Back to Admin Home
            </Link>
          </div>
        </div>
        <div className="row" style={{ gap: 16, marginTop: 16, flexWrap: "wrap" }}>
          <span className="pill">Users: {totalUsers}</span>
          {latestSignIn && (
            <span className="pill">Last sign-in: {formatDateTime(latestSignIn)}</span>
          )}
        </div>
        {error && (
          <p className="muted" style={{ marginTop: 12 }}>
            Error loading users: {error}
          </p>
        )}
        <div style={{ marginTop: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={headerCellStyle}>First Name</th>
                <th style={headerCellStyle}>Last Name</th>
                <th style={headerCellStyle}>Email</th>
                <th style={headerCellStyle}>First Sign-In</th>
                <th style={headerCellStyle}>Last Sign-In</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} style={emptyCellStyle}>
                    No users have signed in yet.
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => (
                  <tr key={profile.user_id}>
                    <td style={bodyCellStyle}>{profile.first_name ?? "—"}</td>
                    <td style={bodyCellStyle}>{profile.last_name ?? "—"}</td>
                    <td style={bodyCellStyle}>{profile.email}</td>
                    <td style={bodyCellStyle}>{formatDateTime(profile.first_signed_in_at)}</td>
                    <td style={bodyCellStyle}>{formatDateTime(profile.last_signed_in_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const headerCellStyle: CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  fontWeight: 600,
  fontSize: 14
};

const bodyCellStyle: CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  fontSize: 14,
  verticalAlign: "top"
};

const emptyCellStyle: CSSProperties = {
  padding: "16px",
  textAlign: "center",
  color: "var(--muted)"
};
