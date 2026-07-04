import { ArrowRight, BadgeCheck, BookOpenCheck, Building2, CalendarCheck, Car, FileCheck2, LockKeyhole, MapPin, MessageSquareText, Phone, ReceiptText, ShieldCheck, Stamp, UploadCloud } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Btn, Pill } from "@/components/ui";
import { BRAND } from "@/lib/constants";

const services = [
  {
    href: "/login?service=tax",
    title: "Tax Preparation",
    desc: "Individual and business tax preparation with secure document upload, specialist review, and portal delivery.",
    icon: ReceiptText,
    color: "#0B4DA2",
  },
  {
    href: "/login?service=formation",
    title: "Business Formation",
    desc: "LLC, corporation, partnership, nonprofit, and professional entity support with staff-guided filing.",
    icon: Building2,
    color: "#C8102E",
  },
  {
    href: "/login?service=insurance",
    title: "Insurance Support",
    desc: "Manual agent support for auto and other coverage needs, with clear next steps and secure documents.",
    icon: Car,
    color: "#D97706",
  },
  {
    href: "/login?service=notary",
    title: "Notary Services",
    desc: "In-person and remote-friendly notarization workflow with scheduling, identity review, and vault delivery.",
    icon: Stamp,
    color: "#16A34A",
  },
  {
    href: "/login?service=bookkeeping",
    title: "Bookkeeping",
    desc: "Monthly bookkeeping coordination, report delivery, and year-end tax readiness for small businesses.",
    icon: BookOpenCheck,
    color: "#0891B2",
  },
];

const trustItems = [
  { label: "Serving New Castle since 2000", icon: MapPin },
  { label: "Secure client document vault", icon: LockKeyhole },
  { label: "Dedicated staff specialists", icon: BadgeCheck },
  { label: "Tax, business, insurance, notary, books", icon: ShieldCheck },
];

const steps = [
  { title: "Submit your intake", desc: "Choose the service you need and answer focused questions in the secure portal.", icon: UploadCloud },
  { title: "A specialist gets to work", desc: "Your request lands in the correct staff desk with documents, messages, and checklist tracking.", icon: MessageSquareText },
  { title: "Review and approve", desc: "Completed work is delivered to your vault for review, approval, and long-term access.", icon: FileCheck2 },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,77,162,.08)_0%,rgba(255,255,255,.96)_45%,rgba(255,255,255,1)_100%)]" />
        <div className="relative mx-auto grid min-h-[620px] max-w-[1200px] items-center gap-10 px-4 py-14 md:grid-cols-[1.05fr_.95fr] md:px-6 lg:py-18">
          <div>
            <Pill tone="blue">New Castle, Delaware - Est. 2000</Pill>
            <h1 className="mt-5 max-w-[680px] text-[clamp(34px,6vw,64px)] font-black leading-[1.02] text-ink">
              Divine Financial Group
            </h1>
            <p className="mt-4 max-w-[650px] text-[clamp(18px,2.5vw,28px)] font-extrabold leading-tight text-primary">
              Financial services built around real people, real businesses, and real follow-through.
            </p>
            <p className="mt-5 max-w-[590px] text-[15px] leading-8 text-muted">
              Tax preparation, business formation, insurance support, notary services, and bookkeeping in one secure staff-assisted platform. Submit your intake, upload documents safely, message your specialist, and receive completed work in your client vault.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login">
                <Btn as="span" variant="primary" sz="lg" className="min-h-[50px]">
                  Start Online <ArrowRight size={17} />
                </Btn>
              </Link>
              <a href={`tel:${BRAND.phone.replace(/[^\d+]/g, "")}`}>
                <Btn as="span" variant="outline" sz="lg" className="min-h-[50px]">
                  <Phone size={17} /> Call {BRAND.phone}
                </Btn>
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-full bg-blue-50" />
            <div className="relative rounded-[32px] border border-border bg-white p-8 shadow-xl">
              <Image src="/images/dfg-logo.png" alt="Divine Financial Group logo" width={190} height={190} className="mx-auto h-auto w-[170px]" priority />
              <div className="mt-6 text-center">
                <div className="text-xl font-black text-ink">{BRAND.tagline}</div>
                <p className="mx-auto mt-3 max-w-[360px] text-sm leading-7 text-muted">
                  One portal for service requests, secure uploads, messages, payments, approvals, and final document delivery.
                </p>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-3">
                {[
                  ["25+", "Years"],
                  ["5", "Services"],
                  ["24/7", "Vault"],
                  ["AES", "Security"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-border bg-soft p-4 text-center">
                    <div className="text-2xl font-black text-primary">{value}</div>
                    <div className="mt-1 text-[11px] font-bold text-muted">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-soft px-4 py-5 md:px-6">
        <div className="mx-auto grid max-w-[1200px] gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-bold text-ink">
                <Icon size={18} className="text-primary" />
                {item.label}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white px-4 py-16 md:px-6 lg:py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-9 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Pill tone="red">What we do</Pill>
              <h2 className="mt-3 max-w-[620px] text-[clamp(28px,4vw,42px)] font-black leading-tight text-ink">
                Five core services, one coordinated workflow.
              </h2>
            </div>
            <Link href="/services">
              <Btn as="span" variant="outline">
                View all services <ArrowRight size={16} />
              </Btn>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Link key={service.title} href={service.href} className="group rounded-xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: `${service.color}14`, color: service.color }}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-ink">{service.title}</h3>
                      <p className="mt-2 text-[13px] leading-7 text-muted">{service.desc}</p>
                      <div className="mt-3 inline-flex items-center gap-1 text-xs font-black text-primary">
                        Get started <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-soft px-4 py-16 md:px-6 lg:py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div>
              <Pill tone="blue">How it works</Pill>
              <h2 className="mt-3 text-[clamp(28px,4vw,40px)] font-black leading-tight text-ink">
                Built for a staff-assisted experience.
              </h2>
              <p className="mt-4 text-sm leading-8 text-muted">
                DFG specialists still do the professional work. The platform simply makes the handoff cleaner: better intake, safer document exchange, clearer status updates, and easier approvals.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-xl border border-border bg-white p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-primary">
                        <Icon size={22} />
                      </div>
                      <div className="text-sm font-black text-accent">0{index + 1}</div>
                    </div>
                    <div className="font-black text-ink">{step.title}</div>
                    <p className="mt-2 text-[13px] leading-7 text-muted">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 md:px-6 lg:py-20">
        <div className="mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <Pill tone="gold">Why DFG</Pill>
            <h2 className="mt-3 text-[clamp(28px,4vw,40px)] font-black leading-tight text-ink">
              Local service with a secure digital workflow.
            </h2>
            <p className="mt-4 text-sm leading-8 text-muted">
              Clients can start online without losing the human care of a local professional team. DFG keeps each service organized, documented, and visible from intake through delivery.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Secure vault", desc: "Upload links, scan status, and final documents stay in one client portal.", icon: LockKeyhole },
              { title: "Dedicated specialists", desc: "Each request routes to the right staff desk for manual professional service.", icon: BadgeCheck },
              { title: "Clear approvals", desc: "Review completed work and approve before final filing or delivery steps.", icon: FileCheck2 },
              { title: "Compliance-minded", desc: "Designed for tax records, business filings, notary documents, and financial data.", icon: CalendarCheck },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-border bg-soft p-5">
                  <Icon size={22} className="text-primary" />
                  <div className="mt-3 font-black text-ink">{item.title}</div>
                  <p className="mt-2 text-[13px] leading-7 text-muted">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-primary px-4 py-14 text-white md:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-black">Ready to get started?</div>
            <p className="mt-2 text-sm text-white/80">Call DFG or begin your secure online intake today.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={`tel:${BRAND.phone.replace(/[^\d+]/g, "")}`}>
              <Btn as="span" variant="white" sz="lg">
                <Phone size={17} /> Call {BRAND.phone}
              </Btn>
            </a>
            <Link href="/login">
              <Btn as="span" variant="dark" sz="lg">
                Start Online <ArrowRight size={17} />
              </Btn>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
