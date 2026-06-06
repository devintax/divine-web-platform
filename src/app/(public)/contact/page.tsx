"use client";

import { useState } from "react";
import { Pill, Btn, Card } from "@/components/ui";
import { BRAND } from "@/lib/constants";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", service: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hours = [
    { day: "Monday – Friday", time: "9:00 AM – 5:00 PM", color: "text-success" },
    { day: "Saturday (Tax Season)", time: "10:00 AM – 2:00 PM", color: "text-warning" },
    { day: "Sunday", time: "Closed", color: "text-accent" },
  ];

  const contacts = [
    { icon: "📍", label: "Address", value: "622 E. Basin Road, Suite A\nNew Castle, DE 19720" },
    { icon: "📞", label: "Phone", value: BRAND.phone },
    { icon: "📠", label: "Fax", value: BRAND.fax },
    { icon: "💬", label: "Text / WhatsApp", value: `${BRAND.text}\n${BRAND.whatsapp}` },
    { icon: "✉", label: "Email", value: BRAND.email },
    { icon: "🌐", label: "Website", value: BRAND.website },
  ];

  const social = [
    { label: "Facebook", url: BRAND.facebook, icon: "👥" },
    { label: "X / Twitter", url: BRAND.twitter, icon: "🐦" },
    { label: "Instagram", url: BRAND.instagram, icon: "📸" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary-dark py-[72px] px-6 text-white">
        <div className="max-w-[700px] mx-auto text-center">
          <Pill tone="white">Get in Touch</Pill>
          <h1 className="text-3xl lg:text-[38px] font-black mt-4 leading-tight">
            Let&apos;s Secure Your Financial Future
          </h1>
          <p className="text-[15px] opacity-90 mt-4 leading-7">
            We&apos;re here to help you take control of your financial future with expert guidance and reliable financial solutions.
          </p>
        </div>
      </section>

      <section className="py-[72px] px-6 bg-white">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 items-start">
          {/* Form */}
          <div>
            <Pill tone="blue">Send Us a Message</Pill>
            <h2 className="text-[26px] font-black mt-3.5 mb-7">Contact Divine Financial Group</h2>

            {sent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-[20px] p-10 text-center">
                <div className="text-5xl">✅</div>
                <div className="font-extrabold text-xl mt-4 text-success">Message Sent!</div>
                <p className="text-muted mt-2">We&apos;ll be in touch within one business day.</p>
                <button onClick={() => setSent(false)} className="mt-5 px-5 py-2 border border-border rounded-xl bg-white font-bold text-sm cursor-pointer">
                  Send Another
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {[
                  { key: "name", label: "Full Name", ph: "Your full name", type: "text" },
                  { key: "email", label: "Email Address", ph: "your@email.com", type: "email" },
                  { key: "phone", label: "Phone Number", ph: "(302) 000-0000", type: "tel" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-xs font-bold text-muted block mb-1.5">{f.label}</label>
                    <input
                      type={f.type}
                      placeholder={f.ph}
                      value={form[f.key as keyof typeof form]}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-bold text-muted block mb-1.5">Service of Interest</label>
                  <select
                    value={form.service}
                    onChange={(e) => setForm((p) => ({ ...p, service: e.target.value }))}
                    className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-sm outline-none bg-white focus:border-primary"
                  >
                    <option value="">Select a service...</option>
                    <option>Tax Preparation & Planning</option>
                    <option>Business Formation & Consulting</option>
                    <option>Auto & Life Insurance</option>
                    <option>Notary Public Services</option>
                    <option>Bookkeeping & Payroll</option>
                    <option>General Inquiry</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted block mb-1.5">Message</label>
                  <textarea
                    placeholder="Tell us how we can help you..."
                    value={form.message}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                    className="w-full h-[120px] border-[1.5px] border-border rounded-xl px-4 py-3 text-sm outline-none resize-y focus:border-primary"
                  />
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-accent text-sm font-semibold rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}
                <Btn variant="primary" sz="lg" onClick={async () => {
                  setError("");
                  setLoading(true);
                  try {
                    const res = await fetch("/api/contact", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(form),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setSent(true);
                    } else {
                      setError(data.error || "Failed to send. Please try again.");
                    }
                  } catch {
                    setError("Network error. Please check your connection.");
                  } finally {
                    setLoading(false);
                  }
                }} disabled={loading} className={loading ? "!opacity-60" : ""}>
                  {loading ? "Sending..." : "Send Message →"}
                </Btn>
                <p className="text-[11px] text-muted text-center">
                  We respond within one business day. Your information is kept strictly confidential.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-5">
            <Card className="border-t-[3px] border-t-primary">
              <div className="font-black text-[15px] mb-5">📍 Contact Information</div>
              {contacts.map((c) => (
                <div key={c.label} className="flex gap-3 mb-4 pb-4 border-b border-border last:border-0 last:mb-0 last:pb-0">
                  <div className="w-9 h-9 bg-blue-50 rounded-[10px] shrink-0 flex items-center justify-center text-base">
                    {c.icon}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-muted mb-0.5">{c.label}</div>
                    <div className="text-[13px] font-bold text-ink whitespace-pre-line">{c.value}</div>
                  </div>
                </div>
              ))}
            </Card>

            <Card>
              <div className="font-black text-[15px] mb-4">🕐 Business Hours</div>
              {hours.map((h) => (
                <div key={h.day} className="flex justify-between items-center py-2.5 border-b border-border last:border-0 text-[13px]">
                  <span className="font-semibold text-ink">{h.day}</span>
                  <span className={`font-bold ${h.color}`}>{h.time}</span>
                </div>
              ))}
            </Card>

            <Card className="!bg-soft">
              <div className="font-black text-[15px] mb-4">📱 Follow Us</div>
              {social.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 no-underline"
                >
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-base">
                    {s.icon}
                  </div>
                  <span className="font-bold text-[13px] text-primary">{s.label}</span>
                  <span className="ml-auto text-[11px] text-muted">→</span>
                </a>
              ))}
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
