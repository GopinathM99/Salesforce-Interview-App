"use client";

import { useAdminAccess, type UseAdminAccessResult } from "@/lib/useAdminAccess";
import type { ReactNode } from "react";

type AdminAccessShellProps = {
  children: (context: UseAdminAccessResult) => ReactNode;
};

export default function AdminAccessShell({ children }: AdminAccessShellProps) {
  const ctx = useAdminAccess();

  if (!ctx.sessionReady) return null;

  if (!ctx.signedIn) {
    return (
      <div className="card">
        <h2 className="title">Admin Sign In</h2>
        <form
          className="col"
          style={{ gap: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            void ctx.signIn();
          }}
        >
          {ctx.authError && <p className="muted">Error: {ctx.authError}</p>}
          <div className="col">
            <label>Email</label>
            <input
              type="email"
              required
              value={ctx.email}
              onChange={(e) => ctx.setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div className="col">
            <label>Password</label>
            <input
              type="password"
              required
              value={ctx.password}
              onChange={(e) => ctx.setPassword(e.target.value)}
            />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary" type="submit">Sign In</button>
          </div>
          <p className="muted">Use a Supabase Auth email/password user. Create one in your project’s Authentication tab.</p>
        </form>
      </div>
    );
  }

  if (ctx.checkingAdmin) {
    return (
      <div className="card">
        <h2 className="title">Admin Access</h2>
        <p className="muted">Checking your permissions…</p>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => void ctx.signOut()}>Sign Out</button>
        </div>
      </div>
    );
  }

  if (!ctx.isAdmin) {
    return (
      <div className="card">
        <h2 className="title">Admin Access Required</h2>
        {ctx.adminCheckError && <p className="muted">Error: {ctx.adminCheckError}</p>}
        <p className="muted" style={{ marginTop: 8 }}>
          {ctx.currentUserEmail
            ? `Signed in as ${ctx.currentUserEmail}, but this account is not in the admin list.`
            : "Your account does not have admin permissions."}
        </p>
        <p className="muted" style={{ marginTop: 8 }}>
          Ask an existing admin to add your email to the Supabase table <code>admin_users</code>.
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => void ctx.signOut()}>Sign Out</button>
        </div>
      </div>
    );
  }

  return <>{children(ctx)}</>;
}
