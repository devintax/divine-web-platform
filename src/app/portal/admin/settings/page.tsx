"use client";

import { useEffect, useState } from "react";

export default function SettingsAdminPage() {
  const [config, setConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch("/api/config/status", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setConfig(data.config || {}))
      .catch(() => setConfig({}));
  }, []);

  const settings = [
    ["InsForge URL", "NEXT_PUBLIC_INSFORGE_URL"],
    ["Temporal Namespace", "TEMPORAL_NAMESPACE"],
    ["App URL", "NEXT_PUBLIC_APP_URL"],
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-ink">Platform Settings</h1>
      <div className="rounded-2xl border border-border bg-white divide-y divide-border">
        {settings.map(([label, value]) => (
          <div key={label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-4 py-3">
            <div className="text-sm font-bold text-ink">{label}</div>
            <div className="text-xs text-muted">{value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(config).map(([name, state]) => (
          <div key={name} className={`rounded-2xl border p-4 ${state.configured ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="text-sm font-black capitalize text-ink">{name}</div>
            <div className="mt-1 text-xs font-bold">{state.configured ? "Configured" : "Needs credentials"}</div>
            {state.missing?.length > 0 && <div className="mt-2 text-xs text-muted">Missing: {state.missing.join(", ")}</div>}
            {state.dirty?.length > 0 && <div className="mt-1 text-xs text-red-700">Trailing whitespace: {state.dirty.join(", ")}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
