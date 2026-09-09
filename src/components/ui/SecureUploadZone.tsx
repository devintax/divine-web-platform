"use client";

import { Camera, UploadCloud } from "lucide-react";
import { useState, useRef } from "react";

interface SecureUploadZoneProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  helpText?: string;
  isUploading?: boolean;
  isSuccess?: boolean;
}

export default function SecureUploadZone({
  onUpload, accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx", maxSizeMB = 50,
  label = "Drag & drop files here or tap to browse",
  helpText,
}: SecureUploadZoneProps) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const valid = Array.from(files).filter(f => f.size <= maxSizeMB * 1024 * 1024);
    if (valid.length) await onUpload(valid);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
      className={`rounded-xl border-2 border-dashed p-5 text-center transition-all sm:p-8 ${
        drag ? "border-[#0B4DA2] bg-[#EBF2FF]" : "border-[#E2E8F0] bg-soft"
      }`}
    >
      <UploadCloud className="mx-auto mb-2 text-primary" size={32} aria-hidden="true" />
      <span className="block text-sm font-bold text-ink">{label}</span>
      {helpText && <span className="text-xs text-muted block mt-1">{helpText}</span>}
      <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
        <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">
          <UploadCloud size={17} aria-hidden="true" /> Choose files
        </button>
        <button type="button" onClick={() => cameraRef.current?.click()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-ink md:hidden">
          <Camera size={17} aria-hidden="true" /> Take photo
        </button>
      </div>
      <input ref={inputRef} type="file" multiple accept={accept} className="sr-only" onChange={e => handleFiles(e.target.files)} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => handleFiles(e.target.files)} />
    </div>
  );
}

export { SecureUploadZone };
