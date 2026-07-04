"use client";

import { Menu, Phone, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo, Btn } from "@/components/ui";
import { BRAND } from "@/lib/constants";

const links = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-4 md:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-4 py-2 text-[13px] font-bold transition-colors ${
                  active ? "bg-blue-50 text-primary" : "text-muted hover:bg-slate-50 hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a href={`tel:${BRAND.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-xs font-bold text-ink">
            <Phone size={15} />
            {BRAND.phone}
          </a>
          <Link href="/login">
            <Btn variant="primary" sz="sm">
              Client Portal
            </Btn>
          </Link>
        </div>

        <button
          className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-white text-ink md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-x-0 top-[68px] z-50 border-b border-border bg-white px-4 py-5 shadow-xl md:hidden">
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-4 py-4 text-base font-bold ${
                  pathname === link.href ? "bg-blue-50 text-primary" : "text-ink hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 rounded-xl bg-soft p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-muted">
                <ShieldCheck size={16} />
                Secure client portal
              </div>
              <Link href="/login" className="mt-3 block">
                <Btn variant="primary" full sz="lg">
                  Enter Client Portal
                </Btn>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
