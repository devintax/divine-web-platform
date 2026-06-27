"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Pill, SecureUploadZone } from "@/components/ui";
import { SERVICE_WORKFLOW, type ServiceType } from "@/lib/service-workflow";
import IntakeSummary from "@/components/admin/IntakeSummary";

type Tab = "documents" | "messages" | "checklist" | "deliverables" | "notes";

export default function ServiceDesk({ service }: { service: ServiceType }) {
  const meta = SERVICE_WORKFLOW[service];
  const [cases, setCases] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selected, setSelected] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("documents");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [nudgeResult, setNudgeResult] = useState("");

  const loadCases = useCallback(async () => {
    const res = await fetch(`/api/admin/cases?service=${service}`, { credentials: "include" });
    const json = await res.json();
    const rows = json.cases || [];
    setCases(rows);
    if (!selectedId && rows[0]) setSelectedId(rows[0].id);
    setLoading(false);
  }, [selectedId, service]);

  async function loadCase(id: string) {
    if (!id) return;
    const res = await fetch(`/api/cases/${id}`, { credentials: "include" });
    const json = await res.json();
    setSelected(json.case || null);
  }

  useEffect(() => { loadCases(); }, [loadCases]);
  useEffect(() => { loadCase(selectedId); }, [selectedId]);

  const urgentCount = cases.filter((c) => c.priority === "urgent" || c.priority === "high").length;
  const current = selected?.enrollment;

  async function patchCase(payload: Record<string, unknown>) {
    if (!current) return;
    setBusy(true);
    await fetch(`/api/cases/${current.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
    await Promise.all([loadCases(), loadCase(current.id)]);
    setBusy(false);
  }

  async function claimCase() {
    if (!current) return;
    setBusy(true);
    await fetch(`/api/cases/${current.id}/claim`, { method: "POST", credentials: "include" });
    await Promise.all([loadCases(), loadCase(current.id)]);
    setBusy(false);
  }

  async function completeCase() {
    if (!current) return;
    setBusy(true);
    const res = await fetch(`/api/cases/${current.id}/complete`, { method: "POST", credentials: "include" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error || "Could not complete case");
    }
    await Promise.all([loadCases(), loadCase(current.id)]);
    setBusy(false);
  }

  async function nudgeClient() {
    if (!current) return;
    setNudging(true);
    setNudgeResult("");
    const res = await fetch(`/api/cases/${current.id}/nudge`, { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    setNudgeResult(res.ok ? `SMS sent via ${data.provider || "gateway"}` : data.error || "SMS nudge failed");
    setNudging(false);
    setTimeout(() => setNudgeResult(""), 5000);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">{meta.label}</h1>
          <p className="text-xs text-muted mt-1">{cases.length} cases total · {urgentCount} priority · {meta.pod}</p>
        </div>
        {current && (
          <div className="flex flex-wrap gap-2">
            <button disabled={busy || Boolean(selected?.assignedStaff)} onClick={claimCase} className="px-4 py-2 rounded-xl bg-[#0B4DA2] text-white text-sm font-bold">{selected?.assignedStaff ? "Claimed" : "Claim Case"}</button>
            <button disabled={nudging} onClick={nudgeClient} className="px-4 py-2 rounded-xl bg-[#D97706] text-white text-sm font-bold">{nudging ? "Sending..." : "Nudge Client"}</button>
            {current.status !== "completed" && (
              <button disabled={busy} onClick={completeCase} className="px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-bold">Mark Complete</button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        <Card className="!p-3 space-y-2 max-h-[72vh] overflow-y-auto">
          {loading ? <p className="text-sm text-muted p-3">Loading queue...</p> : cases.length === 0 ? <p className="text-sm text-muted p-3">No open cases.</p> : cases.map((item) => (
            <button key={item.id} onClick={() => setSelectedId(item.id)}
              className={`w-full text-left rounded-xl border p-3 transition-colors ${selectedId === item.id ? "border-[#0B4DA2] bg-blue-50" : "border-border bg-white hover:bg-soft"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-black text-ink">{item.client?.legal_name || item.client?.email || "Unknown client"}</div>
                  <div className="text-[11px] text-muted mt-0.5">{item.status} · {item.progress || 0}%</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Pill tone={item.priority === "urgent" || item.priority === "high" ? "red" : "gray"}>{item.priority || "normal"}</Pill>
                  <SlaTimer slaDeadline={item.sla_deadline} createdAt={item.created_at} />
                </div>
              </div>
              <div className="mt-2 flex gap-1 flex-wrap">
                {(item.missing_documents || []).filter((d: any) => !d.is_received).length > 0 && <Pill tone="gold">Missing docs</Pill>}
                {(item.case_messages || []).filter((m: any) => !m.read_by_staff && m.sender_type === "client").length > 0 && <Pill tone="blue">Client reply</Pill>}
                {(item.case_deliverables || []).some((d: any) => d.requires_approval && !d.client_approved) && <Pill tone="red">Review pending</Pill>}
              </div>
            </button>
          ))}
        </Card>

        <Card className="!p-0 overflow-hidden">
          {!selected ? (
            <div className="p-6 text-sm text-muted">Select a case from the queue.</div>
          ) : (
            <>
              <div className="p-5 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-ink">{selected.client?.legal_name || selected.client?.email || "Client"}</h2>
                    <p className="text-xs text-muted">{meta.label} · submitted {new Date(current.created_at).toLocaleString()}</p>
                    <p className="text-xs text-muted mt-1">Specialist: {selected.assignedStaff?.legal_name || "Unassigned"}</p>
                    {nudgeResult && <p className={`text-xs font-bold mt-1 ${nudgeResult.startsWith("SMS sent") ? "text-green-700" : "text-red-600"}`}>{nudgeResult}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Pill tone={statusTone(current.status)}>{current.status}</Pill>
                    <Pill tone="gray">{current.progress || 0}%</Pill>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded mt-4 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${current.progress || 0}%`, background: meta.color }} />
                </div>
              </div>

              <div className="flex gap-1 bg-slate-100 p-1 m-4 rounded-xl overflow-x-auto">
                {(["documents","messages","checklist","deliverables","notes"] as Tab[]).map((name) => (
                  <button key={name} onClick={() => setTab(name)} className={`capitalize whitespace-nowrap flex-1 px-3 py-2 rounded-lg text-xs font-bold ${tab === name ? "bg-white text-ink shadow-sm" : "text-muted"}`}>{name}</button>
                ))}
              </div>

              <div className="p-5 pt-0">
                {tab === "documents" && <DocumentsTab selected={selected} reload={() => loadCase(current.id)} />}
                {tab === "messages" && <MessagesTab selected={selected} reload={() => loadCase(current.id)} />}
                {tab === "checklist" && <ChecklistTab selected={selected} reload={() => { loadCase(current.id); loadCases(); }} />}
                {tab === "deliverables" && <DeliverablesTab selected={selected} reload={() => { loadCase(current.id); loadCases(); }} />}
                {tab === "notes" && <NotesTab selected={selected} save={(internal_notes, client_message) => patchCase({ internal_notes, client_message })} />}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function DocumentsTab({ selected, reload }: { selected: any; reload: () => void }) {
  const [documents, setDocuments] = useState<any[]>(selected.documents || []);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [instructions, setInstructions] = useState("");

  const loadDocuments = useCallback(async () => {
    setLoadingDocs(true);
    const res = await fetch(`/api/cases/${selected.enrollment.id}/documents`, { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    setDocuments(json.documents || []);
    setLoadingDocs(false);
  }, [selected.enrollment.id]);

  useEffect(() => {
    loadDocuments();
    const interval = setInterval(loadDocuments, 3000);
    return () => clearInterval(interval);
  }, [loadDocuments]);

  async function requestDoc() {
    if (!documentName.trim()) return;
    await fetch(`/api/cases/${selected.enrollment.id}/missing-docs`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ documentName, instructions }) });
    setDocumentName(""); setInstructions(""); reload();
  }
  return (
    <div className="space-y-4">
      <IntakeSummary
        serviceType={selected.enrollment.service_type}
        intakeData={selected.enrollment.intake_data || {}}
        submittedAt={selected.enrollment.created_at}
        clientName={selected.client?.legal_name || selected.client?.email || "Client"}
      />
      <ServiceActionPanel selected={selected} reload={reload} />
      <div>
        <h3 className="text-sm font-black text-ink mb-2">Client Vault Documents</h3>
        {loadingDocs && documents.length === 0 ? <p className="text-sm text-muted">Loading documents...</p> : documents.length === 0 ? <p className="text-sm text-muted">No documents uploaded for this case yet.</p> : documents.map((doc: any) => (
          <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-border py-2 text-sm">
            <div>
              <span className="font-bold text-ink">{doc.display_name || doc.file_name}</span>
              <span className="text-xs text-muted block capitalize">{doc.category || "general"} document</span>
            </div>
            <Pill tone={doc.status === "clean" ? "green" : doc.status === "flagged" ? "red" : "gold"}>{doc.status}</Pill>
          </div>
        ))}
      </div>
      <div className="bg-soft rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-black text-ink">Request Missing Document</h3>
        <input value={documentName} onChange={(e) => setDocumentName(e.target.value)} placeholder="Document name" className="w-full border border-border rounded-xl px-3 py-2 text-sm" />
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Instructions" className="w-full border border-border rounded-xl px-3 py-2 text-sm min-h-20" />
        <button onClick={requestDoc} className="px-4 py-2 bg-[#C8102E] text-white text-sm font-bold rounded-xl">Request Document</button>
      </div>
      {(selected.missingDocuments || []).map((doc: any) => (
        <div key={doc.id} className="text-xs border border-border rounded-xl p-3">
          <div className="font-bold">{doc.document_name}</div>
          <div className="text-muted">{doc.is_received ? "Received" : "Waiting on client"}</div>
        </div>
      ))}
    </div>
  );
}

function ServiceActionPanel({ selected, reload }: { selected: any; reload: () => void }) {
  const service = selected.enrollment.service_type;
  const [value, setValue] = useState("");
  async function saveMessage(message: string) {
    await fetch(`/api/cases/${selected.enrollment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ client_message: message, status: "active", progress: Math.max(selected.enrollment.progress || 10, 25) }),
    });
    setValue("");
    reload();
  }

  if (service === "formation") {
    return (
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-black text-cyan-900">Formation Actions</h3>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="SOS confirmation or EIN" className="w-full border border-border rounded-xl px-3 py-2 text-sm" />
        <button onClick={() => saveMessage(value ? `Formation filing update: ${value}` : "Formation filing is in progress.")} className="px-3 py-2 bg-cyan-700 text-white text-xs font-bold rounded-xl">Save Filing Update</button>
      </div>
    );
  }
  if (service === "notary") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-black text-green-900">Notary Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => saveMessage("Your remote notary video link has been sent. Please join at the scheduled time.")} className="px-3 py-2 bg-green-700 text-white text-xs font-bold rounded-xl">Send Video Link</button>
          <button onClick={() => saveMessage("KYC has been verified. Your notary session is ready to proceed.")} className="px-3 py-2 bg-white border border-green-300 text-green-800 text-xs font-bold rounded-xl">KYC Verified</button>
        </div>
      </div>
    );
  }
  if (service === "insurance") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-black text-amber-900">Insurance Actions</h3>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Quote or carrier update" className="w-full border border-border rounded-xl px-3 py-2 text-sm" />
        <button onClick={() => saveMessage(value ? `Insurance update: ${value}` : "Insurance quotes are being reviewed.")} className="px-3 py-2 bg-amber-700 text-white text-xs font-bold rounded-xl">Save Quote Update</button>
      </div>
    );
  }
  return null;
}

function MessagesTab({ selected, reload }: { selected: any; reload: () => void }) {
  const [message, setMessage] = useState("");
  const [internal, setInternal] = useState(false);
  async function send() {
    if (!message.trim()) return;
    await fetch(`/api/cases/${selected.enrollment.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ message, isInternal: internal }) });
    setMessage(""); reload();
  }
  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {(selected.messages || []).map((m: any) => (
          <div key={m.id} className={`rounded-xl p-3 text-sm ${m.is_internal ? "bg-amber-50" : m.sender_type === "staff" ? "bg-blue-50" : "bg-soft"}`}>
            <div className="text-[10px] font-bold uppercase text-muted">{m.sender_type}{m.is_internal ? " internal" : ""}</div>
            <div className="whitespace-pre-wrap">{m.message}</div>
          </div>
        ))}
      </div>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message client or add an internal note" className="w-full border border-border rounded-xl px-3 py-2 text-sm min-h-24" />
      <label className="flex items-center gap-2 text-xs font-bold text-muted"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal staff note</label>
      <button onClick={send} className="px-4 py-2 bg-[#0B4DA2] text-white text-sm font-bold rounded-xl">Send</button>
    </div>
  );
}

function ChecklistTab({ selected, reload }: { selected: any; reload: () => void }) {
  async function toggle(item: any) {
    await fetch(`/api/cases/${selected.enrollment.id}/checklist`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ itemId: item.id, isComplete: !item.is_complete }) });
    reload();
  }
  return <div className="space-y-2">{(selected.checklist || []).map((item: any) => (
    <button key={item.id} onClick={() => toggle(item)} className="w-full flex items-center justify-between border border-border rounded-xl p-3 text-left text-sm hover:bg-soft">
      <span>{item.label}</span><Pill tone={item.is_complete ? "green" : "gray"}>{item.is_complete ? "Done" : "Open"}</Pill>
    </button>
  ))}</div>;
}

function DeliverablesTab({ selected, reload }: { selected: any; reload: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(selected.enrollment.service_type === "tax");
  async function upload(files: File[]) {
    if (!files[0] || !title.trim()) return;
    const form = new FormData();
    form.append("file", files[0]);
    form.append("title", title);
    form.append("description", description);
    form.append("requiresApproval", String(requiresApproval));
    await fetch(`/api/cases/${selected.enrollment.id}/deliverables`, { method: "POST", credentials: "include", body: form });
    setTitle(""); setDescription(""); reload();
  }
  return (
    <div className="space-y-4">
      <div className="bg-soft rounded-xl p-4 space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deliverable title" className="w-full border border-border rounded-xl px-3 py-2 text-sm" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full border border-border rounded-xl px-3 py-2 text-sm min-h-20" />
        <label className="flex items-center gap-2 text-xs font-bold text-muted"><input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} /> Requires client approval</label>
        <SecureUploadZone label="Upload completed work" helpText="Delivered to the client's vault." onUpload={upload} />
      </div>
      {(selected.deliverables || []).map((d: any) => (
        <div key={d.id} className="border border-border rounded-xl p-3 text-sm">
          <div className="font-bold">{d.title}</div>
          <div className="text-xs text-muted">{d.requires_approval ? (d.client_approved ? "Approved by client" : "Awaiting client approval") : "Delivered"}</div>
        </div>
      ))}
    </div>
  );
}

function NotesTab({ selected, save }: { selected: any; save: (internal: string, client: string) => void }) {
  const [internal, setInternal] = useState(selected.enrollment.internal_notes || "");
  const [client, setClient] = useState(selected.enrollment.client_message || "");
  return (
    <div className="space-y-3">
      <textarea value={internal} onChange={(e) => setInternal(e.target.value)} placeholder="Internal notes" className="w-full border border-border rounded-xl px-3 py-2 text-sm min-h-28" />
      <textarea value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client-visible status message" className="w-full border border-border rounded-xl px-3 py-2 text-sm min-h-24" />
      <button onClick={() => save(internal, client)} className="px-4 py-2 bg-[#0B4DA2] text-white text-sm font-bold rounded-xl">Save Notes</button>
    </div>
  );
}

function statusTone(status: string): "blue" | "red" | "green" | "gold" | "gray" {
  if (status === "pending") return "gold";
  if (status === "active") return "blue";
  if (status === "completed") return "green";
  if (status === "cancelled") return "red";
  return "gray";
}

function SlaTimer({ slaDeadline, createdAt }: { slaDeadline?: string | null; createdAt: string }) {
  const deadline = slaDeadline ? new Date(slaDeadline) : new Date(new Date(createdAt).getTime() + 48 * 60 * 60 * 1000);
  const hoursLeft = Math.ceil((deadline.getTime() - Date.now()) / 3600000);
  const tone = hoursLeft <= 0 ? "red" : hoursLeft <= 24 ? "gold" : "green";
  const label = hoursLeft <= 0
    ? `${Math.abs(hoursLeft)}h overdue`
    : hoursLeft <= 48
      ? `${hoursLeft}h left`
      : `${Math.ceil(hoursLeft / 24)}d left`;
  return <Pill tone={tone}>{label}</Pill>;
}
