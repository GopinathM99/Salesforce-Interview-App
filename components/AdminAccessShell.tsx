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
          <p className="muted">Use a Supabase Auth email/password user. Create one in your project's Authentication tab.</p>
        </form>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          margin: '24px 0',
          gap: '12px'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
        </div>

        <button 
          className="btn" 
          type="button"
          onClick={() => void ctx.signInWithGoogle()}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 24px'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" fillRule="evenodd">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853"/>
              <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
            </g>
          </svg>
          Sign in with Google
        </button>
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
