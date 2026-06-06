"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { SERVICE_WEIGHTS } from "@/lib/health-score";

export default function DashboardPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = document.cookie.match(/d_user_id=([^;]+)/)?.[1];
    if (!uid) return;
    getSupabaseAdmin().from("service_enrollments").select("*").eq("user_id", uid).order("created_at", { ascending: false }).then(({ data }) => {
      setEnrollments(data || []);
      setLoading(false);
    });
  }, []);

  const healthScore = calculateHealthScore(enrollments);
  const needsAttention = enrollments.filter(e => e.status === "pending" || e.progress < 30);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-ink">Dashboard</h1>
        <Link href="/portal/intake" className="px-4 py-2 bg-[#0B4DA2] text-white text-sm font-bold rounded-xl">+ New Service</Link>
      </div>

      {/* Health Score */}
      <div className="bg-white border border-border rounded-2xl p-6 flex items-center gap-6 shadow-sm">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" stroke="#E2E8F0" strokeWidth="3" />
            <circle cx="18" cy="18" r="14" fill="none" stroke={healthScore > 60 ? "#16A34A" : healthScore > 30 ? "#D97706" : "#C8102E"} strokeWidth="3" strokeDasharray={`${healthScore},100`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-xl font-black text-ink">{healthScore}</span>
            <span className="text-[10px] font-bold text-muted uppercase">Health</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-ink">Financial Health Score</p>
          <p className="text-xs text-muted">Complete more services to boost your score.</p>
        </div>
      </div>

      {/* Service Cards */}
      <div>
        <h2 className="text-sm font-bold text-muted uppercase mb-3">Your Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (<div className="text-sm text-muted">Loading...</div>) : (
            enrollments.length === 0 ? (
              <div className="bg-white border border-border rounded-2xl p-6 text-center">
                <p className="text-sm text-muted mb-3">No services yet.</p>
                <Link href="/portal/intake" className="text-sm font-bold text-[#0B4DA2]">Start your first service</Link>
              </div>
            ) : (
              enrollments.map((e) => (
                <div key={e.id} className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase" style={{ color: colorForService(e.service_type) }}>{e.service_type}</span>
                    <StatusBadge status={e.status} />
                  </div>
                  <div>
                    <div className="h-2 rounded-full overflow-hidden bg-slate-100">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${e.progress || 0}%`, background: colorForService(e.service_type) }} />
                    </div>
                    <span className="text-xs text-muted mt-1 block">{e.progress || 0}% complete</span>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <div className="bg-[#FFF7ED] border border-[#FDBA74] rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[#D97706] mb-2">Needs Attention</h3>
          <div className="space-y-2">
            {needsAttention.map((e) => (
              <div key={e.id} className="flex items-center justify-between bg-white rounded-xl p-3">
                <span className="text-sm font-bold text-ink capitalize">{e.service_type} — {e.status}</span>
                <Link href="/portal/intake" className="text-xs font-bold text-[#0B4DA2]">View</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function calculateHealthScore(enrollments: any[]) {
  let score = 50;
  for (const e of enrollments) {
    const w = SERVICE_WEIGHTS[e.service_type || ""] || 0;
    score += (e.progress / 100) * w;
  }
  return Math.min(100, Math.round(score));
}

function colorForService(type: string) {
  const c: Record<string, string> = { formation: "#0B4DA2", tax: "#16A34A", insurance: "#D97706", notary: "#C8102E", bookkeeping: "#7C3AED" };
  return c[type] || "#64748B";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    pending: "bg-amber-50 text-amber-600",
    active: "bg-blue-50 text-blue-700",
    completed: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-600",
  };
  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${styles[status] || styles.draft}`}>{status}</span>;
}
