"use client";

import { Building2, FileText, PhoneCall } from "lucide-react";
import { useEffect, useState } from "react";
import { Pill } from "@/components/ui";

type RecordRow = {
  id: string;
  businessName: string;
  entityType: string;
  state: string;
  agentName: string;
  usesDivineAgent: boolean;
  sopCount: number;
  lastUpdated: string | null;
  client?: { legal_name?: string | null; email?: string | null; phone?: string | null } | null;
};

export default function RegisteredAgentAdminPage() {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/registered-agent", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setRecords(data.records || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-ink">Registered Agent Dashboard</h1>
        <p className="mt-1 text-xs text-muted">Track DFG agent clients, SOP documents, and manual delivery follow-up.</p>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <Building2 className="mx-auto text-muted" size={34} />
          <h2 className="mt-3 text-lg font-black text-ink">No formation records yet</h2>
        </div>
      ) : (
        <div className="grid gap-3">
          {records.map((record) => (
            <article key={record.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black text-ink">{record.businessName}</h2>
                    <Pill tone={record.usesDivineAgent ? "green" : "gray"}>{record.agentName}</Pill>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-muted">{record.entityType} - {record.state} - {record.client?.legal_name || "Client"}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-muted">
                    {record.client?.email && <span>{record.client.email}</span>}
                    {record.client?.phone && <span>{record.client.phone}</span>}
                    {record.lastUpdated && <span>Updated {new Date(record.lastUpdated).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-soft px-3 py-2 text-xs font-bold text-ink">
                    <FileText size={14} /> {record.sopCount} SOP docs
                  </span>
                  {record.client?.phone && (
                    <a href={`tel:${record.client.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 rounded-xl bg-[#0B4DA2] px-3 py-2 text-xs font-bold text-white">
                      <PhoneCall size={14} /> Call
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
