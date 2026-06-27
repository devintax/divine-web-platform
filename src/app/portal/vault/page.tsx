"use client";

import { useEffect, useState } from "react";
import { Btn, Card, SecureUploadZone } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

export default function VaultPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [role, setRole] = useState("");
  const [profileId, setProfileId] = useState("");
  const toast = useToast();

  async function loadAll() {
    try {
      const [r, l] = await Promise.all([
        fetch("/api/vault/files", { credentials: "include" }).then(r => r.json()),
        fetch("/api/vault/audit", { credentials: "include" }).then(r => r.json()).catch(() => ({ logs: [] })),
      ]);
      setFiles(r.files || []);
      setLogs(l.logs || []);
    } catch { setFiles([]); }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    fetch("/api/user/profile", { credentials: "include" }).then(r => r.json()).then(p => { setRole(p.role || ""); setProfileId(p.id || ""); });
    const iv = setInterval(loadAll, 30000);
    return () => clearInterval(iv);
  }, []);

  const categoryCounts = files.reduce((acc: Record<string, number>, file) => {
    const category = (file.category || "general").toLowerCase();
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
  const categories = ["tax","formation","insurance","notary","bookkeeping","identity","general"].filter((category) => categoryCounts[category] > 0);
  const visibleTabs = ["all", ...categories];
  const filtered = filter === "all" ? files : files.filter(f => (f.category || "general").toLowerCase() === filter);
  const isStaff = ["manager","accountant","specialist","broker","support","super_admin"].includes(role);

  async function uploadFiles(toUpload: File[]) {
    for (const file of toUpload) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("category", "general");
        const res = await fetch("/api/vault/upload", { method: "POST", body: fd, credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        toast.success(`${file.name} uploaded — scanning…`);
      } catch (e: any) { toast.error(e.message); }
    }
    loadAll();
  }

  async function downloadFile(f: any) {
    try {
      const res = await fetch(`/api/vault/download?id=${f.id}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Download failed");
      if (data.url) window.open(data.url, "_blank");
      else toast.info("File is still processing. Try again in a moment.");
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteFile(f: any) {
    try {
      const res = await fetch("/api/vault/delete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ id: f.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Delete failed");
      toast.success(`${f.display_name} deleted`);
      setConfirmDelete(null);
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  }

  async function toggleArchive(f: any) {
    const archive = f.status !== "archived";
    try {
      const res = await fetch(`/api/vault/${f.id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ archive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || "Archive update failed");
      toast.success(`${f.display_name || f.file_name} ${archive ? "archived" : "unarchived"}`);
      loadAll();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">🔐 Secure Vault</h1>
          <p className="text-xs text-muted mt-0.5">AES-256 encrypted · Malware scanned · Audit logged</p>
        </div>
        {isStaff && (
          <Btn variant="primary" onClick={() => setShowLinkModal(true)}>🔗 Generate Upload Link</Btn>
        )}
      </div>

      <Card>
        <SecureUploadZone label="Upload to your vault" helpText="Drag & drop or tap to browse. Max 50MB per file." onUpload={uploadFiles} />
      </Card>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {visibleTabs.map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 capitalize text-xs font-bold rounded-lg whitespace-nowrap ${filter === c ? "bg-white text-ink shadow-sm" : "text-muted"}`}>
            {c} <span className="ml-1 opacity-70">{c === "all" ? files.length : categoryCounts[c]}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_240px] gap-4">
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white border border-border rounded-2xl p-8 text-center text-sm text-muted">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">📁</div>
              <p className="text-sm font-bold text-ink mb-1">No documents yet</p>
              <p className="text-xs text-muted">Upload your first document above to get started.</p>
            </div>
          ) : (
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-muted font-bold uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Document</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Category</th>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f) => (
                      <tr key={f.id} className="border-t border-border hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-ink truncate max-w-[260px]">{f.display_name || f.file_name}</td>
                        <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                        <td className="px-4 py-3 capitalize text-muted">{f.category || "General"}</td>
                        <td className="px-4 py-3 text-muted">{new Date(f.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => downloadFile(f)} className="px-2 py-1 text-xs font-bold text-[#0B4DA2] hover:bg-blue-50 rounded">⬇ Download</button>
                            <button onClick={() => toggleArchive(f)} className="px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded">{f.status === "archived" ? "Unarchive" : "Archive"}</button>
                            <button onClick={() => setConfirmDelete(f)} className="px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded">🗑 Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-border">
                {filtered.map(f => (
                  <div key={f.id} className="p-3 space-y-2">
                    <div className="font-bold text-sm text-ink truncate">{f.display_name || f.file_name}</div>
                    <div className="flex items-center gap-2"><StatusBadge status={f.status} /><span className="text-[10px] text-muted capitalize">{f.category || "General"}</span></div>
                    <div className="text-[10px] text-muted">{new Date(f.created_at).toLocaleString()}</div>
                    <div className="flex gap-2">
                      <button onClick={() => downloadFile(f)} className="flex-1 px-2 py-1.5 text-xs font-bold text-[#0B4DA2] bg-blue-50 rounded">⬇ Download</button>
                      <button onClick={() => toggleArchive(f)} className="flex-1 px-2 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded">{f.status === "archived" ? "Unarchive" : "Archive"}</button>
                      <button onClick={() => setConfirmDelete(f)} className="flex-1 px-2 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded">🗑 Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {logs.length > 0 && (
            <Card>
              <div className="font-extrabold text-xs uppercase tracking-wide text-muted mb-3">🛡 Audit Trail</div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {logs.map((l) => (
                  <div key={l.id} className="text-[11px] text-muted flex gap-2 items-baseline">
                    <span className="text-[10px] opacity-60">{new Date(l.created_at).toLocaleString()}</span>
                    <span className="font-bold text-ink">{l.action}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <Card>
          <div className="font-extrabold text-xs uppercase tracking-wide text-muted mb-3">Pipeline</div>
          {[
            { step: "Upload received", done: files.length > 0 },
            { step: "Malware scan", done: files.some(f => f.virus_scanned) },
            { step: "Categorized", done: files.some(f => f.status === "clean") },
            { step: "Permanent vault", done: files.some(f => f.status === "clean") },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 py-2">
              <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold ${s.done ? "bg-green-100 text-green-700" : "bg-slate-100 text-muted"}`}>{s.done ? "✓" : i + 1}</span>
              <span className="text-xs font-bold text-ink">{s.step}</span>
            </div>
          ))}
        </Card>
      </div>

      {showLinkModal && <GenerateLinkModal onClose={() => setShowLinkModal(false)} targetUserId={profileId} />}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-ink mb-2">Delete document?</h3>
            <p className="text-sm text-muted mb-4">Are you sure you want to delete <b>{confirmDelete.display_name}</b>? This cannot be undone.</p>
            <div className="flex gap-2">
              <Btn variant="outline" onClick={() => setConfirmDelete(null)} className="flex-1">Cancel</Btn>
              <Btn variant="red" onClick={() => deleteFile(confirmDelete)} className="flex-1">Delete</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    uploaded: "bg-blue-100 text-blue-700",
    quarantine: "bg-amber-100 text-amber-700",
    scanning: "bg-blue-100 text-blue-700",
    clean: "bg-green-100 text-green-700",
    flagged: "bg-red-100 text-red-700",
    archived: "bg-slate-100 text-slate-600",
  };
  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${styles[status] || styles.uploaded}`}>{status}</span>;
}

function GenerateLinkModal({ onClose, targetUserId }: { onClose: () => void; targetUserId: string }) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [purpose, setPurpose] = useState("Please upload your documents securely");
  const [expiresIn, setExpiresIn] = useState("48h");
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState("");
  const toast = useToast();

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/vault/link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientEmail, expiresIn, targetUserId, purpose }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setLink(data.url);
      toast.success("Upload link generated");
    } catch (e: any) { toast.error(e.message); }
    setGenerating(false);
  }

  function copy() {
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-black text-ink mb-1">Generate Upload Link</h3>
        <p className="text-xs text-muted mb-4">Share a secure link for someone to upload documents directly.</p>
        {!link ? (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold uppercase text-muted">Recipient Email (optional)</span>
              <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} className="w-full mt-1 border-[1.5px] border-border rounded-xl px-3 py-2 text-base min-h-[44px]" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-muted">Purpose</span>
              <input value={purpose} onChange={e => setPurpose(e.target.value)} className="w-full mt-1 border-[1.5px] border-border rounded-xl px-3 py-2 text-base min-h-[44px]" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-muted">Expires In</span>
              <div className="flex gap-1.5 mt-1">
                {["24h","48h","7 days"].map(opt => (
                  <button key={opt} onClick={() => setExpiresIn(opt)} className={`flex-1 px-2 py-2 text-xs font-bold rounded-lg border transition-colors ${expiresIn === opt ? "bg-[#0B4DA2] text-white border-[#0B4DA2]" : "bg-white border-border text-muted"}`}>{opt}</button>
                ))}
              </div>
            </label>
            <div className="flex gap-2 pt-2">
              <Btn variant="outline" onClick={onClose} className="flex-1">Cancel</Btn>
              <Btn variant="primary" onClick={generate} disabled={generating} className="flex-1">{generating ? "Generating..." : "Generate Link"}</Btn>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input readOnly value={link} className="w-full bg-slate-50 border-[1.5px] border-border rounded-xl px-3 py-2 text-xs font-mono text-ink" />
            <Btn variant="primary" onClick={copy} className="w-full">📋 Copy Link</Btn>
            <Btn variant="outline" onClick={onClose} className="w-full">Close</Btn>
          </div>
        )}
      </div>
    </div>
  );
}
