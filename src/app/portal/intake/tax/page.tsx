"use client";

import { useState, useEffect } from "react";
import CrossSellBanner from "@/components/ui/CrossSellBanner";
import { SERVICE_COLORS } from "@/styles/tokens";

export default function TaxWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<any>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const color = SERVICE_COLORS.tax;

  useEffect(() => {
    const saved = localStorage.getItem("dfg-intake-tax-progress");
    if (saved) { try { setData(JSON.parse(saved)); } catch {} }
  }, []);

  function save(d: any) { setData(d); localStorage.setItem("dfg-intake-tax-progress", JSON.stringify(d)); }

  const steps = [
    { label: "Filing Status" },
    { label: "Income Sources" },
    { label: "Deductions" },
    { label: "Documents & Submit" },
  ];

  async function submit() {
    setSubmitting(true);
    const uid = document.cookie.match(/d_user_id=([^;]+)/)?.[1];
    if (!uid) { setSubmitting(false); return; }
    try {
      const res = await fetch("/api/services/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceType: "tax", intakeData: data, action: "submit" }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      await fetch("/api/workflows/tax", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enrollmentId: json.enrollmentId || json.id, userId: uid, clientEmail: "client@example.com", clientName: "Client", filingStatus: data.filingStatus, incomeSources: data.incomeSources || [], deductions: data.deductions || [] }) });
      localStorage.removeItem("dfg-intake-tax-progress");
      setDone(true);
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  }

  if (done) return <SuccessScreen service="Tax Preparation" />;

  return (
    <div className="max-w-2xl mx-auto w-full">
      <StepUI steps={steps} step={step} color={color} title={steps[step].label}
        onBack={() => setStep(s => s - 1)} onSubmit={step === steps.length - 1 ? submit : () => setStep(s => s + 1)}
        canContinue={step === 0 ? !!data.filingStatus : step === 1 ? (data.incomeSources?.length || 0) > 0 : step === 2 ? (data.deductions ? true : false) : true} submitting={submitting} />
      <div className="mt-4">
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["Single","Married Filing Jointly","Head of Household","Business Owner"].map(v => (
                <button key={v} onClick={() => save({ ...data, filingStatus: v })} className={`text-left p-4 rounded-xl border-2 transition-all text-sm font-bold min-h-[52px] ${data.filingStatus === v ? "border-[#0B4DA2] bg-[#EBF2FF] text-[#0B4DA2]" : "border-[#E2E8F0] bg-white hover:bg-slate-50"}`}>{v}</button>
              ))}
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-3">
            {["W-2 (Employee)","1099 / Freelance","Rental Income","Business Income","Investment / Stocks","Cryptocurrency","Retirement / SSA","Other Income"].map(v => (
              <button key={v} onClick={() => save({ ...data, incomeSources: toggle(data.incomeSources, v) })} className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-bold ${(data.incomeSources || []).includes(v) ? "border-[#0B4DA2] bg-[#EBF2FF] text-[#0B4DA2]" : "border-[#E2E8F0] bg-white hover:bg-slate-50"}`}>{v}</button>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            {["Bought or sold a home","Student loan interest","Medical expenses","Business vehicle use","Home office deduction","Charitable donations","Education credits","None of the above"].map(v => (
              <button key={v} onClick={() => save({ ...data, deductions: toggle(data.deductions, v) })} className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-bold ${(data.deductions || []).includes(v) ? "border-[#0B4DA2] bg-[#EBF2FF] text-[#0B4DA2]" : "border-[#E2E8F0] bg-white hover:bg-slate-50"}`}>{v}</button>
            ))}
            <div>
              <label className="text-sm font-bold block mb-2">Dependent count</label>
              <input type="number" min="0" max="20" value={data.dependentCount || ""} onChange={e => save({ ...data, dependentCount: parseInt(e.target.value) || 0 })} className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base" />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-sm font-bold mb-2">Required Documents Checklist</h4>
              <div className="space-y-2 text-sm">
                {getTaxDocs(data).map((doc, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={(data.uploadedDocs || []).includes(doc)} readOnly className="w-4 h-4" />
                    <span>{doc}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              Uploading documents now speeds up your return by 5-7 days.
            </div>
            {submitting && <p className="text-sm text-muted">Submitting...</p>}
          </div>
        )}
      </div>
      <div className="mt-6">
        <CrossSellBanner suggestions={getCrossSell("tax", { hasEntity: false })} onActionClick={(svc) => window.location.href = `/portal/intake?service=${svc}`} />
      </div>
    </div>
  );
}

function toggle(arr: string[] = [], val: string) {
  const a = [...arr];
  const i = a.indexOf(val);
  if (i >= 0) a.splice(i, 1); else a.push(val);
  return a;
}

function getTaxDocs(data: any) {
  const docs = ["Government-issued Photo ID", "Prior year tax return"];
  if ((data.incomeSources || []).includes("W-2 (Employee)")) docs.push("W-2 from all employers");
  if ((data.incomeSources || []).includes("1099 / Freelance")) docs.push("All 1099 forms");
  if ((data.incomeSources || []).includes("Rental Income")) docs.push("Schedule E docs");
  if ((data.incomeSources || []).includes("Stocks / Crypto")) docs.push("1099-B or crypto CSV");
  if ((data.incomeSources || []).includes("Investment / Stocks")) docs.push("1099-B");
  if ((data.deductions || []).includes("Bought or sold a home")) docs.push("Form 1098");
  docs.push("Social Security cards for all dependents");
  return docs;
}

function getCrossSell(service: string, answers: any) {
  const s: any[] = [];
  if (service === "tax") {
    s.push({ icon: "\uD83D\uDCCA", service: "bookkeeping", text: "Monthly bookkeeping catches deductions year-round, not just at tax time." });
    if (!answers.hasEntity) s.push({ icon: "\uD83C\uDFDB", service: "formation", text: "Filing as sole proprietor? An LLC could save thousands in self-employment taxes." });
  }
  return s;
}

function StepUI({ steps, step, color, title, onBack, onSubmit, canContinue, submitting }: any) {
  const pct = ((step + 1) / steps.length) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-muted uppercase">Step {step + 1} of {steps.length}</span>
        <span className="text-xs font-semibold" style={{ color }}>{title}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden mb-6" style={{ background: "#E2E8F0" }}>
        <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex gap-3">
        {step > 0 && <button onClick={onBack} className="px-6 py-3 border border-border rounded-xl text-sm font-bold text-muted hover:bg-soft">Back</button>}
        <button onClick={onSubmit} disabled={!canContinue || submitting} className="flex-1 py-3.5 px-6 rounded-xl text-white text-sm font-bold" style={{ background: canContinue ? color : "#94a3b8", opacity: canContinue ? 1 : 0.5 }}>{submitting ? "Submitting..." : step === steps.length - 1 ? "Submit" : "Continue &rarr;"}</button>
      </div>
    </div>
  );
}

function SuccessScreen({ service }: { service: string }) {
  return (
    <div className="text-center py-12 space-y-4">
      <div className="text-5xl">&#127881;</div>
      <h2 className="text-2xl font-black text-ink">Your {service} is Submitted!</h2>
      <p className="text-sm text-muted">A specialist will reach out within 1 business day.</p>
    </div>
  );
}
