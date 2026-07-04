"use client";

import { useState } from "react";
import { ArrowRight, Camera, Clock, Globe, Mail, MapPin, MessageCircle, Phone, Send, Share2, ShieldCheck, type LucideIcon } from "lucide-react";
import { Btn, Pill } from "@/components/ui";
import { BRAND } from "@/lib/constants";

const initialForm = { name: "", email: "", phone: "", service: "", message: "" };

export default function ContactPage() {
  const [form, setForm] = useState(initialForm);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitContact() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send. Please try again.");
        return;
      }
      setSent(true);
      setForm(initialForm);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="bg-primary px-4 py-16 text-white md:px-6 lg:py-20">
        <div className="mx-auto max-w-[820px] text-center">
          <Pill tone="white">Contact</Pill>
          <h1 className="mt-5 text-[clamp(32px,5vw,50px)] font-black leading-tight">
            Talk with Divine Financial Group.
          </h1>
          <p className="mx-auto mt-5 max-w-[650px] text-[15px] leading-8 text-white/85">
            Tell us what you need help with. A team member will follow up with the right next step.
          </p>
        </div>
      </section>

      <section className="bg-white px-4 py-16 md:px-6 lg:py-20">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_390px] lg:items-start">
          <div>
            <Pill tone="blue">Send a message</Pill>
            <h2 className="mt-3 text-[clamp(28px,4vw,38px)] font-black text-ink">How can we help?</h2>

            {sent ? (
              <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                <ShieldCheck className="mx-auto text-success" size={38} />
                <div className="mt-4 text-xl font-black text-success">Message sent</div>
                <p className="mt-2 text-sm leading-7 text-muted">We will be in touch within one business day.</p>
                <button onClick={() => setSent(false)} className="mt-5 rounded-xl border border-border bg-white px-5 py-2 text-sm font-bold text-ink">
                  Send another message
                </button>
              </div>
            ) : (
              <div className="mt-7 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} placeholder="Your full name" />
                  <Field label="Email address" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} placeholder="you@example.com" type="email" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Phone number" value={form.phone} onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} placeholder="(302) 000-0000" type="tel" />
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-muted">Service of interest</label>
                    <select
                      value={form.service}
                      onChange={(e) => setForm((prev) => ({ ...prev, service: e.target.value }))}
                      className="w-full rounded-xl border-[1.5px] border-border bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
                    >
                      <option value="">Select a service</option>
                      <option>Tax Preparation</option>
                      <option>Business Formation</option>
                      <option>Insurance Support</option>
                      <option>Notary Services</option>
                      <option>Bookkeeping</option>
                      <option>General Inquiry</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-muted">Message</label>
                  <textarea
                    placeholder="Tell us how we can help..."
                    value={form.message}
                    onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                    className="h-[130px] w-full resize-y rounded-xl border-[1.5px] border-border px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </div>
                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-accent">{error}</div>}
                <Btn variant="primary" sz="lg" onClick={submitContact} disabled={loading} className={loading ? "!opacity-60" : ""}>
                  {loading ? "Sending..." : "Send message"} {!loading && <Send size={17} />}
                </Btn>
                <p className="text-center text-[11px] text-muted">Your information is kept confidential and used only to respond to your request.</p>
              </div>
            )}
          </div>

          <aside className="grid gap-4">
            <InfoCard icon={MapPin} title="Office" lines={["622 E. Basin Road, Suite A", "New Castle, DE 19720"]} />
            <InfoCard icon={Phone} title="Phone" lines={[BRAND.phone, `Text: ${BRAND.text}`]} />
            <InfoCard icon={Mail} title="Email" lines={[BRAND.email]} />
            <div className="rounded-xl border border-border bg-soft p-5">
              <div className="flex items-center gap-2 font-black text-ink">
                <Clock size={19} className="text-primary" /> Business hours
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                <Hour day="Monday - Friday" time="9:00 AM - 5:00 PM" />
                <Hour day="Saturday" time="By appointment" />
                <Hour day="Sunday" time="Closed" />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="font-black text-ink">Connect</div>
              <div className="mt-4 grid gap-2">
                <SocialLink href={BRAND.website} label="Website" icon={Globe} />
                <SocialLink href={BRAND.facebook} label="Facebook" icon={Share2} />
                <SocialLink href={BRAND.instagram} label="Instagram" icon={Camera} />
                <SocialLink href={BRAND.whatsapp} label="WhatsApp" icon={MessageCircle} />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-muted">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border-[1.5px] border-border px-4 py-3 text-sm outline-none transition-colors focus:border-primary"
      />
    </div>
  );
}

function InfoCard({ icon: Icon, title, lines }: { icon: LucideIcon; title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="flex items-center gap-2 font-black text-ink">
        <Icon size={19} className="text-primary" /> {title}
      </div>
      <div className="mt-3 space-y-1 text-sm font-semibold text-muted">
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function Hour({ day, time }: { day: string; time: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-semibold text-ink">{day}</span>
      <span className="text-right font-bold text-muted">{time}</span>
    </div>
  );
}

function SocialLink({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg border border-border bg-soft px-3 py-2 text-sm font-bold text-primary">
      <span className="flex items-center gap-2">
        <Icon size={16} /> {label}
      </span>
      <ArrowRight size={15} />
    </a>
  );
}
