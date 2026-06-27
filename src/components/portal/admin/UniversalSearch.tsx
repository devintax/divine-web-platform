"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function UniversalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      setResults(data.results || null);
      setOpen(true);
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  const total = (results?.clients?.length || 0) + (results?.enrollments?.length || 0) + (results?.documents?.length || 0);

  return (
    <div className="relative w-full max-w-md">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results && setOpen(true)}
        placeholder="Search clients, cases, documents"
        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-soft"
      />
      {open && total > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {results.clients?.map((client: any) => (
            <Link key={`client-${client.id}`} href={`/portal/admin?client=${client.id}`} onClick={() => setOpen(false)} className="block px-3 py-2 hover:bg-soft no-underline">
              <div className="text-xs font-black text-ink">{client.legal_name || client.email}</div>
              <div className="text-[11px] text-muted">{client.email || client.phone}</div>
            </Link>
          ))}
          {results.enrollments?.map((item: any) => (
            <Link key={`case-${item.id}`} href={`/portal/admin/${item.service_type}`} onClick={() => setOpen(false)} className="block px-3 py-2 hover:bg-soft no-underline">
              <div className="text-xs font-black text-ink capitalize">{item.service_type} case</div>
              <div className="text-[11px] text-muted">{item.id} · {item.status}</div>
            </Link>
          ))}
          {results.documents?.map((doc: any) => (
            <div key={`doc-${doc.id}`} className="px-3 py-2">
              <div className="text-xs font-black text-ink">{doc.display_name || doc.file_name}</div>
              <div className="text-[11px] text-muted capitalize">{doc.category || "general"} document</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
