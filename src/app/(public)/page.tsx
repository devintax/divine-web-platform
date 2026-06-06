import Link from "next/link";
import { Pill, Btn, Card } from "@/components/ui";
import { SERVICES, BRAND } from "@/lib/constants";

function HeroSection() {
  const stats = [
    ["25+", "Years of Service"],
    ["2,400+", "Clients Served"],
    ["5", "Financial Services"],
    ["AES-256", "Bank-Grade Security"],
  ];

  const previewServices = [
    { icon: "🧾", label: "Tax Preparation", pct: 85, color: "#C8102E" },
    { icon: "🏛", label: "Business Formation", pct: 64, color: "#0B4DA2" },
    { icon: "🚗", label: "Auto Insurance", pct: 78, color: "#D97706" },
    { icon: "✍️", label: "Notary Services", pct: 95, color: "#16A34A" },
    { icon: "📊", label: "Bookkeeping", pct: 60, color: "#0891b2" },
  ];

  return (
    <section className="bg-gradient-to-br from-primary to-primary-dark text-white py-12 px-4 md:py-16 lg:py-24 lg:px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-16 items-center">
          <div className="animate-fade-in">
            <Pill tone="white">📍 New Castle, Delaware &middot; Est. 2000</Pill>
            <h1 className="text-[clamp(26px,5vw,46px)] font-black leading-[1.12] mt-4 lg:mt-5 mb-0">
              Your Trusted Partner<br className="hidden sm:block" /> in Financial Success
            </h1>
            <p className="text-sm lg:text-base leading-7 opacity-90 mt-4 lg:mt-5 max-w-[480px]">
              At Divine Financial Group, we understand that navigating the world of finance can be challenging. That&apos;s why we provide expert guidance and comprehensive financial solutions to individuals and businesses across Delaware.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-8">
              <Link href="/login">
                <Btn variant="white" sz="lg" icon="🔐" full className="sm:w-auto min-h-[48px]">Enter Client Portal</Btn>
              </Link>
              <Link href="/services">
                <Btn variant="dark" sz="lg" icon="🛠" full className="sm:w-auto min-h-[48px]">Our Services</Btn>
              </Link>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[13px] opacity-90">
              <span className="flex items-center gap-1.5">📞 {BRAND.phone}</span>
              <div className="hidden sm:block w-px h-4 bg-white/30" />
              <span className="flex items-center gap-1.5">✉ {BRAND.email}</span>
            </div>
          </div>

          {/* Preview Card — hidden on mobile */}
          <div className="relative hidden lg:block animate-slide-in-right">
            <div className="absolute -inset-5 bg-white/5 rounded-[32px]" />
            <div className="relative bg-white rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center text-white text-sm font-black">D</div>
                <Pill tone="green">● Secure Portal</Pill>
              </div>
              {previewServices.map((s) => (
                <div key={s.label} className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-base" style={{ background: `${s.color}12` }}>
                    {s.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-xs text-ink mb-1">{s.label}</div>
                    <div className="h-[5px] bg-blue-50 rounded">
                      <div className="h-full rounded" style={{ width: `${s.pct}%`, background: s.color }} />
                    </div>
                  </div>
                  <span className="text-[11px] font-extrabold" style={{ color: s.color }}>{s.pct}%</span>
                </div>
              ))}
              <Link href="/login" className="block mt-4">
                <Btn variant="primary" full>Access Your Dashboard →</Btn>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 lg:mt-16 border-t border-white/15 pt-8 lg:pt-10">
          {stats.map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="text-2xl lg:text-3xl font-black leading-none">{n}</div>
              <div className="text-[11px] lg:text-xs opacity-75 mt-1.5 font-semibold">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesPreview() {
  return (
    <section className="py-12 lg:py-20 px-4 lg:px-6 bg-soft">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 lg:mb-10">
          <div>
            <Pill tone="red">Our Services</Pill>
            <h2 className="text-[clamp(22px,4vw,36px)] font-black mt-3">
              Financial Services<br />Designed for Your Success
            </h2>
          </div>
          <Link href="/services" className="hidden md:block">
            <Btn variant="primary">View All Services →</Btn>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 stagger-children">
          {SERVICES.map((s) => (
            <Card key={s.id} className="flex flex-col !p-4 lg:!p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 lg:w-[46px] h-10 lg:h-[46px] rounded-xl flex items-center justify-center text-xl lg:text-[22px]" style={{ background: `${s.color}12` }}>
                  {s.icon}
                </div>
                <div className="font-extrabold text-sm">{s.title}</div>
              </div>
              <p className="text-[13px] text-muted leading-7 mb-4">{s.desc}</p>
              <ul className="list-none mb-5 flex-1">
                {s.items.map((item) => (
                  <li key={item} className="flex gap-2 text-xs mb-1.5 text-ink">
                    <span className="text-success font-black">✔</span>{item}
                  </li>
                ))}
              </ul>
              <Link href="/services">
                <Btn variant="outline" full sz="sm" className="min-h-[44px]">Learn More →</Btn>
              </Link>
            </Card>
          ))}
        </div>
        <div className="mt-6 md:hidden">
          <Link href="/services">
            <Btn variant="primary" full className="min-h-[48px]">View All Services →</Btn>
          </Link>
        </div>
      </div>
    </section>
  );
}

function WhyUs() {
  const reasons = [
    { icon: "★", title: "Expertise You Can Trust", desc: "Backed by 25+ years of experience in financial services, we provide solutions with accuracy and compliance at the forefront." },
    { icon: "👤", title: "Customized Strategies", desc: "Every client's financial situation is unique. We offer tailored solutions that align with your personal and business goals." },
    { icon: "🔒", title: "Commitment to Excellence", desc: "We prioritize client satisfaction, offering superior customer service and transparent financial guidance at every step." },
    { icon: "🌐", title: "Accessibility & Convenience", desc: "Located in the heart of New Castle, DE, our team is always available to serve you with professionalism and dedication." },
  ];

  return (
    <section className="py-12 lg:py-20 px-4 lg:px-6 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-10 lg:mb-14">
          <Pill tone="blue">Why Divine Financial Group</Pill>
          <h2 className="text-[clamp(22px,4vw,36px)] font-black mt-4">Experience the Divine Difference</h2>
          <p className="text-sm lg:text-[15px] text-muted mt-3 max-w-[560px] mx-auto leading-7">
            We don&apos;t just process transactions — we build lasting relationships with our clients.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 stagger-children">
          {reasons.map((r) => (
            <Card key={r.title} className="border-t-[3px] border-t-primary !p-4 lg:!p-6">
              <div className="w-10 lg:w-11 h-10 lg:h-11 bg-blue-50 rounded-xl flex items-center justify-center text-xl lg:text-[22px] mb-4">
                {r.icon}
              </div>
              <div className="font-extrabold text-[15px] mb-2">{r.title}</div>
              <div className="text-[13px] text-muted leading-7">{r.desc}</div>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 lg:mt-14 bg-gradient-to-br from-primary to-primary-dark rounded-2xl lg:rounded-3xl p-8 lg:p-12 text-white flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <div className="font-black text-xl lg:text-2xl">Ready to get started?</div>
            <div className="opacity-85 mt-2 text-sm">Let us simplify your financial journey. Contact us today.</div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link href="/contact"><Btn variant="white" sz="lg" full className="sm:w-auto min-h-[48px]">Contact Us</Btn></Link>
            <Link href="/services"><Btn variant="dark" sz="lg" full className="sm:w-auto min-h-[48px]">Our Services</Btn></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    { name: "Marcus T.", role: "Business Owner, Wilmington DE", quote: "Divine Financial Group helped me form my LLC and set up bookkeeping in the same week. Their team is incredibly knowledgeable and efficient." },
    { name: "Sandra R.", role: "Independent Contractor, Newark DE", quote: "I've been getting my taxes done here for 5 years. They always find deductions I would have missed and their pricing is very fair." },
    { name: "James A.", role: "Real Estate Investor, New Castle DE", quote: "The notary services are seamless — I was able to get my documents notarized remotely. The staff is professional and thorough." },
  ];

  return (
    <section className="py-12 lg:py-20 px-4 lg:px-6 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-8 lg:mb-12">
          <Pill tone="gold">Client Testimonials</Pill>
          <h2 className="text-[clamp(22px,3.5vw,32px)] font-black mt-3.5">What Our Clients Say</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 stagger-children">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-soft border border-border rounded-[20px] p-5 lg:p-7">
              <div className="text-3xl text-warning leading-none mb-4">&ldquo;</div>
              <p className="text-sm text-ink leading-7 mb-5">{t.quote}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-black text-base">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-extrabold text-[13px]">{t.name}</div>
                  <div className="text-[11px] text-muted">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServicesPreview />
      <WhyUs />
      <Testimonials />
    </>
  );
}
