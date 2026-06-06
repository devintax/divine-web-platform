import { Pill, Card } from "@/components/ui";

export default function AboutPage() {
  const values = [
    { icon: "🔒", title: "Integrity", desc: "We conduct business with honesty, ensuring that your financial matters are handled ethically and professionally." },
    { icon: "★", title: "Excellence", desc: "We strive for precision in every financial service we provide, exceeding expectations at every level." },
    { icon: "👤", title: "Client-Centric Approach", desc: "Your financial well-being is our priority. We listen to your needs and provide customized strategies." },
    { icon: "🌐", title: "Accessibility & Convenience", desc: "Our firm is located in New Castle, DE, and we are always available to serve you." },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary-dark text-white py-[72px] px-6">
        <div className="max-w-[800px] mx-auto text-center">
          <Pill tone="white">About Divine Financial Group</Pill>
          <h1 className="text-3xl lg:text-[40px] font-black mt-5 leading-tight">
            More Than a Financial Service Provider —<br />We Are Your Partners in Success
          </h1>
          <p className="text-[15px] leading-[1.8] opacity-90 mt-5 max-w-[620px] mx-auto">
            Our mission is to empower individuals and businesses by offering reliable, transparent, and effective financial solutions tailored to their specific needs.
          </p>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-[72px] px-6 bg-white">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <Pill tone="blue">Our Story</Pill>
            <h2 className="text-3xl font-black mt-4 mb-5">Born from the Financial Crisis of 2000</h2>
            <p className="text-sm text-muted leading-[1.8] mb-4">
              To truly understand the mission and values of Divine Financial Group (DFG), we must revisit the year 2000 — an era marked by Y2K fears, the Dot Com bubble, financial turbulence, and a real estate collapse that left many uncertain about the future.
            </p>
            <p className="text-sm text-muted leading-[1.8] mb-4">
              While large corporations and industries received government support, countless individuals and small businesses were left to navigate the chaos on their own. Out of this challenging economic climate, <strong className="text-ink">Allstates Accounting Services</strong> was born — the foundation of what would become Divine Financial Group.
            </p>
            <p className="text-sm text-muted leading-[1.8]">
              From the very beginning, we have taken a personal, client-centered approach, combining empathy with proven financial strategies to address real-world challenges. At DFG, we don&apos;t believe in &quot;one-size-fits-all&quot; solutions.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-[20px] p-8 text-white">
              <div className="text-5xl font-black leading-none">25+</div>
              <div className="text-sm opacity-80 mt-1.5">Years serving Delaware families and businesses</div>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              {[["2,400+", "Clients Served"], ["5", "Services Offered"], ["100%", "Compliance Focus"], ["24/7", "Secure Portal"]].map(([n, l]) => (
                <Card key={l} className="text-center !p-5">
                  <div className="text-2xl font-black text-primary">{n}</div>
                  <div className="text-[11px] text-muted mt-1 font-semibold">{l}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-[72px] px-6 bg-soft">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <Pill tone="red">Our Core Values</Pill>
            <h2 className="text-3xl font-black mt-3.5">What We Stand For</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
            {values.map((v) => (
              <Card key={v.title} className="border-t-[3px] border-t-accent">
                <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center text-[22px] mb-3.5">
                  {v.icon}
                </div>
                <div className="font-extrabold text-[15px] text-accent mb-2">{v.title}</div>
                <div className="text-[13px] text-muted leading-7">{v.desc}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Partner */}
      <section className="py-[72px] px-6 bg-white">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <Pill tone="blue">Why Partner With Us</Pill>
            <h2 className="text-3xl font-black mt-3.5">Comprehensive Expertise. Personalized Service.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { title: "Comprehensive Financial Expertise", desc: "We provide an all-in-one financial service experience, covering tax planning, business consulting, insurance, and bookkeeping under one roof." },
              { title: "Personalized Financial Services", desc: "We tailor financial strategies to maximize efficiency, profitability, and growth for each individual client — never a cookie-cutter approach." },
              { title: "Trusted Financial Advisors", desc: "We believe in educating our clients, ensuring that they make well-informed financial decisions with confidence and clarity." },
            ].map((p) => (
              <div key={p.title} className="flex gap-4 items-start">
                <div className="w-9 h-9 bg-blue-50 rounded-[10px] shrink-0 flex items-center justify-center text-primary text-lg">✔</div>
                <div>
                  <div className="font-extrabold text-sm mb-1.5">{p.title}</div>
                  <div className="text-[13px] text-muted leading-7">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
