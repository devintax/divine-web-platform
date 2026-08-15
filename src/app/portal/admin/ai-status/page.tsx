"use client";

import { useEffect, useState } from "react";

export default function AIStatusPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/ai/status", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setStatus(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="text-sm text-muted">Checking AI gateway...</div>;
  if (status?.error) return <div className="text-sm text-red-600">{status.error}</div>;

  const ai = status?.ai || {};
  const env = status?.env || {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-ink">AI Gateway Status</h1>
        <p className="text-xs text-muted mt-1">Server-side LiteLLM, Cloudflare Access, and OpenRouter fallback checks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatusCard label="AI Gateway" value={ai.healthy ? "Online" : "Unavailable"} tone={ai.healthy ? "green" : "red"} />
        <StatusCard label="Provider Used" value={ai.provider || "none"} tone={ai.provider === "litellm" ? "blue" : ai.provider === "openrouter" ? "gold" : "gray"} />
        <StatusCard label="Model" value={ai.model || env.AI_MODEL || "not configured"} tone="gray" />
      </div>

      {ai.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-bold">
          {ai.error}
        </div>
      )}

      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-black text-ink">Configuration</h2>
        </div>
        <div className="divide-y divide-border">
          {Object.entries(env).map(([key, value]) => (
            <div key={key} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-ink">{key}</span>
              <span className={`text-xs font-black px-2 py-1 rounded-full ${value ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {typeof value === "boolean" ? (value ? "set" : "missing") : String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={load} className="px-4 py-2 rounded-xl bg-[#0B4DA2] text-white text-sm font-bold">Recheck AI</button>
    </div>
  );
}

function StatusCard({ label, value, tone }: { label: string; value: string; tone: "blue" | "green" | "red" | "gold" | "gray" }) {
  const colors = {
    blue: "bg-blue-50 text-[#0B4DA2]",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    gold: "bg-amber-50 text-amber-700",
    gray: "bg-slate-50 text-slate-700",
  };

  return (
    <div className={`${colors[tone]} rounded-2xl p-4`}>
      <div className="text-[11px] font-bold uppercase opacity-70">{label}</div>
      <div className="text-xl font-black mt-1 break-words">{value}</div>
    </div>
  );
}
