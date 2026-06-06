"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, Btn } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

export default function PublicUploadPage() {
  const params = useParams();
  const token = params.token as string;
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [linkInfo, setLinkInfo] = useState<any>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState<Record<string, "uploading" | "done" | "error">>({});
  const toast = useToast();

  useEffect(() => {
    fetch(`/api/vault/link?token=${encodeURIComponent(token)}`)
      .then(async r => {
        const j = await r.json();
        if (!r.ok) {
          setErrorMsg(j.error || "Invalid link");
          setValid(false);
        } else {
          setValid(true);
          setLinkInfo(j);
        }
      })
      .catch(() => { setErrorMsg("Could not validate link"); setValid(false); })
      .finally(() => setValidating(false));
  }, [token]);

  async function upload() {
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => { fd.append("files", f); setProgress(p => ({ ...p, [f.name]: "uploading" })); });
      const res = await fetch(`/api/vault/public-upload?token=${encodeURIComponent(token)}`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const newProg: Record<string, "done"> = {};
      files.forEach(f => newProg[f.name] = "done");
      setProgress(newProg);
      toast.success(`${files.length} file(s) uploaded successfully!`);
      setDone(true);
    } catch (e: any) {
      toast.error(e.message);
      const newProg: Record<string, "error"> = {};
      files.forEach(f => newProg[f.name] = "error");
      setProgress(newProg);
    }
    setUploading(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...dropped]);
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-soft flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-2">🔐</div>
          <p className="text-sm text-muted">Validating secure link…</p>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-soft flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center p-8">
          <div className="text-2xl font-black text-[#0B4DA2] mb-3">DFG</div>
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-xl font-black mb-2">This link has expired</h2>
          <p className="text-sm text-muted mb-5">{errorMsg}. Please contact Divine Financial Group for a new secure link.</p>
          <div className="space-y-2 text-xs text-muted">
            <div>📞 <a href="tel:3023225515" className="text-[#0B4DA2] font-bold">(302) 322-5515</a></div>
            <div>✉ <a href="mailto:info@dfgbusiness.com" className="text-[#0B4DA2] font-bold">info@dfgbusiness.com</a></div>
          </div>
          <a href="https://dfgbusiness.com" className="inline-block mt-4 px-4 py-2 bg-[#0B4DA2] text-white text-xs font-bold rounded-lg">Visit dfgbusiness.com</a>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-soft flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center p-8">
          <div className="text-2xl font-black text-[#0B4DA2] mb-3">DFG</div>
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-black mb-2">Upload Complete!</h2>
          <p className="text-sm text-muted mb-2">{files.length} file(s) uploaded successfully and encrypted.</p>
          <p className="text-xs text-muted mb-5">Divine Financial Group has been notified and will review your documents shortly.</p>
          <div className="text-[10px] text-muted">You may close this page.</div>
          <div className="mt-6 pt-4 border-t border-border text-[10px] text-muted">
            <div className="font-black mb-1">Divine Financial Group</div>
            <div>622 E. Basin Road, Suite A · New Castle, DE 19720</div>
            <div>(302) 322-5515 · info@dfgbusiness.com</div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="text-2xl font-black text-[#0B4DA2] mb-2">DFG</div>
          <h1 className="text-xl font-black">Secure Document Upload</h1>
          {linkInfo?.purpose && <p className="text-sm text-muted mt-1">{linkInfo.purpose}</p>}
        </div>
        <Card className="p-6 space-y-4">
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-[#0B4DA2] bg-blue-50/40 rounded-xl p-8 text-center cursor-pointer hover:bg-blue-50 transition-colors"
            onClick={() => document.getElementById("file-input")?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); document.getElementById("file-input")?.click(); } }}
          >
            <div className="text-3xl mb-2">📁</div>
            <p className="text-sm font-bold text-ink">Drop files here or tap to browse</p>
            <p className="text-xs text-muted mt-1">Max 50MB per file. PDF, JPG, PNG, DOC.</p>
            <input id="file-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          </div>
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="truncate">{f.name}</span>
                    {progress[f.name] === "uploading" && <span className="text-xs text-amber-600">⏳</span>}
                    {progress[f.name] === "done" && <span className="text-xs text-green-600">✓</span>}
                    {progress[f.name] === "error" && <span className="text-xs text-red-600">⚠</span>}
                  </div>
                  {!progress[f.name] && (
                    <button className="text-red-600 font-bold text-xs ml-2" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>Remove</button>
                  )}
                </div>
              ))}
            </div>
          )}
          <Btn variant="primary" className="w-full" disabled={uploading || files.length === 0} onClick={upload}>
            {uploading ? "Uploading securely…" : "Upload Documents"}
          </Btn>
          <div className="text-center text-[10px] text-muted">
            🔒 AES-256 encrypted · 🛡 Virus scanned · ⏱ Auto-expires
          </div>
        </Card>
        <div className="text-center text-[10px] text-muted">
          <div className="font-bold mb-1">Divine Financial Group · 622 E. Basin Road, Suite A · New Castle, DE 19720</div>
          <div>This upload is secured by DFG&apos;s bank-grade document vault.</div>
        </div>
      </div>
    </div>
  );
}
