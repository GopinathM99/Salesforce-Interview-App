"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminAccessShell from "@/components/AdminAccessShell";
import type { UseAdminAccessResult } from "@/lib/useAdminAccess";
import { supabase } from "@/lib/supabaseClient";

type AdminEntry = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_primary: boolean;
  created_at: string;
};

export default function AdminUsersPage() {
  return (
    <AdminAccessShell>
      {(ctx) => <Content ctx={ctx} />}
    </AdminAccessShell>
  );
}

type ContentProps = {
  ctx: UseAdminAccessResult;
};

function Content({ ctx }: ContentProps) {
  const [adminEntries, setAdminEntries] = useState<AdminEntry[]>([]);
  const [adminListLoading, setAdminListLoading] = useState(false);
  const [adminListError, setAdminListError] = useState<string | null>(null);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminFirstName, setNewAdminFirstName] = useState("");
  const [newAdminLastName, setNewAdminLastName] = useState("");
  const [hasPrimarySupport, setHasPrimarySupport] = useState(true);

  const loadAdmins = useCallback(async () => {
    setAdminListLoading(true);
    setAdminListError(null);
    const { data, error } = await supabase
      .from("admin_users")
      .select("email, first_name, last_name, is_primary, created_at")
      .order("is_primary", { ascending: false })
      .order("last_name", { ascending: true, nullsFirst: true })
      .order("first_name", { ascending: true, nullsFirst: true })
      .order("email", { ascending: true });
    if (error) {
      const needsPrimaryColumn = error.code === "42703" || /column "is_primary" does not exist/i.test(error.message ?? "");
      if (needsPrimaryColumn) {
        setHasPrimarySupport(false);
        setAdminListError(
          "Update your Supabase schema (run supabase/schema.sql) to add the is_primary column so primary admin features work."
        );
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("admin_users")
          .select("email, first_name, last_name, created_at")
          .order("last_name", { ascending: true, nullsFirst: true })
          .order("first_name", { ascending: true, nullsFirst: true })
          .order("email", { ascending: true });
        if (fallbackError) {
          setAdminListError(fallbackError.message);
          setAdminEntries([]);
        } else {
          const rows = (fallbackData as Omit<AdminEntry, "is_primary">[] | null) ?? [];
          setAdminEntries(rows.map((row) => ({ ...row, is_primary: false })));
        }
      } else {
        setAdminListError(error.message);
        setAdminEntries([]);
      }
    } else {
      setHasPrimarySupport(true);
      const rows = (data as AdminEntry[] | null) ?? [];
      setAdminEntries(rows);
    }
    setAdminListLoading(false);
  }, []);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  const makePrimaryAdmin = useCallback(async (targetEmail: string) => {
    if (!hasPrimarySupport) {
      setAdminListError("Primary admin support is unavailable. Apply the latest Supabase schema migration.");
      return;
    }
    setAdminActionLoading(true);
    setAdminListError(null);

    const { error: clearError } = await supabase
      .from("admin_users")
      .update({ is_primary: false })
      .neq("email", targetEmail);
    if (clearError) {
      setAdminListError(clearError.message);
      setAdminActionLoading(false);
      return;
    }

    const { error: setError } = await supabase
      .from("admin_users")
      .update({ is_primary: true })
      .eq("email", targetEmail);
    if (setError) {
      setAdminListError(setError.message);
      setAdminActionLoading(false);
      return;
    }

    await loadAdmins();
    setAdminActionLoading(false);
  }, [hasPrimarySupport, loadAdmins]);

  useEffect(() => {
    if (adminEntries.length === 0 || !hasPrimarySupport) return;
    if (adminEntries.some((entry) => entry.is_primary)) return;

    const defaultCandidate =
      adminEntries.find((entry) => {
        const first = entry.first_name?.trim().toLowerCase();
        const last = entry.last_name?.trim().toLowerCase();
        return first === "gopinath" && last === "merugumala";
      }) ?? adminEntries[0];

    void makePrimaryAdmin(defaultCandidate.email);
  }, [adminEntries, hasPrimarySupport, makePrimaryAdmin]);

  const handleAddAdmin = useCallback(async () => {
    const candidate = newAdminEmail.trim().toLowerCase();
    const first = newAdminFirstName.trim();
    const last = newAdminLastName.trim();
    if (!candidate) {
      setAdminListError("Enter an email address.");
      return;
    }
    if (!first || !last) {
      setAdminListError("Enter first and last name.");
      return;
    }

    const matchesDefaultPrimary =
      first.toLowerCase() === "gopinath" && last.toLowerCase() === "merugumala";
    const hasPrimary = adminEntries.some((entry) => entry.is_primary);
    const shouldAssignPrimary = hasPrimarySupport && (matchesDefaultPrimary || !hasPrimary);

    setAdminActionLoading(true);
    setAdminListError(null);
    const { error } = await supabase
      .from("admin_users")
      .insert({ email: candidate, first_name: first, last_name: last });
    if (error) {
      setAdminListError(error.message);
      setAdminActionLoading(false);
      return;
    }

    setNewAdminEmail("");
    setNewAdminFirstName("");
    setNewAdminLastName("");

    if (shouldAssignPrimary) {
      await makePrimaryAdmin(candidate);
    } else {
      await loadAdmins();
      setAdminActionLoading(false);
    }
  }, [adminEntries, hasPrimarySupport, makePrimaryAdmin, newAdminEmail, newAdminFirstName, newAdminLastName, loadAdmins]);

  const handleRemoveAdmin = useCallback(async (targetEmail: string) => {
    const entry = adminEntries.find((it) => it.email === targetEmail);
    if (hasPrimarySupport && entry?.is_primary) {
      setAdminListError("Primary admin cannot be removed. Assign another primary first.");
      return;
    }
    if (targetEmail === ctx.currentUserEmail) {
      setAdminListError("You cannot remove your own admin access.");
      return;
    }
    if (!confirm(`Remove ${targetEmail} from admins?`)) return;

    setAdminActionLoading(true);
    setAdminListError(null);
    const { error } = await supabase.from("admin_users").delete().eq("email", targetEmail);
    if (error) {
      setAdminListError(error.message);
    } else {
      await loadAdmins();
    }
    setAdminActionLoading(false);
  }, [adminEntries, ctx.currentUserEmail, hasPrimarySupport, loadAdmins]);

  const sortedEntries = useMemo(() => adminEntries, [adminEntries]);

  return (
    <div className="admin-stack">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="title">Admin Users</h2>
          <button className="btn" onClick={() => void ctx.signOut()}>Sign Out</button>
        </div>
        {ctx.currentUserEmail && (
          <p className="muted" style={{ marginBottom: 12 }}>Signed in as {ctx.currentUserEmail}</p>
        )}
        <p className="muted">
          Add colleagues who should manage content. Exactly one admin must be marked as primary, and the primary
          account cannot be removed.
        </p>
        {adminListError && <p className="muted">Error: {adminListError}</p>}
        <form
          className="row"
          style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            void handleAddAdmin();
          }}
        >
          <input
            type="text"
            placeholder="First name"
            value={newAdminFirstName}
            onChange={(e) => setNewAdminFirstName(e.target.value)}
            required
            style={{ flex: 1, minWidth: 160 }}
          />
          <input
            type="text"
            placeholder="Last name"
            value={newAdminLastName}
            onChange={(e) => setNewAdminLastName(e.target.value)}
            required
            style={{ flex: 1, minWidth: 160 }}
          />
          <input
            type="email"
            placeholder="new-admin@example.com"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            required
            style={{ flex: 1, minWidth: 220 }}
          />
          <button className="btn primary" type="submit" disabled={adminActionLoading}>
            {adminActionLoading ? "Saving…" : "Add Admin"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="title">Existing Admins</h3>
        <div style={{ marginTop: 12 }}>
          {adminListLoading ? (
            <p className="muted">Loading admins…</p>
          ) : sortedEntries.length === 0 ? (
            <p className="muted">No admins added yet.</p>
          ) : (
            <ul className="clean">
              {sortedEntries.map((entry) => {
                const displayName = [entry.first_name, entry.last_name]
                  .map((part) => part?.trim())
                  .filter((part): part is string => Boolean(part && part.length > 0))
                  .join(" ");

                return (
                  <li key={entry.email}>
                    <div className="row" style={{ justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <div className="col">
                        <strong>{displayName || entry.email}</strong>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {entry.email}
                        </span>
                        <span className="muted" style={{ fontSize: 12 }}>
                          Added {new Date(entry.created_at).toLocaleString()}
                        </span>
                        {entry.is_primary && (
                          <div className="row" style={{ gap: 6 }}>
                            <span className="pill">Primary</span>
                          </div>
                        )}
                      </div>
                      <div className="row" style={{ gap: 8, alignItems: "center" }}>
                        {hasPrimarySupport && !entry.is_primary && (
                          <button
                            className="btn"
                            onClick={() => void makePrimaryAdmin(entry.email)}
                            disabled={adminActionLoading}
                          >
                            Make Primary
                          </button>
                        )}
                        {entry.email === ctx.currentUserEmail ? (
                          <span className="pill">You</span>
                        ) : (
                          <button
                            className="btn danger"
                            onClick={() => void handleRemoveAdmin(entry.email)}
                            disabled={adminActionLoading || (hasPrimarySupport && entry.is_primary)}
                            title={hasPrimarySupport && entry.is_primary ? "Set another primary before removing this admin." : undefined}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
