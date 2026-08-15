"use client";

import { useEffect, useState } from "react";
import { Card, Pill } from "@/components/ui";

type CallLog = {
  id: string;
  caller_name: string | null;
  caller_phone: string | null;
  intent: string | null;
  summary: string | null;
  full_transcript?: string | null;
  recording_url?: string | null;
  dograh_call_id?: string | null;
  ended_reason?: string | null;
  duration_seconds: number | null;
  call_source: string | null;
  created_at: string;
};

export default function CallLogsPanel() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/call-logs?search=${encodeURIComponent(search)}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      setLogs(data.callLogs || []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">Call Logs</h1>
          <p className="text-xs text-muted mt-1">Dograh AI calls, human calls, recordings, transcripts, and follow-up history.</p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search calls"
          className="border border-border rounded-xl px-3 py-2 text-sm"
        />
      </div>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm text-muted">Loading calls...</p>
        ) : logs.length === 0 ? (
          <p className="p-5 text-sm text-muted">No call logs yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-ink">{log.caller_name || "Unknown caller"}</span>
                    <Pill tone="blue">{log.intent || "general"}</Pill>
                    <Pill tone={log.call_source === "ai_voice_agent" ? "green" : "gray"}>{log.call_source || "web"}</Pill>
                    {log.dograh_call_id && <Pill tone="gold">Dograh</Pill>}
                  </div>
                  <p className="text-xs text-muted mt-1">{log.caller_phone || "No phone"} · {new Date(log.created_at).toLocaleString()}</p>
                  <p className="text-sm mt-2">{log.summary || "No summary recorded."}</p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {log.recording_url && (
                      <a className="text-xs font-bold text-[#0B4DA2]" href={log.recording_url} target="_blank" rel="noreferrer">
                        Recording
                      </a>
                    )}
                    {log.full_transcript && (
                      <details className="text-xs text-muted">
                        <summary className="font-bold cursor-pointer text-[#0B4DA2]">Transcript</summary>
                        <pre className="whitespace-pre-wrap mt-2 max-w-2xl text-[11px] leading-relaxed">{log.full_transcript}</pre>
                      </details>
                    )}
                    {log.ended_reason && <span className="text-xs text-muted">Ended: {log.ended_reason}</span>}
                  </div>
                </div>
                <span className="text-xs font-bold text-muted">{Math.round((log.duration_seconds || 0) / 60)} min</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
