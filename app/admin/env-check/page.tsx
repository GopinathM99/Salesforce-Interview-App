"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AdminAccessShell from "@/components/AdminAccessShell";

interface EnvVariable {
  name: string;
  present: boolean;
  preview: string | null;
}

export default function EnvCheckPage() {
  const [variables, setVariables] = useState<EnvVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnvStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/check-env');
      if (!response.ok) {
        throw new Error('Failed to fetch environment variables');
      }
      const data = await response.json();
      setVariables(data.variables);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvStatus();
  }, []);

  const presentCount = variables.filter(v => v.present).length;
  const missingCount = variables.filter(v => !v.present).length;

  return (
    <AdminAccessShell>
      {() => (
        <div className="admin-stack">
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="title">Environment Variables Check</h2>
              <Link className="btn back-btn" href="/admin">Back to Admin</Link>
            </div>

            <p className="muted">
              Check which environment variables are configured and which are missing.
            </p>

            <div className="row" style={{ gap: 16, marginTop: 16 }}>
              <button
                onClick={fetchEnvStatus}
                className="btn primary"
                disabled={loading}
              >
                {loading ? 'Checking...' : 'Refresh Status'}
              </button>
            </div>

            {error && (
              <div className="card" style={{ marginTop: 16, border: '1px solid var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <p style={{ color: 'var(--danger)' }}>Error: {error}</p>
              </div>
            )}

            {!loading && !error && (
              <>
                <div className="row" style={{ gap: 24, marginTop: 24, marginBottom: 16 }}>
                  <div className="card" style={{ flex: 1, backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent-2)' }}>
                    <h3 style={{ color: 'var(--accent-2)' }}>Present</h3>
                    <p style={{ fontSize: 32, fontWeight: 'bold', color: 'var(--accent-2)', margin: 0 }}>
                      {presentCount}
                    </p>
                  </div>
                  <div className="card" style={{ flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
                    <h3 style={{ color: 'var(--danger)' }}>Missing</h3>
                    <p style={{ fontSize: 32, fontWeight: 'bold', color: 'var(--danger)', margin: 0 }}>
                      {missingCount}
                    </p>
                  </div>
                </div>

                <div className="card" style={{ marginTop: 16 }}>
                  <h3>Environment Variables Status</h3>
                  <div style={{ overflowX: 'auto', marginTop: 12 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Variable Name</th>
                          <th style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Preview</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variables.map((variable, index) => (
                          <tr
                            key={variable.name}
                            style={{
                              borderBottom: index < variables.length - 1 ? '1px solid var(--border)' : 'none',
                              backgroundColor: variable.present ? 'transparent' : 'rgba(239, 68, 68, 0.05)'
                            }}
                          >
                            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 14 }}>
                              {variable.name}
                            </td>
                            <td style={{ padding: 12, textAlign: 'center' }}>
                              {variable.present ? (
                                <span style={{
                                  padding: '4px 12px',
                                  borderRadius: 4,
                                  backgroundColor: 'var(--accent-2)',
                                  color: 'white',
                                  fontWeight: 500,
                                  fontSize: 12
                                }}>
                                  ✓ Present
                                </span>
                              ) : (
                                <span style={{
                                  padding: '4px 12px',
                                  borderRadius: 4,
                                  backgroundColor: 'var(--danger)',
                                  color: 'white',
                                  fontWeight: 500,
                                  fontSize: 12
                                }}>
                                  ✗ Missing
                                </span>
                              )}
                            </td>
                            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>
                              {variable.preview || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {missingCount > 0 && (
                  <div className="card" style={{ marginTop: 16, border: '1px solid var(--accent-4)', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                    <h4 style={{ color: 'var(--accent-4)' }}>Action Required</h4>
                    <p style={{ marginTop: 8 }}>
                      Some environment variables are missing. Please add them to your .env file or hosting platform configuration.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </AdminAccessShell>
  );
}
