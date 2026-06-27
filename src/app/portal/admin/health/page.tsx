"use client";

import { useEffect, useState } from "react";

export default function HealthAdminPage() {
  const [health, setHealth] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/health").then((res) => res.json()).then(setHealth).catch(() => setHealth({ status: "error" }));
    fetch("/api/admin/stats", { credentials: "include" }).then((res) => res.json()).then(setStats).catch(() => setStats(null));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-ink">System Health</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-white p-4"><div className="text-xs font-bold text-muted uppercase">Next.js</div><div className="mt-1 text-2xl font-black text-green-700">{health?.status || "checking"}</div></div>
        <div className="rounded-2xl border border-border bg-white p-4"><div className="text-xs font-bold text-muted uppercase">Open Cases</div><div className="mt-1 text-2xl font-black text-[#0B4DA2]">{stats ? stats.inReview : "..."}</div></div>
        <div className="rounded-2xl border border-border bg-white p-4"><div className="text-xs font-bold text-muted uppercase">Ready</div><div className="mt-1 text-2xl font-black text-green-700">{stats ? stats.ready : "..."}</div></div>
      </div>
    </div>
  );
}
