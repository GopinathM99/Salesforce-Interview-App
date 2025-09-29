"use client";

import Link from "next/link";
import AdminAccessShell from "@/components/AdminAccessShell";

const tiles = [
  {
    title: "New Question",
    description: "Create fresh interview questions and store them in the database.",
    href: "/admin/new-question",
    cta: "Open Form"
  },
  {
    title: "Admin Users",
    description: "Invite new admins, set a primary, or review existing access.",
    href: "/admin/admin-users",
    cta: "Manage Admins"
  },
  {
    title: "CSV Import/Export",
    description: "Bulk export questions or import updates from a spreadsheet.",
    href: "/admin/import-export",
    cta: "Open CSV Tools"
  },
  {
    title: "Edit Questions",
    description: "Filter, update, or delete questions already in the library.",
    href: "/admin/edit-questions",
    cta: "Review Questions"
  }
] as const;

export default function AdminHomePage() {
  return (
    <AdminAccessShell>
      {(ctx) => (
        <div className="admin-stack">
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="title">Admin Tools</h2>
              <button className="btn" onClick={() => void ctx.signOut()}>Sign Out</button>
            </div>
            {ctx.currentUserEmail && (
              <p className="muted" style={{ marginBottom: 12 }}>Signed in as {ctx.currentUserEmail}</p>
            )}
            <p className="muted">
              Pick a tile to manage interview content, admin access, or CSV workflows.
            </p>
            <div className="grid" style={{ marginTop: 12 }}>
              {tiles.map((tile) => (
                <div className="card" key={tile.href}>
                  <h3>{tile.title}</h3>
                  <p>{tile.description}</p>
                  <Link className="btn primary" href={tile.href} style={{ marginTop: 12, display: "inline-block" }}>
                    {tile.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminAccessShell>
  );
}
