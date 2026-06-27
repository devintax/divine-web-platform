"use client";

import { useEffect, useMemo, useState } from "react";

export default function ClientsAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/users", { credentials: "include" }).then((res) => res.json()).then((data) => setUsers(data.users || [])).catch(() => setUsers([]));
  }, []);

  const clients = useMemo(() => users.filter((u) => u.role === "client" && `${u.legal_name} ${u.email}`.toLowerCase().includes(query.toLowerCase())), [query, users]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-ink">Clients</h1>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients" className="w-full rounded-xl border border-border px-4 py-3 text-sm" />
      <div className="space-y-2">
        {clients.map((client) => (
          <div key={client.id} className="rounded-2xl border border-border bg-white p-4">
            <div className="text-sm font-black text-ink">{client.legal_name || "Unknown client"}</div>
            <div className="text-xs text-muted">{client.email}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
