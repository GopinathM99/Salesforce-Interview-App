"use client";

import Link from "next/link";
import AdminAccessShell from "@/components/AdminAccessShell";

const tiles = [
  {
    title: "Add New Questions",
    description: "Create fresh interview questions and store them in the database.",
    href: "/admin/new-question",
    cta: "Add Questions"
  },
  {
    title: "User Directory",
    description: "See every user who has signed in and when they last visited.",
    href: "/admin/users",
    cta: "View Users"
  },
  {
    title: "Admin Users",
    description: "Invite new admins, set a primary, or review existing access.",
    href: "/admin/admin-users",
    cta: "Manage Admins"
  },
  {
    title: "Metrics",
    description: "Review question counts by topic and difficulty.",
    href: "/admin/metrics",
    cta: "View Metrics"
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
      {() => (
        <div className="admin-stack">
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="title">Admin Tools</h2>
              <Link className="btn" href="/">Back to Home Page</Link>
            </div>
            <p className="muted">
              Pick a tile to manage interview content, admin access, or review metrics.
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
