"use client";

import { useEffect, useState } from "react";

export default function AuditAdminPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/audit", { credentials: "include" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => ok ? setLogs(data.logs || []) : setError(data.error || "Could not load audit logs"))
      .catch(() => setError("Could not load audit logs"));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-ink">Audit Logs</h1>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      <div className="space-y-2">
        {logs.length === 0 ? <p className="text-sm text-muted">No audit events found.</p> : logs.map((log) => (
          <div key={log.id} className="rounded-2xl border border-border bg-white p-4">
            <div className="text-sm font-black text-ink">{log.action}</div>
            <div className="mt-1 text-xs text-muted">{log.resource_type || "system"} · {log.event_category || "general"} · {log.created_at ? new Date(log.created_at).toLocaleString() : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
