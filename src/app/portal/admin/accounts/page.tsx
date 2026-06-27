"use client";

import { useEffect, useState } from "react";

export default function AccountsAdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/users", { credentials: "include" })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => ok ? setUsers(data.users || []) : setError(data.error || "Could not load accounts"))
      .catch(() => setError("Could not load accounts"));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-ink">Staff & Client Accounts</h1>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-muted"><tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Role</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id} className="border-t border-border"><td className="px-4 py-3 font-bold">{u.legal_name || "Unknown"}</td><td className="px-4 py-3 text-muted">{u.email}</td><td className="px-4 py-3 text-xs font-black uppercase">{u.role}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
