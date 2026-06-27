"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Pill, Card } from "@/components/ui";

const SERVICE_META: Record<string, { label: string; icon: string; color: string; weight: number }> = {
  formation: { label: "Business Formation", icon: "🏛", color: "#0B4DA2", weight: 25 },
  tax: { label: "Tax Preparation", icon: "🧾", color: "#16A34A", weight: 25 },
  bookkeeping: { label: "Bookkeeping", icon: "📊", color: "#7C3AED", weight: 20 },
  insurance: { label: "Auto Insurance", icon: "🚗", color: "#D97706", weight: 20 },
  notary: { label: "Notary Services", icon: "✍️", color: "#C8102E", weight: 10 },
};

const ALL_SERVICES = ["formation", "tax", "bookkeeping", "insurance", "notary"];
const STAFF_ROLES = ["manager", "accountant", "specialist", "broker", "tax_intern", "support", "super_admin"];

type Enrollment = {
  id: string;
  service_type: string;
  status: string;
  progress: number;
  created_at: string;
  assigned_staff?: { legal_name?: string | null; email?: string | null } | null;
  case_messages?: { sender_type: string; read_by_client?: boolean }[];
  case_deliverables?: { requires_approval?: boolean; client_approved?: boolean }[];
  missing_documents?: { is_received?: boolean }[];
};

export default function PortalDashboard() {
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("client");
  const [healthScore, setHealthScore] = useState(50);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const profRes = await fetch("/api/user/profile", { credentials: "include" });
        if (!profRes.ok) throw new Error("No profile");
        const profile = await profRes.json();
        const name = profile.legal_name || profile.email?.split("@")[0] || "there";
        setUserName(name);
        setUserRole(profile.role || "client");

        const hsRes = await fetch("/api/user/health-score", { credentials: "include" });
        if (hsRes.ok) {
          const hs = await hsRes.json();
          setHealthScore(hs.score ?? profile.health_score ?? 50);
        } else {
          setHealthScore(profile.health_score ?? 50);
        }

        const res = await fetch("/api/services/enroll", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setEnrollments(data.enrollments || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  const previousScoreRef = useRef(0);

  // Animate health score counter
  useEffect(() => {
    if (loading) return;
    const target = healthScore;
    const duration = 600;
    const start = performance.now();
    const initial = previousScoreRef.current;
    let frame: number;
    function step(now: number) {
      const t = Math.min(1, (now - start) / duration);
      setAnimatedScore(Math.round(initial + (target - initial) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
    previousScoreRef.current = target;
    return () => cancelAnimationFrame(frame);
  }, [healthScore, loading]);

  const isStaff = STAFF_ROLES.includes(userRole);
  const firstName = userName.split(" ")[0] || "there";

  const serviceCards = ALL_SERVICES.map((svcId) => {
    const enrollment = enrollments.find((e) => e.service_type === svcId);
    const meta = SERVICE_META[svcId];
    return {
      id: svcId,
      label: meta.label,
      icon: meta.icon,
      color: meta.color,
      weight: meta.weight,
      pct: enrollment?.progress || 0,
      enrollment,
      status: enrollment ? statusLabel(enrollment.status, enrollment.progress) : "Not started",
      badge: enrollment ? statusBadge(enrollment.status) : ("gray" as const),
      unread: enrollment?.case_messages?.filter((m) => m.sender_type === "staff" && !m.read_by_client).length || 0,
      missing: enrollment?.missing_documents?.filter((d) => !d.is_received).length || 0,
      approvals: enrollment?.case_deliverables?.filter((d) => d.requires_approval && !d.client_approved).length || 0,
    };
  });

  // SLA-aware Needs Attention
  const now = Date.now();
  const attentionItems: { icon: string; msg: string; tone: "red" | "gold" | "blue"; href: string }[] = [];
  enrollments.forEach((e) => {
    const meta = SERVICE_META[e.service_type];
    if (!meta) return;
    const ageHours = (now - new Date(e.created_at).getTime()) / 3600000;
    const unread = e.case_messages?.filter((m) => m.sender_type === "staff" && !m.read_by_client).length || 0;
    const missing = e.missing_documents?.filter((d) => !d.is_received).length || 0;
    const approvals = e.case_deliverables?.filter((d) => d.requires_approval && !d.client_approved).length || 0;
    if (approvals > 0) {
      attentionItems.push({ icon: meta.icon, msg: `${meta.label} is ready for your review`, tone: "red", href: "/portal/orders" });
    } else if (missing > 0) {
      attentionItems.push({ icon: meta.icon, msg: `${meta.label} needs ${missing} document${missing === 1 ? "" : "s"}`, tone: "gold", href: "/portal/orders" });
    } else if (unread > 0) {
      attentionItems.push({ icon: meta.icon, msg: `${meta.label} has ${unread} new message${unread === 1 ? "" : "s"}`, tone: "blue", href: "/portal/orders" });
    } else if (e.status === "pending" && ageHours > 48) {
      attentionItems.push({ icon: meta.icon, msg: `${meta.label} review is overdue (${Math.round(ageHours / 24)}d)`, tone: "red", href: "/portal/orders" });
    } else if (e.status === "active" && e.progress < 30) {
      attentionItems.push({ icon: meta.icon, msg: `${meta.label} needs more info (${e.progress}%)`, tone: "gold", href: "/portal/orders" });
    } else if (e.status === "draft") {
      attentionItems.push({ icon: meta.icon, msg: `Resume ${meta.label} intake (${e.progress}%)`, tone: "blue", href: `/portal/intake?service=${e.service_type}` });
    } else if (e.status === "pending") {
      attentionItems.push({ icon: meta.icon, msg: `${meta.label} pending review`, tone: "gold", href: "/portal/orders" });
    }
  });

  const scoreLabel = healthScore < 40 ? "Getting Started" : healthScore < 70 ? "Good" : healthScore < 90 ? "Excellent" : "⭐ Divine";

  const quickActions = [
    { icon: "🔗", label: "Generate Upload Link", href: "/portal/vault" },
    { icon: "💬", label: "AI Concierge", href: "/portal/chat" },
    { icon: "📁", label: "Vault Documents", href: "/portal/vault" },
    ...(isStaff ? [{ icon: "🛡", label: "Admin Portal", href: "/portal/admin" }] : []),
  ];

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-[#0B4DA2] to-[#083a7a] rounded-[20px] p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Pill tone="white">Client Portal</Pill>
            <h2 className="text-[22px] font-black mt-2.5">Welcome back, {firstName} 👋</h2>
            <p className="opacity-80 text-[13px] mt-1">Here&apos;s your financial overview · {today}</p>
          </div>
          <div className="text-center">
            <div className="text-[11px] opacity-75 font-bold tracking-wider">FINANCIAL HEALTH SCORE</div>
            <div className="text-[44px] font-black leading-none mt-1 tabular-nums">{animatedScore}</div>
            <div className="h-1.5 w-[140px] bg-white/20 rounded mt-2 overflow-hidden">
              <div className="h-full bg-white rounded transition-all duration-700" style={{ width: `${animatedScore}%` }} />
            </div>
            <div className="text-[11px] opacity-90 mt-1 font-bold">{scoreLabel} · of 100</div>
          </div>
        </div>
      </div>

      <h3 className="font-black text-[15px]">Your Services</h3>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {serviceCards.map((s) => (
            <Link key={s.id} href={s.enrollment ? "/portal/orders" : `/portal/intake?service=${s.id}`} className="no-underline">
              <Card className="cursor-pointer !p-4 hover:-translate-y-0.5 transition-transform h-full" style={{ borderTop: `3px solid ${s.color}` }}>
                <div className="flex justify-between items-start">
                  <span className="text-[22px]">{s.icon}</span>
                  {s.enrollment ? <Pill tone={s.badge}>{s.pct}%</Pill> : <span className="text-[10px] text-muted font-bold uppercase">+{s.weight} pts</span>}
                </div>
                <div className="font-extrabold text-[13px] mt-2 text-ink">{s.label}</div>
                <div className="text-[11px] text-muted mt-0.5 mb-2">{s.status}</div>
                {s.enrollment?.assigned_staff && <div className="text-[10px] text-muted mb-2 truncate">Specialist: {s.enrollment.assigned_staff.legal_name || s.enrollment.assigned_staff.email}</div>}
                <div className="flex flex-wrap gap-1 mb-2">
                  {s.unread > 0 && <Pill tone="blue">{s.unread} msg</Pill>}
                  {s.missing > 0 && <Pill tone="gold">{s.missing} docs</Pill>}
                  {s.approvals > 0 && <Pill tone="red">Review</Pill>}
                </div>
                <div className="h-[5px] bg-slate-100 rounded">
                  <div className="h-full rounded transition-all" style={{ width: `${s.pct}%`, background: s.color }} />
                </div>
                {!s.enrollment && (
                  <span className="mt-3 block w-full text-center text-[11px] font-bold text-[#0B4DA2] hover:underline">Get Started →</span>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div>
          <h3 className="font-black text-sm mb-2.5">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {quickActions.map((a) => (
              <Link key={a.label} href={a.href} className="no-underline">
                <Card className="cursor-pointer !p-3.5 flex items-center gap-2.5 hover:bg-soft transition-colors h-full">
                  <div className="w-8 h-8 bg-soft rounded-lg flex items-center justify-center text-base">{a.icon}</div>
                  <span className="font-bold text-xs text-ink">{a.label}</span>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <Card>
          <div className="font-extrabold text-[13px] mb-3">⚠ Needs Attention</div>
          {attentionItems.length === 0 ? (
            <div className="text-xs text-green-700 py-3 text-center bg-green-50 rounded-lg">✅ You&apos;re all caught up!</div>
          ) : (
            attentionItems.map((a, i) => (
              <Link key={i} href={a.href} className="no-underline">
                <div className={"flex gap-2 items-center py-2.5 cursor-pointer hover:bg-slate-50 -mx-1 px-1 rounded" + (i + 1 < attentionItems.length ? " border-b border-border" : "")}>
                  <span className="text-sm w-5">{a.icon}</span>
                  <span className="flex-1 text-xs">{a.msg}</span>
                  <Pill tone={a.tone}>{a.tone === "red" ? "Overdue" : a.tone === "gold" ? "Pending" : "In progress"}</Pill>
                </div>
              </Link>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function statusLabel(status: string, progress: number): string {
  if (status === "draft") return `Draft (${progress}%)`;
  if (status === "pending") return "Under review";
  if (status === "active") return `In progress (${progress}%)`;
  if (status === "completed") return "✓ Complete";
  return status;
}

function statusBadge(status: string): "blue" | "red" | "green" | "gold" | "gray" {
  if (status === "draft") return "gray";
  if (status === "pending") return "gold";
  if (status === "active") return "blue";
  if (status === "completed") return "green";
  return "gray";
}
