import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { BRAND } from "@/lib/constants";

const serviceLinks = [
  "Tax Preparation",
  "Business Formation",
  "Auto Insurance",
  "Notary Services",
  "Bookkeeping",
];

export function Footer() {
  return (
    <footer className="bg-ink px-4 pb-7 pt-12 text-white lg:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_.8fr_.9fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-[320px] text-[13px] leading-7 text-white/65">
              Professional tax preparation, business formation, insurance, notary, and bookkeeping support for Delaware families and small businesses.
            </p>
            <div className="mt-5 space-y-2 text-xs text-white/75">
              <div className="flex items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0" />
                <span>{BRAND.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={15} />
                <span>{BRAND.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={15} />
                <span>{BRAND.email}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 text-xs font-extrabold uppercase tracking-[0.12em] text-white/55">Company</div>
            {[
              { href: "/", label: "Home" },
              { href: "/services", label: "Services" },
              { href: "/about", label: "About" },
              { href: "/contact", label: "Contact" },
              { href: "/login", label: "Client Login" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="block py-1.5 text-[13px] font-semibold text-white/70 hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>

          <div>
            <div className="mb-4 text-xs font-extrabold uppercase tracking-[0.12em] text-white/55">Services</div>
            <div className="space-y-2">
              {serviceLinks.map((service) => (
                <div key={service} className="text-[13px] font-semibold text-white/65">
                  {service}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 text-xs font-extrabold uppercase tracking-[0.12em] text-white/55">Connect</div>
            <div className="space-y-2 text-[13px] font-semibold text-white/65">
              <div>Fax: {BRAND.fax}</div>
              <div>Text: {BRAND.text}</div>
              <div>WhatsApp: {BRAND.whatsapp}</div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { label: "Facebook", url: BRAND.facebook },
                { label: "X", url: BRAND.twitter },
                { label: "Instagram", url: BRAND.instagram },
              ].map((item) => (
                <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white/75 hover:bg-white/10 hover:text-white">
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/45 md:flex md:items-center md:justify-between md:text-left">
          <div>Copyright 2026 Divine Financial Group LLC. All rights reserved.</div>
          <div className="mt-2 md:mt-0">AES-256 encrypted - SOC2 aligned - GLBA conscious</div>
        </div>
      </div>
    </footer>
  );
}
