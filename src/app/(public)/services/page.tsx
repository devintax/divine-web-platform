import { ArrowRight, BookOpenCheck, Building2, Car, CheckCircle2, FileText, ReceiptText, ShieldCheck, Stamp } from "lucide-react";
import Link from "next/link";
import { Btn, Pill } from "@/components/ui";

const services = [
  {
    href: "/login?service=tax",
    title: "Tax Preparation",
    kicker: "Individuals and businesses",
    desc: "Secure intake, document upload, staff review, client approval, and final delivery through the portal.",
    icon: ReceiptText,
    color: "#0B4DA2",
    items: ["Individual tax returns", "Small business returns", "Prior-year review", "Secure W-2 and 1099 upload", "Client approval before filing"],
  },
  {
    href: "/login?service=formation",
    title: "Business Formation",
    kicker: "Nine entity paths planned",
    desc: "Staff-guided entity setup for LLCs, corporations, nonprofits, partnerships, and professional structures.",
    icon: Building2,
    color: "#C8102E",
    items: ["Entity selection support", "State filing coordination", "Owner information intake", "EIN tracking", "Annual report reminders"],
  },
  {
    href: "/login?service=insurance",
    title: "Insurance Support",
    kicker: "Manual agent workflow",
    desc: "A practical intake and staff follow-up flow for coverage questions, documents, and next-step guidance.",
    icon: Car,
    color: "#D97706",
    items: ["Auto coverage intake", "Driver and vehicle details", "Document requests", "Agent follow-up", "Policy document vaulting"],
  },
  {
    href: "/login?service=notary",
    title: "Notary Services",
    kicker: "Scheduling and e-sign ready",
    desc: "Identity review, appointment coordination, document exchange, and future Docuseal signing support.",
    icon: Stamp,
    color: "#16A34A",
    items: ["Document upload", "Identity review", "Appointment coordination", "Notary session tracking", "Completed file delivery"],
  },
  {
    href: "/login?service=bookkeeping",
    title: "Bookkeeping",
    kicker: "Monthly staff support",
    desc: "A clear client view for statements, requests, transaction review, and staff-delivered reports.",
    icon: BookOpenCheck,
    color: "#0891B2",
    items: ["Statement collection", "Monthly categorization workflow", "Staff questions", "Report delivery", "Tax readiness"],
  },
];

export default function ServicesPage() {
  return (
    <>
      <section className="bg-primary px-4 py-16 text-white md:px-6 lg:py-20">
        <div className="mx-auto max-w-[900px] text-center">
          <Pill tone="white">Services</Pill>
          <h1 className="mt-5 text-[clamp(32px,5vw,52px)] font-black leading-tight">
            Financial service workflows built for real staff support.
          </h1>
          <p className="mx-auto mt-5 max-w-[680px] text-[15px] leading-8 text-white/85">
            Start online, upload documents safely, message your specialist, and track the work from intake through delivery.
          </p>
        </div>
      </section>

      <section className="bg-white px-4 py-16 md:px-6 lg:py-20">
        <div className="mx-auto grid max-w-[1200px] gap-5">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <article key={service.title} className="grid gap-6 rounded-xl border border-border bg-white p-5 shadow-sm md:grid-cols-[220px_1fr_auto] md:items-center md:p-7">
                <div>
                  <div className="grid h-14 w-14 place-items-center rounded-xl" style={{ background: `${service.color}14`, color: service.color }}>
                    <Icon size={28} />
                  </div>
                  <div className="mt-4 text-[11px] font-black uppercase tracking-wide text-muted">{service.kicker}</div>
                  <h2 className="mt-1 text-2xl font-black text-ink">{service.title}</h2>
                </div>
                <div>
                  <p className="text-sm leading-8 text-muted">{service.desc}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {service.items.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                        <CheckCircle2 size={15} style={{ color: service.color }} />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <Link href={service.href}>
                  <Btn as="span" variant="outline">
                    Start <ArrowRight size={16} />
                  </Btn>
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-soft px-4 py-14 md:px-6">
        <div className="mx-auto grid max-w-[1200px] gap-4 md:grid-cols-3">
          {[
            { title: "Secure portal", desc: "Every service uses authenticated intake, messaging, and document delivery.", icon: ShieldCheck },
            { title: "Document vault", desc: "Uploads and completed work stay organized by service module.", icon: FileText },
            { title: "Human follow-up", desc: "The platform supports the team. DFG staff still handles the professional work.", icon: CheckCircle2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl border border-border bg-white p-5">
                <Icon className="text-primary" size={24} />
                <div className="mt-3 font-black text-ink">{item.title}</div>
                <p className="mt-2 text-[13px] leading-7 text-muted">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
