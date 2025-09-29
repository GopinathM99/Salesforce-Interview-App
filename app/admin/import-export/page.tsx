"use client";

import AdminAccessShell from "@/components/AdminAccessShell";
import ImportExportPanel from "@/components/ImportExportPanel";
import type { UseAdminAccessResult } from "@/lib/useAdminAccess";

export default function AdminImportExportPage() {
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
  return (
    <div className="admin-stack">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="title">CSV Import/Export</h2>
          <button className="btn" onClick={() => void ctx.signOut()}>Sign Out</button>
        </div>
        {ctx.currentUserEmail && (
          <p className="muted" style={{ marginBottom: 12 }}>Signed in as {ctx.currentUserEmail}</p>
        )}
        <p className="muted">
          Export questions for backup or offline review, and import updates from a CSV file. Imports support up to 10K
          rows at a time and handle MCQ content automatically.
        </p>
      </div>

      <ImportExportPanel />
    </div>
  );
}
