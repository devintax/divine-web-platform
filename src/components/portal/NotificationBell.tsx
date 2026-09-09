"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  body?: string | null;
  href?: string | null;
  read_at?: string | null;
  created_at: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    try {
      const res = await fetch("/api/portal/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications || []);
      setUnread(Number(data.unreadCount || 0));
    } catch {
      // Keep the last known state during brief offline or reconnect periods.
    }
  }

  useEffect(() => {
    load();
    const id = window.setInterval(load, 30000);
    return () => window.clearInterval(id);
  }, []);

  async function markRead() {
    try {
      await fetch("/api/portal/notifications", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      await load();
    } catch {
      // A later poll will retry when connectivity returns.
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative w-9 h-9 rounded-full border border-border bg-white grid place-items-center text-muted hover:text-[#0B4DA2] hover:bg-slate-50"
        aria-label="Open notifications"
      >
        <Bell size={17} />
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-[#C8102E] text-white text-[10px] font-black grid place-items-center">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-2rem)] bg-white border border-border rounded-xl shadow-lg p-2 z-50">
          <div className="flex items-center justify-between px-2 py-2 border-b border-border">
            <div className="text-sm font-black text-ink">Notifications</div>
            <button type="button" onClick={markRead} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B4DA2]">
              <CheckCheck size={13} />
              Mark read
            </button>
          </div>
          <div className="max-h-80 overflow-auto py-1">
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted">No notifications yet.</div>
            ) : (
              items.map((item) => {
                const content = (
                  <div className={`px-3 py-2 rounded-lg hover:bg-slate-50 ${item.read_at ? "" : "bg-blue-50/60"}`}>
                    <div className="text-xs font-black text-ink">{item.title}</div>
                    {item.body && <div className="text-[11px] text-muted mt-0.5 line-clamp-2">{item.body}</div>}
                    <div className="text-[10px] text-muted mt-1">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                );
                return item.href ? (
                  <Link key={item.id} href={item.href} onClick={() => setOpen(false)}>{content}</Link>
                ) : (
                  <div key={item.id}>{content}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
