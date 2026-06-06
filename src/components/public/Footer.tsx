import Link from "next/link";
import { Logo } from "@/components/ui";
import { BRAND } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="bg-ink text-white pt-10 lg:pt-14 pb-7 px-4 lg:px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-10 lg:mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo light />
            <p className="text-[13px] opacity-65 leading-7 mt-4 max-w-[280px]">
              Your trusted partner in financial success. Serving Delaware families and businesses since 2000.
            </p>
            <div className="mt-5 flex flex-col gap-2 text-xs opacity-75">
              <div>📞 {BRAND.phone}</div>
              <div>✉ {BRAND.email}</div>
              <div>📍 622 E. Basin Rd, New Castle, DE 19720</div>
            </div>
          </div>

          {/* Company */}
          <div>
            <div className="font-extrabold text-xs tracking-[0.1em] uppercase mb-4 opacity-60">Company</div>
            {[
              { href: "/", label: "Home" },
              { href: "/about", label: "About" },
              { href: "/services", label: "Services" },
              { href: "/contact", label: "Contact" },
            ].map((l) => (
              <Link key={l.href} href={l.href}
                className="block text-white/70 font-semibold text-[13px] mb-2.5 no-underline hover:text-white py-1 min-h-[44px] flex items-center lg:min-h-0 lg:py-0">
                {l.label}
              </Link>
            ))}
          </div>

          {/* Services */}
          <div>
            <div className="font-extrabold text-xs tracking-[0.1em] uppercase mb-4 opacity-60">Services</div>
            {["Tax Preparation", "Business Formation", "Auto Insurance", "Notary Services", "Bookkeeping"].map((s) => (
              <div key={s} className="text-[13px] text-white/65 mb-2.5 font-semibold">{s}</div>
            ))}
          </div>

          {/* Connect */}
          <div>
            <div className="font-extrabold text-xs tracking-[0.1em] uppercase mb-4 opacity-60">Connect</div>
            {[
              { label: "Facebook", url: BRAND.facebook },
              { label: "X/Twitter", url: BRAND.twitter },
              { label: "Instagram", url: BRAND.instagram },
            ].map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                className="block text-[13px] text-white/65 mb-2.5 font-semibold no-underline hover:text-white py-1 min-h-[44px] flex items-center lg:min-h-0 lg:py-0">
                {s.label}
              </a>
            ))}
            <div className="mt-5 text-xs opacity-60 flex flex-col gap-1">
              <div>Fax: {BRAND.fax}</div>
              <div>Text: {BRAND.text}</div>
              <div>WhatsApp: {BRAND.whatsapp}</div>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/10" />
        <div className="pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs opacity-50 text-center md:text-left">
          <div>&copy; 2026 Divine Financial Group. All rights reserved.</div>
          <div>AES-256 encrypted &middot; SOC2 compliant &middot; GLBA compliant</div>
        </div>
      </div>
    </footer>
  );
}
