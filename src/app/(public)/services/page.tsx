import Link from "next/link";
import { Pill, Btn, Card } from "@/components/ui";
import { SERVICES } from "@/lib/constants";

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary-dark py-[72px] px-6 text-white">
        <div className="max-w-[800px] mx-auto text-center">
          <Pill tone="white">Our Financial Services</Pill>
          <h1 className="text-3xl lg:text-[40px] font-black mt-5 leading-tight">Designed for Your Success</h1>
          <p className="text-[15px] leading-[1.8] opacity-90 mt-5 max-w-[560px] mx-auto">
            At Divine Financial Group, we offer a wide range of financial services designed to simplify complex financial processes and promote long-term financial health.
          </p>
        </div>
      </section>

      {/* Service Cards */}
      <section className="py-[72px] px-6 bg-white">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-8 stagger-children">
          {SERVICES.map((s) => (
            <Card key={s.id} className="!rounded-r-[20px] !rounded-l-none" style={{ borderLeft: `4px solid ${s.color}` }}>
              <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-8 items-start">
                <div>
                  <div className="text-[11px] font-bold text-muted mb-2">SERVICE</div>
                  <div className="text-[40px] font-black leading-none" style={{ color: s.color }}>{s.num}</div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mt-3 text-2xl" style={{ background: `${s.color}12` }}>
                    {s.icon}
                  </div>
                </div>
                <div>
                  <h3 className="text-[22px] font-black mb-2.5 text-ink">{s.title}</h3>
                  <p className="text-sm text-muted leading-7 mb-5">{s.longDesc}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {s.fullItems.map((item) => (
                      <div key={item} className="flex gap-2 text-[13px]">
                        <span className="font-black shrink-0" style={{ color: s.color }}>✔</span>
                        <span className="text-ink">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-6 bg-soft">
        <div className="max-w-[700px] mx-auto text-center">
          <h2 className="text-[28px] font-black mb-3.5">Ready to get started?</h2>
          <p className="text-sm text-muted leading-7 mb-7">
            ✔ Dedicated and personalized support &middot; ✔ Affordable pricing &middot; ✔ Highly skilled team
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/portal"><Btn as="span" variant="primary" sz="lg" icon="🔐">Enter Client Portal</Btn></Link>
            <Btn variant="outline" sz="lg">📞 (302) 322-5515</Btn>
          </div>
        </div>
      </section>
    </>
  );
}
