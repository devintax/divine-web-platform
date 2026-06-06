"use client";

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

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const valid = Array.from(files).filter(f => f.size <= maxSizeMB * 1024 * 1024);
    if (valid.length) await onUpload(valid);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload files"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#0B4DA2] focus:ring-offset-2 ${
        drag ? "border-[#0B4DA2] bg-[#EBF2FF]" : "border-[#E2E8F0] bg-soft"
      }`}
    >
      <div className="text-3xl mb-2">&#129034;</div>
      <span className="text-sm font-bold text-ink">{label}</span>
      {helpText && <span className="text-xs text-muted block mt-1">{helpText}</span>}
      <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={e => handleFiles(e.target.files)} />
    </div>
  );
}

export { SecureUploadZone };
