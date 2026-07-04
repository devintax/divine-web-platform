"use client";

import { useState } from "react";

export default function PdfToolsPage() {
  const [compressFile, setCompressFile] = useState<File | null>(null);
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [level, setLevel] = useState("medium");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function downloadFromResponse(response: Response, fallbackName: string) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const disposition = response.headers.get("content-disposition") || "";
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] || fallbackName;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function compress() {
    if (!compressFile) return;
    setBusy("compress");
    setMessage("");
    const form = new FormData();
    form.append("file", compressFile);
    form.append("level", level);
    const res = await fetch("/api/admin/pdf/compress", { method: "POST", body: form, credentials: "include" });
    if (res.ok) {
      await downloadFromResponse(res, "compressed.pdf");
      setMessage("Compressed PDF downloaded.");
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Compression failed.");
    }
    setBusy("");
  }

  async function merge() {
    if (mergeFiles.length < 2) return;
    setBusy("merge");
    setMessage("");
    const form = new FormData();
    mergeFiles.forEach((file) => form.append("files", file));
    const res = await fetch("/api/admin/pdf/merge", { method: "POST", body: form, credentials: "include" });
    if (res.ok) {
      await downloadFromResponse(res, "dfg_merged.pdf");
      setMessage("Merged PDF downloaded.");
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Merge failed.");
    }
    setBusy("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-ink">PDF Tools</h1>
        <p className="mt-1 text-sm text-muted">Stirling-PDF tools for staff document prep.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-white p-5 space-y-3">
          <h2 className="text-sm font-black text-ink">Compress PDF</h2>
          <input type="file" accept="application/pdf" onChange={(event) => setCompressFile(event.target.files?.[0] || null)} className="w-full rounded-xl border border-border px-3 py-2 text-sm" />
          <select value={level} onChange={(event) => setLevel(event.target.value)} className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="extreme">Extreme</option>
          </select>
          <button disabled={busy === "compress" || !compressFile} onClick={compress} className="rounded-xl bg-[#0B4DA2] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            {busy === "compress" ? "Compressing..." : "Compress PDF"}
          </button>
        </section>

        <section className="rounded-2xl border border-border bg-white p-5 space-y-3">
          <h2 className="text-sm font-black text-ink">Merge PDFs</h2>
          <input type="file" accept="application/pdf" multiple onChange={(event) => setMergeFiles(Array.from(event.target.files || []))} className="w-full rounded-xl border border-border px-3 py-2 text-sm" />
          <p className="text-xs text-muted">{mergeFiles.length} file{mergeFiles.length === 1 ? "" : "s"} selected</p>
          <button disabled={busy === "merge" || mergeFiles.length < 2} onClick={merge} className="rounded-xl bg-[#C8102E] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            {busy === "merge" ? "Merging..." : "Merge PDFs"}
          </button>
        </section>
      </div>

      {message && <div className="rounded-xl border border-border bg-white p-4 text-sm font-bold text-ink">{message}</div>}
    </div>
  );
}
