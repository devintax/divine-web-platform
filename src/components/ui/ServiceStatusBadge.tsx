"use client";

import { useEffect, useState } from "react";

interface ServiceStatusBadgeProps {
  enrollmentId: string;
}

export function ServiceStatusBadge({ enrollmentId }: ServiceStatusBadgeProps) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = () => {
      fetch("/api/services/enroll").then(r => r.json()).then(d => {
        const e = d.enrollments?.find((en: any) => en.id === enrollmentId);
        setData(e || null);
      });
    };
    fetchStatus();
    const iv = setInterval(fetchStatus, 30000);
    return () => clearInterval(iv);
  }, [enrollmentId]);

  if (!data) return <span className="text-xs text-muted">Loading...</span>;

  const colors: Record<string, string> = {
    draft: "bg-slate-200 text-slate-700",
    pending: "bg-amber-100 text-amber-700",
    active: "bg-blue-100 text-[#0B4DA2]",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    draft: "Draft", pending: "Under Review", active: "In Progress", completed: "Complete", cancelled: "Cancelled",
  };

  return (
    <div className="space-y-2">
      <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${colors[data.status] || colors.draft}`}>{labels[data.status] || data.status}</span>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${data.progress || 0}%`, background: '#0B4DA2' }} />
      </div>
    </div>
  );
}

export default ServiceStatusBadge;
