"use client";

import { useEffect, useState } from "react";

type StatusResponse = {
  activeProvider?: string;
  fallbackProvider?: string | null;
  providers?: Record<string, { configured: boolean; online: boolean; detail?: string }>;
  devices?: Record<string, { deviceId: string; deviceName: string; devicePhone?: string; carrier: string; fcmStatus?: string }>;
};

export default function SmsStatusPanel() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function loadStatus() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/sms/status", { credentials: "include" });
      setStatus(await response.json());
    } finally {
      setLoading(false);
    }
  }

  async function sendTest() {
    setSending(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to, body }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setResult({ ok: true, message: `Sent via ${data.provider}` });
        setBody("");
      } else {
        setResult({ ok: false, message: data.error || "SMS send failed" });
      }
    } finally {
      setSending(false);
    }
  }

  useEffect(() => { loadStatus(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-ink">SMS Gateway Status</h1>
        <p className="text-sm text-muted mt-1">Self-hosted TextBee primary with Vendel fallback while Vendel send auth is blocked.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(["vendel", "textbee"] as const).map((name) => {
          const provider = status?.providers?.[name];
          const device = status?.devices?.[name];
          return (
            <div key={name} className="rounded-2xl bg-white border border-border p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black capitalize text-ink">{name}</div>
                <div className="flex gap-1">
                  {status?.activeProvider === name && <Badge label="Primary" color="#0B4DA2" />}
                  {status?.fallbackProvider === name && <Badge label="Fallback" color="#D97706" />}
                </div>
              </div>
              {loading ? (
                <p className="text-xs text-muted mt-3">Checking...</p>
              ) : !provider?.configured ? (
                <p className="text-xs text-muted mt-3">Not configured</p>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: provider.online ? "#16A34A" : "#C8102E" }} />
                  <span className={`text-sm font-bold ${provider.online ? "text-green-700" : "text-red-700"}`}>{provider.online ? "Online" : "Offline"}</span>
                  {provider.detail && <span className="text-xs text-muted">{provider.detail}</span>}
                </div>
              )}
              {device && (
                <div className="mt-3 border-t border-border pt-3 text-xs text-muted space-y-1">
                  <p>{device.deviceName}</p>
                  {device.devicePhone && <p>{device.devicePhone}</p>}
                  <p>{device.carrier}</p>
                  <p className="font-mono opacity-70">ID: {device.deviceId}</p>
                </div>
              )}
              {name === "textbee" && device?.deviceId === "not set" && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <p className="font-black">TextBee device ID missing</p>
                  <p className="mt-1">Open TextBee Devices, copy the FOXXD C10 device ID, and set TEXTBEE_DEVICE_ID in .env.local.</p>
                </div>
              )}
              {name === "textbee" && provider?.detail?.includes("No FCM token") && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <p className="font-black">FCM token missing</p>
                  <p className="mt-1">Reinstall the FOXXD C10 TextBee app with google-services.json for project textbee-gateway-2410a.</p>
                </div>
              )}
              {name === "vendel" && (
                <a
                  href="https://api-vendel.dfgworld.net/api/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-bold underline text-[#0B4DA2]"
                >
                  View live health endpoint
                </a>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={loadStatus} className="px-3 py-2 rounded-xl border border-border bg-white text-xs font-bold text-[#0B4DA2]">Refresh Status</button>

      <div className="rounded-2xl bg-white border border-border p-5 space-y-3">
        <h2 className="text-sm font-black text-ink">Send Test SMS</h2>
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Phone number, e.g. +13025551234" className="w-full border border-border rounded-xl px-3 py-2 text-sm" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message text" rows={3} className="w-full border border-border rounded-xl px-3 py-2 text-sm" />
        <button disabled={sending || !to || !body.trim()} onClick={sendTest} className="px-4 py-2 rounded-xl bg-[#0B4DA2] text-white text-sm font-bold disabled:opacity-50">
          {sending ? "Sending..." : "Send SMS"}
        </button>
        {result && result.ok && <p className="text-xs font-bold text-green-700">{result.message}</p>}
        {result && !result.ok && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
            <p className="font-black">Send failed</p>
            <p className="mt-1">{friendlySendError(result.message)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: color }}>{label}</span>;
}

function friendlySendError(message: string) {
  if (message.includes("Authentication required") || message.includes("401")) {
    return "Vendel rejected SMS send authentication. Check Vendel API key send permissions, or keep TextBee primary while Vendel is fixed.";
  }
  if (message.includes("TEXTBEE_DEVICE_ID") || message.toLowerCase().includes("device")) {
    return "TextBee needs the FOXXD C10 device ID. Add TEXTBEE_DEVICE_ID from the TextBee device page/API.";
  }
  if (message.toLowerCase().includes("fcm")) {
    return "TextBee needs a fresh FCM token. Reinstall the FOXXD C10 app with the confirmed google-services.json.";
  }
  if (message.toLowerCase().includes("timed out")) {
    return "The SMS gateway timed out. Refresh gateway status and try again.";
  }
  return message;
}
