"use client";

import { useState } from "react";
import { Card, Pill } from "@/components/ui";

export default function VoiceReceptionistPanel() {
  const [callerName, setCallerName] = useState("");
  const [callerPhone, setCallerPhone] = useState("");
  const [intent, setIntent] = useState("general");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveLog() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/admin/call-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ callerName, callerPhone, intent, summary, callSource: "manual" }),
    });
    if (res.ok) {
      setCallerName("");
      setCallerPhone("");
      setIntent("general");
      setSummary("");
      setSaved(true);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-ink">Voice Receptionist</h1>
        <p className="text-xs text-muted mt-1">Manual intake console for calls until live voice streaming is connected.</p>
      </div>
      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Pill tone="gold">Manual mode</Pill>
          <Pill tone="gray">Call logging enabled</Pill>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={callerName} onChange={(event) => setCallerName(event.target.value)} placeholder="Caller name" className="border border-border rounded-xl px-3 py-2 text-sm" />
          <input value={callerPhone} onChange={(event) => setCallerPhone(event.target.value)} placeholder="Caller phone" className="border border-border rounded-xl px-3 py-2 text-sm" />
        </div>
        <select value={intent} onChange={(event) => setIntent(event.target.value)} className="border border-border rounded-xl px-3 py-2 text-sm">
          <option value="tax">Tax</option>
          <option value="formation">Formation</option>
          <option value="insurance">Insurance</option>
          <option value="notary">Notary</option>
          <option value="bookkeeping">Bookkeeping</option>
          <option value="billing">Billing</option>
          <option value="general">General</option>
        </select>
        <textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Call summary and next steps" className="w-full border border-border rounded-xl px-3 py-2 text-sm min-h-32" />
        <button disabled={saving || !summary.trim()} onClick={saveLog} className="px-4 py-2 rounded-xl bg-[#0B4DA2] text-white text-sm font-bold">{saving ? "Saving..." : "Save Call Log"}</button>
        {saved && <p className="text-xs font-bold text-green-700">Call log saved.</p>}
      </Card>
    </div>
  );
}
