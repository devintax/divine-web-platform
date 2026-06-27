"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SERVICE_DESKS = [
  { label: "Tax Pod", href: "/portal/admin/tax", color: "#16A34A", body: "Tax prep, four-eyes review, filing approvals" },
  { label: "Formation Desk", href: "/portal/admin/formation", color: "#0B4DA2", body: "Entity setup, state filings, EIN delivery" },
  { label: "Broker Station", href: "/portal/admin/insurance", color: "#D97706", body: "Quote review, carrier updates, policy delivery" },
  { label: "Notary Console", href: "/portal/admin/notary", color: "#C8102E", body: "Document review, KYC, session completion" },
  { label: "Bookkeeping Pod", href: "/portal/admin/books", color: "#7C3AED", body: "Monthly books, reconciliation, reports" },
  { label: "SMS Gateway", href: "/portal/admin/sms-status", color: "#0F766E", body: "Vendel/TextBee health, manual test sends, delivery tracking" },
  { label: "Voice Receptionist", href: "/portal/admin/voice", color: "#7C2D12", body: "Manual voice intake and call capture" },
  { label: "Call Logs", href: "/portal/admin/call-logs", color: "#374151", body: "Inbound calls, summaries, and follow-up history" },
  { label: "Knowledge Base", href: "/portal/admin/knowledge-base", color: "#9333EA", body: "Staff answers for concierge and support" },
];

export default function AdminPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tab, setTab] = useState("queue");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats").then(r => r.json()).then(d => { setStats(d); setLoading(false); });
    fetch("/api/admin/queue").then(r => r.json()).then(d => setCases(d.cases || []));
    fetch("/api/user/profile").then(r => r.json()).then(p => setRole(p.role || "client"));
  }, []);

  useEffect(() => {
    if (tab === "audit") {
      fetch("/api/admin/audit").then(r => r.json()).then(d => setLogs(d.logs || []));
    }
    if (tab === "users") {
      fetch("/api/admin/users").then(r => r.json()).then(d => setUsers(d.users || []));
    }
  }, [tab]);

  async function signalCase(c: any, signalName: string) {
    const workflowId = `${c.service}-${c.id}`;
    try {
      const res = await fetch("/api/admin/signal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflowId, signalName }) });
      const data = await res.json();
      alert(data.success ? "Signal sent!" : `Error: ${data.error}`);
    } catch { alert("Failed to send signal"); }
  }

  async function changeRole(userId: string, newRole: string) {
    const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role: newRole }) });
    const data = await res.json();
    if (data.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } else {
      alert("Failed: " + (data.error || "unknown"));
    }
  }

  if (loading) return <div className="text-sm text-muted">Loading...</div>;
  if (!stats) return <div className="text-sm text-red-600">Unauthorized</div>;

  const isSuper = role === "super_admin" || role === "manager";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-ink">Staff Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "New Intakes", value: stats.newIntakes || 0, color: "bg-blue-50 text-[#0B4DA2]" },
          { label: "Missing Docs", value: stats.missingDocs || 0, color: "bg-amber-50 text-[#D97706]" },
          { label: "In Review", value: stats.inReview || 0, color: "bg-purple-50 text-purple-700" },
          { label: "Ready", value: stats.ready || 0, color: "bg-green-50 text-green-700" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-2xl p-4`}>
            <div className="text-[11px] font-bold uppercase opacity-70">{s.label}</div>
            <div className="text-3xl font-black mt-1">{s.value}</div>
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-sm font-black text-ink mb-2">Service Desks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {SERVICE_DESKS.map((desk) => (
            <Link key={desk.href} href={desk.href} className="bg-white border border-border rounded-2xl p-4 shadow-sm hover:-translate-y-0.5 transition-transform no-underline" style={{ borderTop: `3px solid ${desk.color}` }}>
              <div className="text-sm font-black text-ink">{desk.label}</div>
              <div className="text-[11px] text-muted mt-1 leading-relaxed">{desk.body}</div>
            </Link>
          ))}
        </div>
      </div>
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {["queue","audit", ...(isSuper ? ["users"] : [])].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 capitalize text-[12px] font-bold py-2 rounded-lg text-center transition-colors ${tab === t ? "bg-white text-ink shadow-sm" : "text-muted"}`}>{t}</button>
        ))}
      </div>
      {tab === "queue" && (
        <div className="space-y-3">
          {cases.length === 0 ? <p className="text-sm text-muted">No cases in queue.</p> : cases.map((c) => (
            <div key={c.id} className="bg-white border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink">{c.client || "Unknown"}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0B4DA2]">{c.service}</span>
                  </div>
                  <div className="text-xs text-muted mt-1">{c.status} &middot; {c.progress}%</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => signalCase(c, "documentsUploaded")} className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded">Docs Uploaded</button>
                <button onClick={() => signalCase(c, "staffApproved")} className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded">Approve</button>
                <button onClick={() => signalCase(c, "paymentCompleted")} className="px-2 py-1 bg-purple-600 text-white text-[10px] font-bold rounded">Payment</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "audit" && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted font-bold uppercase"><tr><th className="text-left px-4 py-3">Action</th><th className="text-left px-4 py-3">Resource</th><th className="text-left px-4 py-3">Time</th></tr></thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-muted">No audit logs yet.</td></tr>
              ) : logs.map((l) => (
                <tr key={l.id} className="border-t"><td className="px-4 py-3 text-xs font-bold">{l.action}</td><td className="px-4 py-3 text-xs text-muted">{l.resource_type}</td><td className="px-4 py-3 text-xs text-muted">{new Date(l.created_at).toLocaleDateString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "users" && isSuper && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted font-bold uppercase"><tr><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Actions</th></tr></thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-muted">No users found.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3 text-xs font-bold">{u.legal_name || "Unknown"}<div className="text-muted font-normal">{u.email}</div></td>
                  <td className="px-4 py-3 text-xs"><span className="uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-muted">{u.role}</span></td>
                  <td className="px-4 py-3 text-xs">
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} className="text-xs border border-border rounded-lg px-2 py-1">
                      <option value="client">Client</option>
                      <option value="support">Support</option>
                      <option value="tax_intern">Tax Intern</option>
                      <option value="specialist">Specialist</option>
                      <option value="accountant">Accountant</option>
                      <option value="broker">Broker</option>
                      <option value="manager">Manager</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
