"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { UniversalSearch } from "@/components/portal/admin/UniversalSearch";

const ALL_NAV = [
  { path: "/portal", icon: "⚡", label: "Dashboard", exact: true },
  { path: "/portal/intake", icon: "📋", label: "Services" },
  { path: "/portal/vault", icon: "🔐", label: "Vault" },
  { path: "/portal/chat", icon: "💬", label: "Chat" },
  { path: "/portal/admin", icon: "🛡", label: "Admin", staffOnly: true },
];

const STAFF_ROLES = new Set(["manager", "accountant", "specialist", "broker", "tax_intern", "support", "super_admin"]);

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [profile, setProfile] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/user/profile", { credentials: "include" })
      .then(r => r.json())
      .then(p => setProfile(p))
      .catch(() => setProfile(null));
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    if (showMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const role = profile?.role || "";
  const isStaff = STAFF_ROLES.has(role);
  const NAV = ALL_NAV.filter(n => !n.staffOnly || isStaff);
  const initials = (profile?.legal_name || profile?.email || "?").split(" ").map((s: string) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

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
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 w-[220px] h-screen bg-white border-r border-border flex-col z-30">
        <div className="p-5 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-[#0B4DA2]">DFG</Link>
          <Link href="/" className="text-[10px] font-bold text-muted hover:text-ink">Close ✕</Link>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((n) => {
            const active = isActive(n);
            return (
              <Link key={n.path} href={n.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${active ? "bg-[#0B4DA2] text-white" : "text-muted hover:bg-slate-50"}`}>
                <span>{n.icon}</span> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 space-y-3">
          <div className="bg-slate-50 rounded-xl p-3 text-[10px] space-y-1">
            <div className="font-black text-ink">🔒 Bank-Grade Mode</div>
            <div className="text-muted">✓ MFA · ✓ AES-256</div>
            <div className="text-muted">✓ SOC2 · ✓ GLBA</div>
          </div>
        </div>
      </aside>

      <div className="flex-1 md:ml-[220px] flex flex-col min-h-screen">
        {/* Top Bar */}
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
            <div ref={menuRef} className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 rounded-full bg-[#0B4DA2] text-white text-xs font-black grid place-items-center hover:bg-[#083a7a]">
                {initials}
              </button>
              {showMenu && (
                <div className="absolute right-0 top-11 w-56 bg-white border border-border rounded-xl shadow-lg p-2 z-50">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <div className="text-sm font-black text-ink truncate">{profile.legal_name || "User"}</div>
                    <div className="text-[11px] text-muted truncate">{profile.email}</div>
                    <div className="text-[10px] text-[#0B4DA2] font-bold uppercase mt-1">{role}</div>
                  </div>
                  <Link href="/portal" className="block px-3 py-2 text-xs font-bold text-ink rounded-lg hover:bg-slate-50">⚡ Dashboard</Link>
                  <Link href="/reset-password" className="block px-3 py-2 text-xs font-bold text-ink rounded-lg hover:bg-slate-50">🔑 Change Password</Link>
                  {isStaff && <Link href="/portal/admin" className="block px-3 py-2 text-xs font-bold text-ink rounded-lg hover:bg-slate-50">🛡 Admin Portal</Link>}
                  <button onClick={doSignOut} className="block w-full text-left px-3 py-2 text-xs font-bold text-red-600 rounded-lg hover:bg-red-50">Sign Out</button>
                </div>
              )}
            </div>
          )}
        </header>

        <main className="flex-1 pb-[80px] md:pb-6">
          <div className="max-w-5xl mx-auto px-4 py-5 md:py-7">{children}</div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-border flex items-center justify-around z-40" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {NAV.map((n) => {
          const active = isActive(n);
          return (
            <Link key={n.path} href={n.path}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold pt-1 flex-1 ${active ? "text-[#0B4DA2]" : "text-muted"}`}>
              <span className="text-xl leading-none">{n.icon}</span>
              <span className="leading-none">{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function getBreadcrumb(pathname: string): string {
  if (pathname === "/portal" || pathname === "/portal/" || pathname === "/portal/dashboard") return "Portal › Dashboard";
  if (pathname.startsWith("/portal/intake")) return "Portal › Service Intakes";
  if (pathname.startsWith("/portal/vault")) return "Portal › Secure Vault";
  if (pathname.startsWith("/portal/chat")) return "Portal › AI Concierge";
  if (pathname.startsWith("/portal/admin")) return "Portal › Staff Admin";
  return "Portal";
}
