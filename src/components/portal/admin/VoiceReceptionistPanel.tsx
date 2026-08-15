"use client";

import { useEffect, useState } from "react";
import { Card, Pill } from "@/components/ui";

type ConsoleMode = "dashboard" | "log-call";

const SERVICE_LABELS: Record<string, string> = {
  tax: "Tax",
  formation: "Formation",
  insurance: "Insurance",
  notary: "Notary",
  bookkeeping: "Bookkeeping",
  billing: "Billing",
  callback_request: "Callback",
  inbound: "Inbound",
  outbound: "Outbound",
  general: "General",
};

export default function VoiceReceptionistPanel() {
  const [mode, setMode] = useState<ConsoleMode>("dashboard");
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dialPhone, setDialPhone] = useState("");
  const [dialing, setDialing] = useState(false);
  const [dialResult, setDialResult] = useState("");
  const [callerProfile, setCallerProfile] = useState<any>(null);
  const [callerCases, setCallerCases] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [logForm, setLogForm] = useState({
    caller_name: "",
    caller_phone: "",
    intent: "general",
    summary: "",
    duration_seconds: 0,
  });

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadDashboard() {
    const [callsRes, statusRes] = await Promise.all([
      fetch("/api/voice/calls?limit=20", { credentials: "include" }),
      fetch("/api/voice/status", { credentials: "include" }),
    ]);
    const calls = await callsRes.json().catch(() => ({}));
    const statusJson = await statusRes.json().catch(() => ({}));
    setRecentCalls(calls.calls || []);
    setStatus(statusJson);
    setLoading(false);
  }

  async function lookupCaller(phone: string) {
    if (!phone.trim()) return;
    const res = await fetch(`/api/voice/lookup?phone=${encodeURIComponent(phone)}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setCallerProfile(data.client || null);
    setCallerCases(data.cases || []);
  }

  async function makeOutboundCall(useAiAgent = false) {
    if (!dialPhone.trim()) return;
    setDialing(true);
    setDialResult("");
    const res = await fetch("/api/voice/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ to: dialPhone, useAiAgent }),
    });
    const data = await res.json().catch(() => ({}));
    setDialResult(res.ok ? `Call queued: ${data.callId}` : data.error || "Could not start call");
    setDialing(false);
    loadDashboard();
  }

  async function saveLog() {
    setSaving(true);
    setSaved("");
    const res = await fetch("/api/admin/call-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...logForm, call_source: "human" }),
    });
    if (res.ok) {
      setLogForm({ caller_name: "", caller_phone: "", intent: "general", summary: "", duration_seconds: 0 });
      setCallerProfile(null);
      setCallerCases([]);
      setMode("dashboard");
      setSaved("Call log saved.");
      loadDashboard();
    } else {
      setSaved("Could not save call log.");
    }
    setSaving(false);
    setTimeout(() => setSaved(""), 4000);
  }

  const dograh = status?.dograh || {};
  const dograhDetail = safeStatusDetail(dograh.detail || "dograh.dfgworld.net");
  const dograhVersion = normalizeVersion(dograh.version || "1.41.0");
  const agentReady = Boolean(dograh.agentId);
  const todayCount = recentCalls.filter((call) => new Date(call.created_at).toDateString() === new Date().toDateString()).length;
  const aiCount = recentCalls.filter((call) => call.call_source === "ai_voice_agent").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">Voice Receptionist</h1>
          <p className="text-xs text-muted mt-1">Dograh AI voice agent plus human call console.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setMode("log-call")} className="px-4 py-2 rounded-xl bg-slate-100 text-ink text-sm font-bold">Log Call</button>
          <button onClick={loadDashboard} className="px-4 py-2 rounded-xl bg-[#0B4DA2] text-white text-sm font-bold">Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatusCard label="Dograh Agent" value={dograh.online ? "Online" : dograh.configured ? "Unavailable" : "Not configured"} tone={dograh.online ? "green" : "red"} detail={dograhDetail} />
        <StatusCard label="Today's Calls" value={String(todayCount)} tone="blue" detail={`${aiCount} handled by AI`} />
        <StatusCard label="Business Hours" value={`${status?.businessHours?.start || 9}:00-${status?.businessHours?.end || 18}:00 ET`} tone="gray" detail={status?.phoneNumber || "(302) 322-5515"} />
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={dograh.online ? "green" : "gold"}>{dograh.online ? "AI voice live" : "Manual fallback ready"}</Pill>
          <Pill tone="gray">Dograh v{dograhVersion}</Pill>
          {agentReady ? <Pill tone="blue">Agent configured</Pill> : <Pill tone="gold">Setup needed</Pill>}
        </div>
        {!agentReady && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            No Dograh agent is configured yet. Run <code>npm run voice:setup</code>, add the printed <code>DOGRAH_AGENT_ID</code> to <code>.env.local</code>, then restart Next.js.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
          <input
            value={dialPhone}
            onChange={(event) => setDialPhone(event.target.value)}
            onBlur={(event) => lookupCaller(event.target.value)}
            placeholder="+1 (302) 555-0000"
            className="border border-border rounded-xl px-3 py-2 text-sm"
          />
          <button disabled={dialing || !dialPhone.trim() || !agentReady} onClick={() => makeOutboundCall(false)} className="px-4 py-2 rounded-xl bg-[#0B4DA2] text-white text-sm font-bold disabled:opacity-50">{dialing ? "Calling..." : agentReady ? "Call" : "Setup needed"}</button>
          <button disabled={dialing || !dialPhone.trim() || !agentReady} onClick={() => makeOutboundCall(true)} className="px-4 py-2 rounded-xl bg-[#155E75] text-white text-sm font-bold disabled:opacity-50">AI Call</button>
        </div>
        {dialResult && <p className={`text-xs font-bold ${dialResult.startsWith("Call queued") ? "text-green-700" : "text-red-600"}`}>{dialResult}</p>}
        {callerProfile && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs font-black text-[#0B4DA2]">Matched client: {callerProfile.legal_name || callerProfile.email}</p>
            <p className="text-xs text-muted mt-1">{callerProfile.email} · {callerProfile.phone}</p>
            {callerCases.length > 0 && <p className="text-xs text-ink mt-1">{callerCases.length} recent case{callerCases.length === 1 ? "" : "s"} found.</p>}
          </div>
        )}
      </Card>

      {mode === "log-call" && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-ink">Manual Call Log</h2>
            <button onClick={() => setMode("dashboard")} className="text-xs font-bold text-muted">Cancel</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={logForm.caller_name} onChange={(event) => setLogForm((p) => ({ ...p, caller_name: event.target.value }))} placeholder="Caller name" className="border border-border rounded-xl px-3 py-2 text-sm" />
            <input value={logForm.caller_phone} onChange={(event) => setLogForm((p) => ({ ...p, caller_phone: event.target.value }))} onBlur={(event) => lookupCaller(event.target.value)} placeholder="Caller phone" className="border border-border rounded-xl px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={logForm.intent} onChange={(event) => setLogForm((p) => ({ ...p, intent: event.target.value }))} className="border border-border rounded-xl px-3 py-2 text-sm">
              {Object.entries(SERVICE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input type="number" min={0} value={logForm.duration_seconds} onChange={(event) => setLogForm((p) => ({ ...p, duration_seconds: Number(event.target.value || 0) }))} placeholder="Duration seconds" className="border border-border rounded-xl px-3 py-2 text-sm" />
          </div>
          <textarea value={logForm.summary} onChange={(event) => setLogForm((p) => ({ ...p, summary: event.target.value }))} placeholder="Call summary and next steps" className="w-full border border-border rounded-xl px-3 py-2 text-sm min-h-32" />
          <button disabled={saving || !logForm.caller_name.trim() || !logForm.summary.trim()} onClick={saveLog} className="px-4 py-2 rounded-xl bg-[#0B4DA2] text-white text-sm font-bold">{saving ? "Saving..." : "Save Call Log"}</button>
        </Card>
      )}

      {saved && <p className={`text-xs font-bold ${saved.startsWith("Call") ? "text-green-700" : "text-red-600"}`}>{saved}</p>}

      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-black text-ink">Recent Calls</h2>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-muted">Loading calls...</p>
        ) : recentCalls.length === 0 ? (
          <p className="p-5 text-sm text-muted">No calls logged yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {recentCalls.map((call) => (
              <div key={call.id} className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-ink">{call.caller_name || "Unknown caller"}</span>
                    <Pill tone="blue">{SERVICE_LABELS[call.intent] || call.intent || "general"}</Pill>
                    <Pill tone={call.call_source === "ai_voice_agent" ? "green" : "gray"}>{call.call_source || "human"}</Pill>
                  </div>
                  <p className="text-xs text-muted mt-1">{call.caller_phone || "No phone"} · {new Date(call.created_at).toLocaleString()}</p>
                  <p className="text-sm mt-2">{call.summary || "No summary recorded."}</p>
                  {call.recording_url && <a href={call.recording_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#0B4DA2] mt-2 inline-block">Open recording</a>}
                </div>
                <span className="text-xs font-bold text-muted">{Math.round((call.duration_seconds || 0) / 60)} min</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatusCard({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone: "blue" | "green" | "red" | "gray" }) {
  const colors = {
    blue: "bg-blue-50 text-[#0B4DA2]",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    gray: "bg-slate-50 text-slate-700",
  };
  return (
    <div className={`${colors[tone]} rounded-2xl p-4`}>
      <div className="text-[11px] font-bold uppercase opacity-70">{label}</div>
      <div className="text-xl font-black mt-1">{value}</div>
      {detail && <div className="text-xs mt-1 opacity-75 break-words">{detail}</div>}
    </div>
  );
}

function safeStatusDetail(detail: unknown) {
  const text = typeof detail === "string" ? detail : "Dograh status unavailable";
  if (/<\/?[a-z][\s\S]*>/i.test(text) || text.includes("<!DOCTYPE")) {
    return "Dograh returned HTML instead of API JSON. Verify /api/v1 routing and API key permissions.";
  }
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function normalizeVersion(version: unknown) {
  const text = typeof version === "string" ? version : "1.41.0";
  return text.trim().replace(/^v+/i, "") || "1.41.0";
}
