"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, Btn } from "@/components/ui";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Prevent body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <nav
      className={`sticky top-0 z-50 border-b border-border transition-all duration-200 ${
        scrolled ? "bg-white/97 backdrop-blur-xl -webkit-backdrop-blur-xl" : "bg-white"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 flex items-center justify-between h-[60px] md:h-[68px]">
        <Logo />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-4 py-2 text-[13px] font-bold transition-colors no-underline ${
                  active
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted hover:text-ink border-b-2 border-transparent"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <div className="w-px h-6 bg-border mx-2" />
          <Link href="/login">
            <Btn variant="primary" sz="sm" icon="🔐">
              Client Portal
            </Btn>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-2xl border-none bg-transparent cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile full-screen menu overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-[60px] bg-white z-50 animate-slide-down safe-bottom">
          <div className="flex flex-col p-6 gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-4 rounded-xl text-lg font-bold no-underline min-h-[52px] flex items-center active:bg-soft transition-colors ${
                  pathname === l.href ? "bg-blue-50 text-primary" : "text-ink"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-4">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Btn variant="primary" full sz="lg" className="min-h-[52px]">
                  🔐 Client Portal
                </Btn>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
