"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, Pill } from "@/components/ui";

type Enrollment = {
  id: string;
  service_type: string;
  status: string;
  progress: number | null;
  created_at: string | null;
  updated_at: string | null;
  workflow_id?: string | null;
  client_message?: string | null;
  assigned_staff?: { legal_name?: string | null; email?: string | null } | null;
  case_messages?: CaseMessage[];
  case_deliverables?: Deliverable[];
  missing_documents?: MissingDocument[];
  case_checklist_items?: ChecklistItem[];
};

type CaseMessage = {
  id: string;
  sender_type: "client" | "staff" | "system";
  message: string;
  metadata?: {
    message_type?: string;
    upload_token?: string;
    document_name?: string;
    expires_at?: string | null;
  } | null;
  read_by_client?: boolean;
  created_at?: string | null;
};

type Deliverable = {
  id: string;
  title: string;
  description?: string | null;
  requires_approval?: boolean;
  client_approved?: boolean;
  created_at?: string | null;
};

type MissingDocument = {
  id: string;
  document_name: string;
  instructions?: string | null;
  is_received?: boolean;
  upload_link?: { token?: string; is_active?: boolean; expires_at?: string | null } | null;
};

type ChecklistItem = {
  id: string;
  label: string;
  is_complete?: boolean;
};

const SERVICE_META: Record<string, { label: string; color: string; href: string }> = {
  formation: { label: "Business Formation", color: "#0B4DA2", href: "/portal/intake?service=formation" },
  tax: { label: "Tax Preparation", color: "#16A34A", href: "/portal/intake?service=tax" },
  insurance: { label: "Auto Insurance", color: "#D97706", href: "/portal/intake?service=insurance" },
  notary: { label: "Notary Services", color: "#C8102E", href: "/portal/intake?service=notary" },
  bookkeeping: { label: "Bookkeeping", color: "#7C3AED", href: "/portal/intake?service=bookkeeping" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/services/enroll", { credentials: "include" });
      const data = await res.json();
      setOrders(data.enrollments || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
  }, [orders]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">Orders</h1>
          <p className="text-xs text-muted mt-1">Track service requests, respond to your specialist, and approve completed work.</p>
        </div>
        <Link href="/portal/intake" className="px-4 py-2 bg-[#0B4DA2] text-white text-sm font-bold rounded-xl text-center">New Service</Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <Card className="text-center py-10">
          <h2 className="text-lg font-black text-ink">No orders yet</h2>
          <p className="text-sm text-muted mt-1">Start a service intake and it will appear here.</p>
          <Link href="/portal/intake" className="inline-block mt-4 px-4 py-2 bg-[#0B4DA2] text-white text-sm font-bold rounded-xl">Start Intake</Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((order) => <OrderCard key={order.id} order={order} reload={loadOrders} />)}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, reload }: { order: Enrollment; reload: () => Promise<void> }) {
  const meta = SERVICE_META[order.service_type] || { label: order.service_type, color: "#64748B", href: "/portal/intake" };
  const progress = order.progress || 0;
  const unread = (order.case_messages || []).filter((m) => m.sender_type === "staff" && !m.read_by_client).length;
  const missing = (order.missing_documents || []).filter((doc) => !doc.is_received);
  const deliverables = order.case_deliverables || [];
  const pendingApprovals = deliverables.filter((doc) => doc.requires_approval && !doc.client_approved);
  const checklist = order.case_checklist_items || [];

  return (
    <Card className="space-y-4" style={{ borderLeft: `4px solid ${meta.color}` }}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-black text-ink">{meta.label}</h2>
            <Pill tone={badgeTone(order.status)}>{statusText(order.status)}</Pill>
            {unread > 0 && <Pill tone="blue">{unread} new message{unread === 1 ? "" : "s"}</Pill>}
            {missing.length > 0 && <Pill tone="gold">{missing.length} document{missing.length === 1 ? "" : "s"} needed</Pill>}
            {pendingApprovals.length > 0 && <Pill tone="red">Review required</Pill>}
          </div>
          <div className="text-xs text-muted mt-1">Reference #{order.id.slice(0, 8).toUpperCase()}</div>
          <div className="text-xs text-muted mt-1">Specialist: {order.assigned_staff?.legal_name || order.assigned_staff?.email || "Unassigned"}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/vault" className="px-3 py-2 bg-white border border-border rounded-xl text-xs font-bold text-[#0B4DA2]">Vault</Link>
          <Link href={meta.href} className="px-3 py-2 bg-white border border-border rounded-xl text-xs font-bold text-[#0B4DA2]">Intake</Link>
        </div>
      </div>

      {order.client_message && <div className="rounded-xl bg-blue-50 border border-blue-100 text-[#0B4DA2] text-sm font-semibold px-4 py-3">{order.client_message}</div>}

      <div>
        <div className="flex items-center justify-between text-[11px] font-bold text-muted mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: meta.color }} />
        </div>
      </div>

      {checklist.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {checklist.map((item) => (
            <div key={item.id} className={`rounded-xl border p-3 ${item.is_complete ? "bg-green-50 border-green-200 text-green-800" : "bg-white border-border text-muted"}`}>
              <div className="text-xs font-bold">{item.is_complete ? "Complete" : "Open"}</div>
              <div className="text-xs mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      <MissingDocuments docs={missing} reload={reload} />
      <Deliverables order={order} deliverables={deliverables} reload={reload} />
      <Messages order={order} reload={reload} />
    </Card>
  );
}

function MissingDocuments({ docs, reload }: { docs: MissingDocument[]; reload: () => Promise<void> }) {
  if (docs.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-sm font-black text-amber-900">Documents Needed</h3>
      <div className="space-y-2 mt-3">
        {docs.map((doc) => <MissingDocumentItem key={doc.id} doc={doc} reload={reload} />)}
      </div>
    </div>
  );
}

function MissingDocumentItem({ doc, reload }: { doc: MissingDocument; reload: () => Promise<void> }) {
  const [regenerating, setRegenerating] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [freshExpiresAt, setFreshExpiresAt] = useState<string | null>(null);
  const token = freshToken || doc.upload_link?.token || null;
  const expiresAt = freshExpiresAt || doc.upload_link?.expires_at || null;
  const expiryTime = expiresAt ? new Date(expiresAt).getTime() : null;
  const inactive = freshToken ? false : doc.upload_link?.is_active === false;
  const expired = inactive || (expiryTime !== null && expiryTime < Date.now());
  const isValid = Boolean(token) && !expired;
  const hoursLeft = expiryTime ? Math.max(0, Math.ceil((expiryTime - Date.now()) / 3_600_000)) : null;

  async function regenerate() {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/portal/missing-documents/${doc.id}/regenerate-link`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        setFreshToken(data.token);
        setFreshExpiresAt(data.expiresAt || null);
        await reload();
      } else {
        window.alert(data.error || "Could not create a new upload link.");
      }
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg bg-white border border-amber-100 p-3">
      <div className="min-w-0">
        <div className="text-sm font-bold text-ink">{doc.document_name}</div>
        {doc.instructions && <div className="text-xs text-muted mt-1">{doc.instructions}</div>}
        {isValid && hoursLeft !== null && <div className="text-[11px] text-muted mt-1">Secure link expires in about {hoursLeft} hour{hoursLeft === 1 ? "" : "s"}.</div>}
      </div>
      {isValid ? (
        <Link href={`/upload/${token}`} target="_blank" className="px-4 py-2 rounded-xl bg-[#0B4DA2] text-white text-xs font-bold text-center whitespace-nowrap">Upload Now</Link>
      ) : (
        <button disabled={regenerating} onClick={regenerate} className="px-4 py-2 rounded-xl bg-[#C8102E] text-white text-xs font-bold whitespace-nowrap disabled:opacity-60">
          {regenerating ? "Generating..." : "Get New Link"}
        </button>
      )}
    </div>
  );
}

function Deliverables({ order, deliverables, reload }: { order: Enrollment; deliverables: Deliverable[]; reload: () => Promise<void> }) {
  const [busyId, setBusyId] = useState("");
  if (deliverables.length === 0) return null;

  async function approve(deliverableId: string) {
    setBusyId(deliverableId);
    await fetch(`/api/cases/${order.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ deliverableId }),
    });
    setBusyId("");
    await reload();
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="text-sm font-black text-ink">Completed Work</h3>
      <div className="space-y-2 mt-3">
        {deliverables.map((doc) => (
          <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-soft p-3">
            <div>
              <div className="text-sm font-bold text-ink">{doc.title}</div>
              {doc.description && <div className="text-xs text-muted mt-1">{doc.description}</div>}
              <div className="text-[11px] text-muted mt-1">{doc.requires_approval ? (doc.client_approved ? "Approved" : "Awaiting your approval") : "Delivered to your vault"}</div>
            </div>
            {doc.requires_approval && !doc.client_approved ? (
              <button disabled={busyId === doc.id} onClick={() => approve(doc.id)} className="px-3 py-2 rounded-xl bg-green-700 text-white text-xs font-bold">
                {busyId === doc.id ? "Approving..." : "Approve"}
              </button>
            ) : (
              <Link href="/portal/vault" className="px-3 py-2 rounded-xl bg-white border border-border text-[#0B4DA2] text-xs font-bold text-center">Open Vault</Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Messages({ order, reload }: { order: Enrollment; reload: () => Promise<void> }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messages = order.case_messages || [];

  async function send() {
    if (!message.trim()) return;
    setSending(true);
    await fetch(`/api/cases/${order.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message }),
    });
    setMessage("");
    setSending(false);
    await reload();
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="text-sm font-black text-ink">Messages</h3>
      <div className="space-y-2 mt-3 max-h-72 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">No messages yet.</p>
        ) : messages.map((m) => <CaseMessageBubble key={m.id} message={m} />)}
      </div>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Reply to your specialist" className="flex-1 border border-border rounded-xl px-3 py-2 text-sm" />
        <button disabled={sending || !message.trim()} onClick={send} className="px-4 py-2 rounded-xl bg-[#0B4DA2] text-white text-sm font-bold disabled:opacity-50">{sending ? "Sending..." : "Send"}</button>
      </div>
    </div>
  );
}

function CaseMessageBubble({ message }: { message: CaseMessage }) {
  const token = message.metadata?.upload_token;
  const isDocRequest = message.metadata?.message_type === "document_request" && token;
  return (
    <div className={`rounded-xl p-3 text-sm ${message.sender_type === "client" ? "bg-blue-50" : message.sender_type === "staff" ? "bg-soft" : "bg-slate-50"}`}>
      <div className="text-[10px] font-bold uppercase text-muted">{message.sender_type}</div>
      <div className="whitespace-pre-wrap">{message.message}</div>
      {isDocRequest && (
        <Link href={`/upload/${token}`} target="_blank" className="mt-2 inline-flex px-4 py-2 rounded-xl bg-[#0B4DA2] text-white text-xs font-bold">
          Upload {message.metadata?.document_name || "Document"} Now
        </Link>
      )}
    </div>
  );
}

function statusText(status: string) {
  if (status === "pending") return "Under Review";
  if (status === "active") return "In Progress";
  if (status === "completed") return "Complete";
  if (status === "cancelled") return "Cancelled";
  return "Draft";
}

function badgeTone(status: string): "blue" | "red" | "green" | "gold" | "gray" {
  if (status === "pending") return "gold";
  if (status === "active") return "blue";
  if (status === "completed") return "green";
  if (status === "cancelled") return "red";
  return "gray";
}
