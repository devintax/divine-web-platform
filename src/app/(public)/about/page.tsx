import { BadgeCheck, Building2, HeartHandshake, LockKeyhole, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Pill } from "@/components/ui";

const values = [
  { title: "Integrity", desc: "Client information is handled with care, confidentiality, and clear professional boundaries.", icon: ShieldCheck },
  { title: "Practical service", desc: "DFG focuses on useful next steps, organized records, and responsive follow-through.", icon: BadgeCheck },
  { title: "Client-centered support", desc: "The work starts with the client's situation, not a one-size-fits-all checklist.", icon: HeartHandshake },
  { title: "Accessible workflow", desc: "Local service is paired with a secure portal for uploads, messages, approvals, and delivery.", icon: LockKeyhole },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-primary px-4 py-16 text-white md:px-6 lg:py-20">
        <div className="mx-auto max-w-[900px] text-center">
          <Pill tone="white">About DFG</Pill>
          <h1 className="mt-5 text-[clamp(32px,5vw,52px)] font-black leading-tight">
            Local financial service with a modern client workflow.
          </h1>
          <p className="mx-auto mt-5 max-w-[690px] text-[15px] leading-8 text-white/85">
            Divine Financial Group serves Delaware families, entrepreneurs, and small businesses with tax, formation, insurance, notary, and bookkeeping support.
          </p>
        </div>
      </section>

      <section className="bg-white px-4 py-16 md:px-6 lg:py-20">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_.9fr] lg:items-center">
          <div>
            <Pill tone="blue">Our approach</Pill>
            <h2 className="mt-4 text-[clamp(28px,4vw,42px)] font-black leading-tight text-ink">
              Professional work stays human. The platform keeps it organized.
            </h2>
            <p className="mt-5 text-sm leading-8 text-muted">
              DFG's Phase 2 direction is deliberately practical: better public presence, secure payments, password reset and 2FA, compliance reminders, scheduling, and client-facing workflow improvements. Automation can come later. The current priority is helping staff serve clients clearly and reliably.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["25+", "Years of service"],
                ["5", "Core services"],
                ["1", "Secure portal"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-border bg-soft p-5">
                  <div className="text-3xl font-black text-primary">{value}</div>
                  <div className="mt-1 text-xs font-bold text-muted">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-soft p-6">
            <div className="rounded-xl bg-white p-5">
              <MapPin className="text-accent" size={24} />
              <div className="mt-3 text-xl font-black text-ink">New Castle, Delaware</div>
              <p className="mt-2 text-sm leading-7 text-muted">
                Serving clients from 622 E. Basin Road with a growing online platform for intake, document exchange, payments, approvals, and final delivery.
              </p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-5">
                <Users className="text-primary" size={22} />
                <div className="mt-3 font-black text-ink">Client first</div>
                <p className="mt-2 text-[13px] leading-7 text-muted">Clear communication and status visibility.</p>
              </div>
              <div className="rounded-xl bg-white p-5">
                <Building2 className="text-primary" size={22} />
                <div className="mt-3 font-black text-ink">Business ready</div>
                <p className="mt-2 text-[13px] leading-7 text-muted">Support for individuals and companies.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-soft px-4 py-16 md:px-6 lg:py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center">
            <Pill tone="red">Values</Pill>
            <h2 className="mt-3 text-[clamp(28px,4vw,40px)] font-black text-ink">What guides the work</h2>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div key={value.title} className="rounded-xl border border-border bg-white p-5">
                  <Icon className="text-primary" size={24} />
                  <div className="mt-4 font-black text-ink">{value.title}</div>
                  <p className="mt-2 text-[13px] leading-7 text-muted">{value.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 md:px-6 lg:py-20">
        <div className="mx-auto max-w-[950px] text-center">
          <Sparkles className="mx-auto text-accent" size={28} />
          <h2 className="mt-4 text-[clamp(28px,4vw,40px)] font-black text-ink">
            Phase 2 is about making the manual workflow excellent.
          </h2>
          <p className="mx-auto mt-4 max-w-[720px] text-sm leading-8 text-muted">
            The platform is being shaped around staff queues, client approvals, secure uploads, compliance reminders, appointment scheduling, and practical service delivery.
          </p>
        </div>
      </section>
    </>
  );
}
