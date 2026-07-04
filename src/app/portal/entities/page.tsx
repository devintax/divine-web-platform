"use client";

import { Building2, CalendarDays, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

type Entity = {
  id: string;
  name: string;
  entityType: string;
  state: string;
  status: string;
  registeredAgent: string;
  annualReportDue: string;
};

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("dfg-active-entity") || "";
    fetch("/api/portal/entities", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setEntities(data.entities || []);
        setActiveId(saved || data.entities?.[0]?.id || "");
      })
      .finally(() => setLoading(false));
  }, []);

  function selectEntity(id: string) {
    setActiveId(id);
    localStorage.setItem("dfg-active-entity", id);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink">Business Entities</h1>
          <p className="mt-1 text-xs text-muted">Switch between businesses and see formation compliance details.</p>
        </div>
        <Link href="/portal/intake?service=formation" className="rounded-xl bg-[#0B4DA2] px-4 py-2 text-sm font-bold text-white">Add Entity</Link>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      ) : entities.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <Building2 className="mx-auto text-muted" size={34} />
          <h2 className="mt-3 text-lg font-black text-ink">No entities yet</h2>
          <p className="mt-1 text-sm text-muted">Start a formation intake to create your first business profile.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {entities.map((entity) => {
            const active = entity.id === activeId;
            return (
              <article key={entity.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${active ? "border-[#0B4DA2] ring-2 ring-blue-100" : "border-border"}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-ink">{entity.name}</h2>
                      {active && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-[#0B4DA2]">Active</span>}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-muted">{entity.entityType} - {entity.state} - {entity.status}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Info icon={ShieldCheck} label="Registered agent" value={entity.registeredAgent} />
                      <Info icon={CalendarDays} label="Annual report follow-up" value={new Date(entity.annualReportDue).toLocaleDateString()} />
                    </div>
                  </div>
                  <button onClick={() => selectEntity(entity.id)} className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold text-[#0B4DA2] hover:bg-blue-50">
                    Make Active
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-soft p-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted"><Icon size={14} /> {label}</div>
      <div className="mt-1 text-sm font-bold text-ink">{value}</div>
    </div>
  );
}
