"use client";

import { CalendarDays, PhoneCall } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Pill } from "@/components/ui";

type Event = {
  id: string;
  enrollmentId: string;
  businessName: string;
  entityType: string;
  state: string;
  dueDate: string;
  daysUntilDue: number;
  priority: "overdue" | "urgent" | "soon" | "normal";
  staffAction: string;
  client?: { legal_name?: string | null; email?: string | null; phone?: string | null } | null;
};

export default function ComplianceCalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/compliance", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setEvents(data.events || []))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => [...events].sort((a, b) => a.daysUntilDue - b.daysUntilDue), [events]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink">Compliance Calendar</h1>
          <p className="mt-1 text-xs text-muted">Formation annual report reminders for staff follow-up.</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-[#0B4DA2]">
          Manual workflow: staff calls client and records next steps.
        </div>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <CalendarDays className="mx-auto text-muted" size={32} />
          <h2 className="mt-3 text-lg font-black text-ink">No formation compliance dates yet</h2>
          <p className="mt-1 text-sm text-muted">Completed formation cases will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sorted.map((event) => (
            <article key={event.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black text-ink">{event.businessName}</h2>
                    <Pill tone={toneFor(event.priority)}>{labelFor(event.priority)}</Pill>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {event.entityType} - {event.state} - Ref #{event.enrollmentId.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-muted">{event.staffAction}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink">
                    <span>{event.client?.legal_name || "Client"}</span>
                    {event.client?.phone && <span>{event.client.phone}</span>}
                    {event.client?.email && <span>{event.client.email}</span>}
                  </div>
                </div>
                <div className="rounded-xl bg-soft p-4 text-sm lg:min-w-[220px]">
                  <div className="text-[10px] font-black uppercase text-muted">Annual report follow-up</div>
                  <div className="mt-1 text-lg font-black text-ink">{new Date(event.dueDate).toLocaleDateString()}</div>
                  <div className="mt-1 text-xs font-bold text-muted">
                    {event.daysUntilDue < 0 ? `${Math.abs(event.daysUntilDue)} days overdue` : `${event.daysUntilDue} days away`}
                  </div>
                  {event.client?.phone && (
                    <a href={`tel:${event.client.phone.replace(/[^\d+]/g, "")}`} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0B4DA2] px-3 py-2 text-xs font-bold text-white">
                      <PhoneCall size={14} /> Call Client
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

function toneFor(priority: Event["priority"]): "blue" | "red" | "green" | "gold" | "gray" {
  if (priority === "overdue") return "red";
  if (priority === "urgent") return "gold";
  if (priority === "soon") return "blue";
  return "gray";
}

function labelFor(priority: Event["priority"]) {
  if (priority === "overdue") return "Overdue";
  if (priority === "urgent") return "Due within 30 days";
  if (priority === "soon") return "Due within 90 days";
  return "Scheduled";
}
