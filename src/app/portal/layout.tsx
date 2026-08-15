"use client";

import { BotMessageSquare, BriefcaseBusiness, Building2, CalendarDays, FileSignature, Home, KeyRound, LogOut, MessageSquareText, ReceiptText, ShieldCheck, UserRound, Vault } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { UniversalSearch } from "@/components/portal/admin/UniversalSearch";
import { NotificationBell } from "@/components/portal/NotificationBell";

const ALL_NAV = [
  { path: "/portal", icon: Home, label: "Dashboard", exact: true },
  { path: "/portal/intake", icon: BriefcaseBusiness, label: "Services" },
  { path: "/portal/entities", icon: Building2, label: "Entities" },
  { path: "/portal/bookkeeping", icon: ReceiptText, label: "Books" },
  { path: "/portal/vault", icon: Vault, label: "Vault" },
  { path: "/portal/appointments", icon: CalendarDays, label: "Appointments" },
  { path: "/portal/esign", icon: FileSignature, label: "E-Sign" },
  { path: "/portal/messages", icon: MessageSquareText, label: "Messages" },
  { path: "/portal/profile", icon: UserRound, label: "Profile" },
  { path: "/portal/chat", icon: BotMessageSquare, label: "AI Assistant" },
  { path: "/portal/admin", icon: ShieldCheck, label: "Admin", staffOnly: true },
];

const STAFF_ROLES = new Set(["manager", "accountant", "specialist", "broker", "tax_intern", "support", "super_admin"]);

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [profile, setProfile] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [liveConnected, setLiveConnected] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/user/profile", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    function handler(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false);
    }
    if (showMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const source = new EventSource("/api/portal/events");
    source.onopen = () => setLiveConnected(true);
    source.addEventListener("portal-update", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        setUnreadMessages(Number(data.unreadMessages || 0) + Number(data.unreadConversations || 0));
      } catch {}
    });
    source.onerror = () => {
      setLiveConnected(false);
      source.close();
    };
    return () => {
      setLiveConnected(false);
      source.close();
    };
  }, []);

  const role = profile?.role || "";
  const isStaff = STAFF_ROLES.has(role);
  const nav = ALL_NAV.filter((item) => !item.staffOnly || isStaff);
  const initials = (profile?.legal_name || profile?.email || "?")
    .split(" ")
    .map((part: string) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function isActive(item: typeof ALL_NAV[number]) {
    if (item.exact) return pathname === item.path || pathname === "/portal/dashboard";
    return pathname.startsWith(item.path);
  }

  async function doSignOut() {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-[100dvh] bg-soft flex">
      <aside className="hidden md:flex fixed top-0 left-0 w-[220px] h-screen bg-white border-r border-border flex-col z-30">
        <div className="p-5 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-[#0B4DA2]">DFG</Link>
          <Link href="/" className="text-[10px] font-bold text-muted hover:text-ink">Close</Link>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${active ? "bg-[#0B4DA2] text-white" : "text-muted hover:bg-slate-50"}`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 space-y-3">
          <div className="bg-slate-50 rounded-xl p-3 text-[10px] space-y-1">
            <div className="font-black text-ink">Bank-grade mode</div>
            <div className="text-muted">MFA ready - AES-256</div>
            <div className="text-muted">SOC2 - GLBA</div>
          </div>
        </div>
      </aside>

      <div className="flex-1 md:ml-[220px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-white border-b border-border h-14 md:h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="md:hidden text-lg font-black text-[#0B4DA2]">DFG</Link>
            <span className="hidden md:block text-xs text-muted">{getBreadcrumb(pathname)}</span>
          </div>
          {isStaff && pathname.startsWith("/portal/admin") && (
            <div className="hidden lg:block flex-1 max-w-md mx-4">
              <UniversalSearch />
            </div>
          )}
          {profile && (
            <div ref={menuRef} className="relative flex items-center gap-2">
              <span className={`hidden sm:inline-flex h-2 w-2 rounded-full ${liveConnected ? "bg-green-500" : "bg-slate-300"}`} title={liveConnected ? "Live updates connected" : "Live updates offline"} />
              <NotificationBell />
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="relative w-9 h-9 rounded-full bg-[#0B4DA2] text-white text-xs font-black grid place-items-center hover:bg-[#083a7a] overflow-hidden"
                aria-label="Open account menu"
              >
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.legal_name || "Profile photo"} fill sizes="36px" className="object-cover" unoptimized />
                ) : (
                  initials
                )}
              </button>
              {showMenu && (
                <div className="absolute right-0 top-11 w-56 bg-white border border-border rounded-xl shadow-lg p-2 z-50">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <div className="text-sm font-black text-ink truncate">{profile.legal_name || "User"}</div>
                    <div className="text-[11px] text-muted truncate">{profile.email}</div>
                    <div className="text-[10px] text-[#0B4DA2] font-bold uppercase mt-1">{role}</div>
                  </div>
                  <MenuLink href="/portal" icon={Home} label={unreadMessages > 0 ? `Dashboard (${unreadMessages})` : "Dashboard"} />
                  <MenuLink href="/portal/profile" icon={UserRound} label="Profile & Settings" />
                  <MenuLink href="/reset-password" icon={KeyRound} label="Change Password" />
                  {isStaff && <MenuLink href="/portal/admin" icon={ShieldCheck} label="Admin Portal" />}
                  <button onClick={doSignOut} className="flex w-full items-center gap-2 text-left px-3 py-2 text-xs font-bold text-red-600 rounded-lg hover:bg-red-50">
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        <main className="flex-1 pb-[80px] md:pb-6">
          <div className="max-w-5xl mx-auto px-4 py-5 md:py-7">{children}</div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border flex items-center justify-around z-40" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {nav.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-1 text-[10px] font-bold pt-1 flex-1 ${active ? "text-[#0B4DA2]" : "text-muted"}`}
            >
              <Icon size={20} />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function MenuLink({ href, icon: Icon, label }: { href: string; icon: ComponentType<{ size?: number }>; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-ink rounded-lg hover:bg-slate-50">
      <Icon size={14} />
      {label}
    </Link>
  );
}

function getBreadcrumb(pathname: string): string {
  if (pathname === "/portal" || pathname === "/portal/" || pathname === "/portal/dashboard") return "Portal > Dashboard";
  if (pathname.startsWith("/portal/intake")) return "Portal > Service Intakes";
  if (pathname.startsWith("/portal/entities")) return "Portal > Entities";
  if (pathname.startsWith("/portal/bookkeeping")) return "Portal > Bookkeeping";
  if (pathname.startsWith("/portal/vault")) return "Portal > Secure Vault";
  if (pathname.startsWith("/portal/appointments")) return "Portal > Appointments";
  if (pathname.startsWith("/portal/esign")) return "Portal > E-Signature";
  if (pathname.startsWith("/portal/messages")) return "Portal > Secure Messages";
  if (pathname.startsWith("/portal/profile")) return "Portal > Profile";
  if (pathname.startsWith("/portal/chat")) return "Portal > AI Concierge";
  if (pathname.startsWith("/portal/admin")) return "Portal > Staff Admin";
  return "Portal";
}
