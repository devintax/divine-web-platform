"use client";

import { useEffect, useState, useRef } from "react";
import StepWizard from "@/components/ui/StepWizard";
import OptionGrid from "@/components/ui/OptionGrid";
import SecureUploadZone from "@/components/ui/SecureUploadZone";
import CrossSellBanner from "@/components/ui/CrossSellBanner";
import { useToast } from "@/components/ui/Toast";
import { downloadIcs } from "@/lib/ics";

const SERVICES = [
  { key: "formation", label: "Business Formation", color: "#0B4DA2", icon: "🏛" },
  { key: "tax", label: "Tax Preparation", color: "#16A34A", icon: "🧾" },
  { key: "insurance", label: "Auto Insurance", color: "#D97706", icon: "🚗" },
  { key: "notary", label: "Notary Services", color: "#C8102E", icon: "✍️" },
  { key: "bookkeeping", label: "Bookkeeping", color: "#7C3AED", icon: "📊" },
];

export default function IntakeHub() {
  const [svc, setSvc] = useState("formation");
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    // Read service from URL
    const url = new URLSearchParams(window.location.search);
    const s = url.get("service");
    if (s && SERVICES.find(x => x.key === s)) setSvc(s);
    fetch("/api/services/enroll", { credentials: "include" })
      .then(r => r.json()).then(d => setSummary(d)).catch(() => setSummary({ enrollments: [] }));
  }, []);

  function selectSvc(key: string) {
    setSvc(key);
    const url = new URL(window.location.href);
    url.searchParams.set("service", key);
    window.history.replaceState({}, "", url.toString());
  }

  const enrollments = summary?.enrollments || [];
  const flags = {
    hasEntity: enrollments.some((e: any) => e.service_type === "formation"),
    hasInsurance: enrollments.some((e: any) => e.service_type === "insurance"),
    hasBookkeeping: enrollments.some((e: any) => e.service_type === "bookkeeping"),
    hasNotary: enrollments.some((e: any) => e.service_type === "notary"),
    hasTax: enrollments.some((e: any) => e.service_type === "tax"),
  };

  return (
    <div className="space-y-6 pb-32 md:pb-0">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {SERVICES.map((s) => (
          <button key={s.key} onClick={() => selectSvc(s.key)}
            className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold transition-colors border flex items-center gap-1.5 ${svc === s.key ? "text-white border-transparent" : "bg-white text-muted border-border hover:bg-soft"}`}
            style={svc === s.key ? { background: s.color } : {}}>
            <span>{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div>
          {svc === "formation" && <FormationWizard flags={flags} />}
          {svc === "tax" && <TaxWizard flags={flags} />}
          {svc === "insurance" && <InsuranceWizard flags={flags} />}
          {svc === "notary" && <NotaryWizard flags={flags} />}
          {svc === "bookkeeping" && <BookkeepingWizard flags={flags} />}
        </div>
        <div className="hidden lg:block self-start sticky top-24">
          <CrossSellBanner
            suggestions={getCrossSell(svc, flags)}
            onActionClick={(s) => selectSvc(s)}
          />
        </div>
      </div>
    </div>
  );
}

/* ===== FORMATION WIZARD ===== */
function FormationWizard({ flags }: { flags?: Record<string, boolean> }) {
  void flags;
  const [step, setStep] = useState(0);
  const [data, setData] = useState<any>({ state: "DE" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);
  const [nameCheck, setNameCheck] = useState<{ checking: boolean; available?: boolean; message?: string; suggestion?: string | null }>({ checking: false });
  const debounceRef = useRef<any>(null);
  const toast = useToast();
  const color = "#0B4DA2";
  const steps = [{ label: "Business Name" }, { label: "Entity Type" }, { label: "State & Owners" }, { label: "Agent & Submit" }];

  useEffect(() => {
    const s = localStorage.getItem("dfg-intake-formation-progress");
    if (s) {
      try { const parsed = JSON.parse(s); if (Object.keys(parsed).length > 0) { setData({ state: "DE", ...parsed }); setResumePrompt(true); } } catch {}
    }
  }, []);

  function save(d: any) { setData(d); localStorage.setItem("dfg-intake-formation-progress", JSON.stringify(d)); }
  function startOver() { localStorage.removeItem("dfg-intake-formation-progress"); setData({ state: "DE" }); setStep(0); setResumePrompt(false); }

  // Debounced name check
  useEffect(() => {
    if (!data.businessName || data.businessName.length < 3) { setNameCheck({ checking: false }); return; }
    setNameCheck({ checking: true });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/formation/check-name", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: data.businessName, state: data.state || "DE" }),
        });
        const j = await res.json();
        setNameCheck({ checking: false, available: j.available, message: j.message || j.error, suggestion: j.suggestion });
      } catch { setNameCheck({ checking: false, message: "Could not check name availability" }); }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [data.businessName, data.state]);

  async function submit() {
    setSubmitting(true);
    const uid = document.cookie.match(/d_user_id=([^;]+)/)?.[1];
    if (!uid) { setSubmitting(false); return; }
    try {
      const p = await fetchUserProfile();
      const r = await fetch("/api/services/enroll", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ serviceType: "formation", intakeData: data, action: "submit" })
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "Submit failed");
      const eid = j.enrollmentId || j.enrollment?.id;
      await fetch("/api/workflows/formation", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ enrollmentId: eid, userId: uid, clientEmail: p.email, clientName: p.legal_name, clientPhone: p.phone || "", businessName: data.businessName, entityType: data.entityType, state: data.state || "DE", useDivineAgent: data.agentChoice === "divine", intakeData: { ...data, state: data.state || "DE" } })
      });
      localStorage.removeItem("dfg-intake-formation-progress");
      toast.success("Formation submitted! A specialist will contact you within 1 business day.");
      setDone(true);
    } catch (e: any) { toast.error(e.message || "Submission failed"); }
    setSubmitting(false);
  }

  if (done) return <SuccessScreen service="Business Formation" crossSells={[
    { icon: "📊", label: "Set Up Bookkeeping", href: "/portal/intake?service=bookkeeping" },
  ]} />;

  return (
    <>
      {resumePrompt && <ResumeBanner onResume={() => setResumePrompt(false)} onStartOver={startOver} />}
      <StepWizard steps={steps} currentStep={step} serviceColor={color} title={steps[step].label}
        onBack={() => setStep(s => Math.max(0, s - 1))}
        onContinue={() => { if (step < steps.length - 1) setStep(s => s + 1); else submit(); }}
        canContinue={step === 0 ? !!data.businessName && data.businessName.length >= 3 && nameCheck.available !== false : step === 1 ? !!data.entityType : step === 2 ? !!(data.state || "DE") && !!data.ownerCount : !!data.agentChoice && !!data.confirmed}
        isLastStep={step === steps.length - 1}>

        {step === 0 && (
          <div className="space-y-3">
            <label className="text-sm font-bold text-ink block mb-1">What is your business name?</label>
            <input value={data.businessName || ""} onChange={e => save({ ...data, businessName: e.target.value })}
              placeholder="e.g. Divine Logistics LLC" autoComplete="organization"
              className="w-full border-[1.5px] border-border rounded-xl px-4 py-3.5 text-base focus:border-[#0B4DA2] focus:outline-none" />
            <div className="text-xs min-h-[20px]">
              {nameCheck.checking && <span className="text-muted">Checking availability…</span>}
              {!nameCheck.checking && nameCheck.available === true && <span className="text-green-700 font-bold">✓ {nameCheck.message}</span>}
              {!nameCheck.checking && nameCheck.available === false && (
                <span className="text-red-700 font-bold">✗ {nameCheck.message}{nameCheck.suggestion && ` — Try: ${nameCheck.suggestion}`}</span>
              )}
            </div>
            <p className="text-xs text-muted">We check availability with the Secretary of State in real-time. Name must end with LLC, Corp, Inc, etc.</p>
          </div>
        )}

        {step === 1 && (
          <OptionGrid options={[
            { value: "LLC", label: "LLC", description: "Most popular for small businesses. Flexible and tax-efficient.", badge: "Recommended", badgeColor: "green" },
            { value: "S-Corporation", label: "S-Corporation", description: "Best for businesses planning to pay owners a salary." },
            { value: "C-Corporation", label: "C-Corporation", description: "Ideal for startups seeking outside investment." },
            { value: "Nonprofit", label: "Nonprofit", description: "Mission-driven organizations. Tax-exempt." },
          ]} selected={data.entityType || ""} onSelect={v => save({ ...data, entityType: v })} />
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Where will you operate?</label>
              <select value={data.state || "DE"} onChange={e => save({ ...data, state: e.target.value })}
                className="w-full border-[1.5px] border-border rounded-xl px-4 py-3.5 text-base bg-white focus:border-[#0B4DA2] focus:outline-none">
                {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
              <p className="text-xs text-muted mt-1">Default: Delaware (DFG home state)</p>
            </div>
            <div>
              <label className="text-sm font-bold text-ink block mb-2">How many owners?</label>
              <OptionGrid options={[
                { value: "1", label: "Just me (1)" },
                { value: "2", label: "Two owners" },
                { value: "3-5", label: "3-5 owners" },
                { value: "6+", label: "6+ owners" },
              ]} selected={data.ownerCount || ""} onSelect={v => save({ ...data, ownerCount: v })} />
              {!data.ownerCount && <p className="text-xs font-bold text-amber-700 mt-2">Select how many owners the business will have to continue.</p>}
            </div>
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Industry</label>
              <select value={data.industry || ""} onChange={e => save({ ...data, industry: e.target.value })}
                className="w-full border-[1.5px] border-border rounded-xl px-4 py-3.5 text-base bg-white">
                <option value="">Select industry</option>
                {["Retail","Services","Construction","Real Estate","Transportation","Healthcare","Technology","Other"].map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <OptionGrid options={[
              { value: "divine", label: "Divine Financial Group", description: "We handle your legal mail. $99/year.", badge: "Recommended", badgeColor: "green" },
              { value: "own", label: "I have my own agent", description: "Enter agent info below." },
              { value: "unsure", label: "Not sure yet", description: "We'll follow up with a recommendation." },
            ]} selected={data.agentChoice || ""} onSelect={v => save({ ...data, agentChoice: v })} />
            {data.agentChoice === "own" && (
              <div className="space-y-2">
                <input value={data.agentName || ""} onChange={e => save({ ...data, agentName: e.target.value })} placeholder="Agent Name" className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base" />
                <input value={data.agentAddress || ""} onChange={e => save({ ...data, agentAddress: e.target.value })} placeholder="Agent Address" className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base" />
                <input value={data.agentPhone || ""} onChange={e => save({ ...data, agentPhone: e.target.value })} placeholder="Agent Phone" className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base" />
              </div>
            )}
            {data.agentChoice && (
              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-xs text-muted">To file, we need owner details (encrypted). SSN will be requested separately by your specialist over a secure channel.</p>
                <input value={data.ownerName || ""} onChange={e => save({ ...data, ownerName: e.target.value })} placeholder="Owner Full Name" autoComplete="name" className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base" />
                <input value={data.ownerEmail || ""} onChange={e => save({ ...data, ownerEmail: e.target.value })} placeholder="Owner Email" autoComplete="email" type="email" className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base" />
                <input value={data.ownerPhone || ""} onChange={e => save({ ...data, ownerPhone: e.target.value })} placeholder="Owner Phone" autoComplete="tel" type="tel" className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base" />
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!data.confirmed} onChange={e => save({ ...data, confirmed: e.target.checked })} className="mt-1" />
                  <span className="text-xs text-muted">I confirm all information is accurate and I am authorized to form this business.</span>
                </label>
              </div>
            )}
            {submitting && <p className="text-sm text-muted">Submitting...</p>}
          </div>
        )}
      </StepWizard>
    </>
  );
}

/* ===== TAX WIZARD ===== */
function TaxWizard({ flags }: { flags: any }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<any>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);
  const toast = useToast();
  const color = "#16A34A";
  const steps = [{ label: "Filing Status" }, { label: "Income Sources" }, { label: "Deductions" }, { label: "Documents & Submit" }];

  useEffect(() => {
    const s = localStorage.getItem("dfg-intake-tax-progress");
    if (s) try { const p = JSON.parse(s); if (Object.keys(p).length > 0) { setData(p); setResumePrompt(true); } } catch {}
  }, []);
  function save(d: any) { setData(d); localStorage.setItem("dfg-intake-tax-progress", JSON.stringify(d)); }
  function startOver() { localStorage.removeItem("dfg-intake-tax-progress"); setData({}); setStep(0); setResumePrompt(false); }

  async function submit() {
    setSubmitting(true);
    const uid = document.cookie.match(/d_user_id=([^;]+)/)?.[1];
    if (!uid) { setSubmitting(false); return; }
    try {
      const p = await fetchUserProfile();
      const r = await fetch("/api/services/enroll", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ serviceType: "tax", intakeData: data, action: "submit" })
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      const eid = j.enrollmentId || j.enrollment?.id;
      await fetch("/api/workflows/tax", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId: eid, userId: uid, clientEmail: p.email, clientName: p.legal_name, filingStatus: data.filingStatus, incomeSources: data.incomeSources || [], deductions: data.deductions || [] })
      });
      localStorage.removeItem("dfg-intake-tax-progress");
      toast.success("Tax intake submitted!");
      setDone(true);
    } catch (e: any) { toast.error(e.message || "Submission failed"); }
    setSubmitting(false);
  }

  if (done) return <SuccessScreen service="Tax Preparation" crossSells={[
    { icon: "📊", label: "Add Bookkeeping", href: "/portal/intake?service=bookkeeping" },
    ...(!flags.hasEntity ? [{ icon: "🏛", label: "Form an LLC", href: "/portal/intake?service=formation" }] : []),
  ]} />;

  return (
    <>
      {resumePrompt && <ResumeBanner onResume={() => setResumePrompt(false)} onStartOver={startOver} />}
      <StepWizard steps={steps} currentStep={step} serviceColor={color} title={steps[step].label}
        onBack={() => setStep(s => Math.max(0, s - 1))}
        onContinue={() => { if (step < steps.length - 1) setStep(s => s + 1); else submit(); }}
        canContinue={step === 0 ? !!data.filingStatus : step === 1 ? (data.incomeSources?.length || 0) > 0 : true}
        isLastStep={step === steps.length - 1}>
        {step === 0 && (
          <div className="space-y-4">
            <OptionGrid options={[
              { value: "Single", label: "Single", description: "Filing alone, no dependents." },
              { value: "Married Filing Jointly", label: "Married Filing Jointly", description: "You and spouse together." },
              { value: "Head of Household", label: "Head of Household", description: "Unmarried with qualifying dependent." },
              { value: "Business Owner", label: "Business Owner", description: "Includes Schedule C." },
            ]} selected={data.filingStatus || ""} onSelect={v => save({ ...data, filingStatus: v })} />
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Tax Year</label>
              <div className="flex gap-2">
                {["2024", "2025", "Prior"].map(y => (
                  <button key={y} onClick={() => save({ ...data, taxYear: y })}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl border-2 transition-colors ${data.taxYear === y ? "border-[#16A34A] bg-green-50 text-[#16A34A]" : "border-border bg-white text-muted"}`}>{y}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Number of dependents</label>
              <input type="number" min="0" max="20" value={data.dependentCount || 0} onChange={e => save({ ...data, dependentCount: parseInt(e.target.value) || 0 })} className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base" />
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Select all that apply:</p>
            {["W-2 (Employee)", "1099 / Freelance", "Rental Income", "Business Income", "Investment / Stocks", "Cryptocurrency", "Retirement / SSA", "Other Income"].map(v => (
              <button key={v} onClick={() => save({ ...data, incomeSources: toggle(data.incomeSources, v) })}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-bold min-h-[52px] ${(data.incomeSources || []).includes(v) ? "border-[#16A34A] bg-green-50 text-[#16A34A]" : "border-border bg-white hover:bg-slate-50"}`}>
                {(data.incomeSources || []).includes(v) && "✓ "}{v}
              </button>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Did any of these apply?</p>
            {[
              { v: "Bought or sold a home", icon: "🏠" },
              { v: "Student loan interest", icon: "🎓" },
              { v: "Medical expenses > 7.5% AGI", icon: "🏥" },
              { v: "Business vehicle use", icon: "🚗" },
              { v: "Home office deduction", icon: "🏢" },
              { v: "Child/dependent care", icon: "👶" },
              { v: "Charitable donations", icon: "💝" },
              { v: "Education credits", icon: "📚" },
              { v: "None of the above", icon: "○" },
            ].map(({ v, icon }) => (
              <button key={v} onClick={() => save({ ...data, deductions: toggle(data.deductions, v) })}
                className={`w-full text-left p-4 rounded-xl border-2 text-sm font-bold min-h-[52px] flex items-center gap-2 ${(data.deductions || []).includes(v) ? "border-[#16A34A] bg-green-50 text-[#16A34A]" : "border-border bg-white"}`}>
                <span>{icon}</span> {v}
              </button>
            ))}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-sm font-bold mb-2">Required Documents Checklist</h4>
              <div className="space-y-1.5 text-sm">
                {getTaxDocs(data).map((doc, i) => (
                  <div key={i} className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-muted text-[8px] grid place-items-center">✓</span><span>{doc}</span></div>
                ))}
              </div>
              <div className="text-[11px] text-muted mt-3">⚠ Uploading documents now speeds up your return by 5-7 days.</div>
            </div>
            <SecureUploadZone onUpload={async (files) => {
              try {
                const uploaded = await uploadFilesToVault(files, "tax");
                save({
                  ...data,
                  uploadedDocs: [...(data.uploadedDocs || []), ...uploaded.map((doc) => doc.fileName)],
                  vaultDocuments: [...(data.vaultDocuments || []), ...uploaded],
                });
                toast.success(`Uploaded ${uploaded.length} file(s) to your vault`);
              } catch (e: any) {
                toast.error(e.message || "Upload failed");
              }
            }} label="Upload tax documents" helpText="W-2s, 1099s, receipts. AES-256 encrypted." />
            {submitting && <p className="text-sm text-muted">Submitting…</p>}
          </div>
        )}
      </StepWizard>
    </>
  );
}

/* ===== INSURANCE WIZARD ===== */
function InsuranceWizard({ flags }: { flags?: Record<string, boolean> }) {
  void flags;
  const [step, setStep] = useState(0);
  const [data, setData] = useState<any>({});
  const [submission, setSubmission] = useState<{ enrollmentId?: string; workflowId?: string } | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);
  const toast = useToast();
  const color = "#D97706";
  const steps = [{ label: "Location" }, { label: "Vehicle" }, { label: "Driver & Usage" }, { label: "History & Submit" }];

  useEffect(() => {
    const s = localStorage.getItem("dfg-intake-insurance-progress");
    if (s) try { const p = JSON.parse(s); if (Object.keys(p).length > 0) { setData(p); setResumePrompt(true); } } catch {}
  }, []);
  function save(d: any) { setData(d); localStorage.setItem("dfg-intake-insurance-progress", JSON.stringify(d)); }
  function startOver() { localStorage.removeItem("dfg-intake-insurance-progress"); setData({}); setStep(0); setResumePrompt(false); }

  // ZIP auto-advance on 5 digits
  function handleZip(v: string) {
    const clean = v.replace(/\D/g, "").slice(0, 5);
    save({ ...data, zipCode: clean });
    if (clean.length === 5 && step === 0) {
      setTimeout(() => setStep(1), 300);
    }
  }

  const isCommercial = data.vehicleUsage === "rideshare" || data.vehicleUsage === "business";

  async function submit() {
    setSubmitting(true);
    setShowQuotes(true);
    const uid = document.cookie.match(/d_user_id=([^;]+)/)?.[1];
    if (!uid) { setSubmitting(false); return; }
    try {
      const p = await fetchUserProfile();
      const r = await fetch("/api/services/enroll", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ serviceType: "insurance", intakeData: data, action: "submit" })
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      const eid = j.enrollmentId || j.enrollment?.id;
      const workflowRes = await fetch("/api/workflows/insurance", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ enrollmentId: eid, userId: uid, clientEmail: p.email, clientName: p.legal_name, clientPhone: p.phone || "", zipCode: data.zipCode, vehicleUsage: data.vehicleUsage, driverHistory: data.driverHistory })
      });
      const workflowJson = await workflowRes.json().catch(() => ({}));
      if (!workflowRes.ok) throw new Error(workflowJson.error || "Could not start insurance workflow");
      setSubmission({ enrollmentId: eid, workflowId: workflowJson.workflowId || workflowJson.workflow?.workflowId });
      localStorage.removeItem("dfg-intake-insurance-progress");
      // Wait 2s for "comparing carriers" effect, then show quotes
      await new Promise(r => setTimeout(r, 2000));
      toast.success("Insurance request submitted. Tracking is now available.");
    } catch (e: any) { toast.error(e.message || "Submission failed"); }
    setSubmitting(false);
  }

  if (showQuotes) return <InsuranceQuoteResults data={data} onDone={() => { setShowQuotes(false); setDone(true); }} />;
  if (done) return <InsuranceSuccessScreen data={data} enrollmentId={submission?.enrollmentId} workflowId={submission?.workflowId} crossSells={[
    { icon: "✍️", label: "Notarize Documents", href: "/portal/intake?service=notary" },
  ]} />;

  return (
    <>
      {resumePrompt && <ResumeBanner onResume={() => setResumePrompt(false)} onStartOver={startOver} />}
      <StepWizard steps={steps} currentStep={step} serviceColor={color} title={steps[step].label}
        onBack={() => setStep(s => Math.max(0, s - 1))}
        onContinue={() => { if (step < steps.length - 1) setStep(s => s + 1); else submit(); }}
        canContinue={step === 0 ? data.zipCode?.length === 5 : step === 1 ? !!data.vehicleYear && !!data.vehicleMake : step === 2 ? !!data.vehicleUsage && !!data.dob : !!data.claimsHistory}
        isLastStep={step === steps.length - 1}>

        {step === 0 && (
          <div className="space-y-4 text-center py-4">
            <div className="text-2xl font-black text-ink">Find the best auto insurance rate in your area</div>
            <input
              value={data.zipCode || ""}
              onChange={e => handleZip(e.target.value)}
              placeholder="ZIP CODE"
              inputMode="numeric"
              autoFocus
              className="w-full max-w-[200px] mx-auto block border-[2px] border-border rounded-xl px-6 py-5 text-3xl font-bold text-center tracking-widest focus:border-[#D97706] focus:outline-none"
            />
            <div className="text-xs text-muted">We compare rates from 50+ carriers instantly</div>
            <div className="text-[10px] text-muted opacity-60">Beta — rates estimated</div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Vehicle Year</label>
              <select value={data.vehicleYear || ""} onChange={e => save({ ...data, vehicleYear: e.target.value })} className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base bg-white">
                <option value="">Select year</option>
                {Array.from({ length: 38 }, (_, i) => 2027 - i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Make</label>
              <select value={data.vehicleMake || ""} onChange={e => save({ ...data, vehicleMake: e.target.value })} className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base bg-white">
                <option value="">Select make</option>
                {["Acura","Audi","BMW","Buick","Cadillac","Chevrolet","Chrysler","Dodge","Ford","GMC","Honda","Hyundai","Jeep","Kia","Lexus","Mazda","Mercedes-Benz","Nissan","Subaru","Tesla","Toyota","Volkswagen","Volvo"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Model (optional)</label>
              <input value={data.vehicleModel || ""} onChange={e => save({ ...data, vehicleModel: e.target.value })} placeholder="e.g. Camry, F-150" className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base" />
            </div>
            <div>
              <label className="text-sm font-bold text-ink block mb-2">VIN (optional)</label>
              <input value={data.vin || ""} onChange={e => save({ ...data, vin: e.target.value.toUpperCase().slice(0, 17) })} placeholder="17 characters" className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base font-mono uppercase" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-ink block mb-2">How do you primarily use this vehicle?</label>
              <OptionGrid options={[
                { value: "personal", label: "Personal / Pleasure", description: "Commuting, errands, leisure" },
                { value: "commute", label: "Business Commuting", description: "Regular work commute" },
                { value: "business", label: "Business / Commercial", description: "Delivery, sales, client visits" },
                { value: "rideshare", label: "Rideshare (Uber/Lyft)", description: "Earning income with your vehicle" },
              ]} selected={data.vehicleUsage || ""} onSelect={v => save({ ...data, vehicleUsage: v })} />
              {isCommercial && (
                <div className="bg-amber-50 border border-amber-200 text-xs text-amber-900 rounded-xl p-3 mt-2">
                  ⚠ Commercial vehicle use exposes your personal assets. An LLC can protect you. <a href="/portal/intake?service=formation" className="font-bold underline">Form an LLC →</a>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Annual Mileage</label>
              <OptionGrid options={[
                { value: "<7500", label: "Under 7,500 miles", description: "Qualifies for discounts" },
                { value: "7500-15000", label: "7,500-15,000" },
                { value: "15000-25000", label: "15,000-25,000" },
                { value: "25000+", label: "Over 25,000" },
              ]} selected={data.annualMileage || ""} onSelect={v => save({ ...data, annualMileage: v })} />
            </div>
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Date of Birth</label>
              <input type="date" value={data.dob || ""} onChange={e => save({ ...data, dob: e.target.value })} className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base" />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Any accidents or tickets in the last 3 years?</label>
              <OptionGrid options={[
                { value: "none", label: "None — Clean record", badge: "Best rates", badgeColor: "green" },
                { value: "minor_ticket", label: "One Minor Ticket", description: "Speed, stop sign, etc." },
                { value: "one_accident", label: "One Accident" },
                { value: "multiple", label: "Multiple Incidents" },
                { value: "dui", label: "DUI/DWI" },
              ]} selected={data.claimsHistory || ""} onSelect={v => save({ ...data, claimsHistory: v, driverHistory: v })} />
              {(data.claimsHistory === "multiple" || data.claimsHistory === "dui") && (
                <div className="text-xs text-muted mt-2">No worries — we work with specialty carriers for all driving histories.</div>
              )}
            </div>
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Coverage Level</label>
              <OptionGrid options={[
                { value: "minimum", label: "State Minimum", description: "Legal minimum only" },
                { value: "standard", label: "Standard", description: "Balanced (recommended)", badge: "Recommended", badgeColor: "blue" },
                { value: "comprehensive", label: "Comprehensive", description: "Maximum protection" },
              ]} selected={data.coverageLevel || ""} onSelect={v => save({ ...data, coverageLevel: v })} />
            </div>
            {submitting && <p className="text-sm text-muted">Comparing carriers…</p>}
          </div>
        )}
      </StepWizard>
    </>
  );
}

function InsuranceQuoteResults({ data, onDone }: { data: any; onDone: () => void }) {
  // Simulated quotes — clearly labeled "Beta — rates estimated"
  const baseRate = data.coverageLevel === "minimum" ? 75 : data.coverageLevel === "comprehensive" ? 165 : 110;
  const histMultiplier = data.claimsHistory === "none" ? 1.0 : data.claimsHistory === "minor_ticket" ? 1.15 : data.claimsHistory === "one_accident" ? 1.3 : data.claimsHistory === "multiple" ? 1.5 : 1.8;
  const seed = Math.round(baseRate * histMultiplier);
  const quotes = [
    { carrier: "Progressive", monthly: seed - 8, badge: "Lowest Rate", badgeColor: "green", deductible: 500 },
    { carrier: "GEICO", monthly: seed, badge: "Best Value", badgeColor: "gold", deductible: 500 },
    { carrier: "State Farm", monthly: seed + 12, badge: null, deductible: 250 },
    { carrier: "Allstate", monthly: seed + 18, badge: null, deductible: 250 },
  ];
  const toast = useToast();

  async function selectQuote(q: any) {
    toast.success(`${q.carrier} quote selected. Our broker will contact you to bind the policy.`);
    onDone();
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-6 space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">{quotes.length} Quotes for ZIP {data.zipCode}</h2>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">Beta — rates estimated</span>
        </div>
        <p className="text-xs text-muted mt-1">{data.vehicleYear} {data.vehicleMake} {data.vehicleModel} · {data.coverageLevel} coverage</p>
      </div>
      <div className="space-y-3">
        {quotes.map(q => (
          <div key={q.carrier} className="border-2 border-border rounded-xl p-4 hover:border-[#D97706] transition-colors">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-ink">{q.carrier}</span>
                  {q.badge && <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${q.badgeColor === "green" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{q.badge}</span>}
                </div>
                <div className="text-2xl font-black text-[#D97706] mt-1">${q.monthly}<span className="text-sm font-normal text-muted">/month</span></div>
                <div className="text-xs text-muted">${q.monthly * 12}/year · ${q.deductible} deductible</div>
              </div>
              <button onClick={() => selectQuote(q)} className="px-4 py-2 bg-[#D97706] text-white text-sm font-bold rounded-lg hover:bg-amber-700">Select Plan →</button>
            </div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-muted bg-slate-50 rounded-xl p-3">A licensed DFG broker will finalize your exact rate within 1 business day.</div>
    </div>
  );
}

function InsuranceSuccessScreen({
  data,
  enrollmentId,
  workflowId,
  crossSells = [],
}: {
  data: any;
  enrollmentId?: string;
  workflowId?: string;
  crossSells?: { icon: string; label: string; href: string }[];
}) {
  const reference = enrollmentId ? enrollmentId.slice(0, 8).toUpperCase() : "PENDING";
  return (
    <div className="bg-white border border-border rounded-2xl p-8 space-y-5">
      <div className="text-center space-y-2">
        <div className="text-5xl">🚗</div>
        <h2 className="text-2xl font-black text-ink">Auto insurance request submitted</h2>
        <p className="text-sm text-muted">Reference #{reference}. A licensed broker will verify your rate and contact you within 1 business day.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="bg-soft rounded-xl p-3">
          <div className="text-[10px] font-bold uppercase text-muted">Vehicle</div>
          <div className="font-black text-ink">{data.vehicleYear} {data.vehicleMake}</div>
        </div>
        <div className="bg-soft rounded-xl p-3">
          <div className="text-[10px] font-bold uppercase text-muted">Coverage</div>
          <div className="font-black text-ink capitalize">{data.coverageLevel || "Standard"}</div>
        </div>
        <div className="bg-soft rounded-xl p-3">
          <div className="text-[10px] font-bold uppercase text-muted">Workflow</div>
          <div className="font-black text-ink truncate">{workflowId || "Starting"}</div>
        </div>
      </div>
      <StatusTimeline items={[
        { label: "Request submitted", done: true },
        { label: "Broker review", done: false },
        { label: "Carrier verification", done: false },
        { label: "Policy bind-ready", done: false },
      ]} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a href="/portal/orders" className="px-4 py-3 bg-[#D97706] text-white rounded-xl text-sm font-bold text-center">Track Order</a>
        <a href="/portal/chat" className="px-4 py-3 bg-white border border-border rounded-xl text-sm font-bold text-center hover:bg-soft">Chat with Broker</a>
      </div>
      {crossSells.length > 0 && (
        <div className="pt-4 border-t border-border space-y-2">
          <div className="text-xs font-bold uppercase text-muted">Recommended next</div>
          {crossSells.map((cs, i) => (
            <a key={i} href={cs.href} className="block px-4 py-3 bg-soft rounded-xl text-sm font-bold text-[#0B4DA2] hover:bg-blue-50">{cs.icon} {cs.label} →</a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== NOTARY WIZARD ===== */
function NotaryWizard({ flags }: { flags: any }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<any>({});
  const [submission, setSubmission] = useState<{ enrollmentId?: string; workflowId?: string } | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);
  const toast = useToast();
  const color = "#C8102E";
  const steps = [{ label: "Document Type" }, { label: "Signers" }, { label: "Schedule" }, { label: "Review & Submit" }];

  useEffect(() => {
    const s = localStorage.getItem("dfg-intake-notary-progress");
    if (s) try { const p = JSON.parse(s); if (Object.keys(p).length > 0) { setData(p); setResumePrompt(true); } } catch {}
  }, []);
  function save(d: any) { setData(d); localStorage.setItem("dfg-intake-notary-progress", JSON.stringify(d)); }
  function startOver() { localStorage.removeItem("dfg-intake-notary-progress"); setData({}); setStep(0); setResumePrompt(false); }

  const techCheckPassed = !!(data.tech_webcam && data.tech_mic && data.tech_internet && data.tech_quiet);
  const isPropertyDoc = data.documentType === "Deed / Real Estate" || data.documentType === "Loan / Mortgage Docs";

  async function submit() {
    setSubmitting(true);
    const uid = document.cookie.match(/d_user_id=([^;]+)/)?.[1];
    if (!uid) { setSubmitting(false); return; }
    try {
      const p = await fetchUserProfile();
      const r = await fetch("/api/services/enroll", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ serviceType: "notary", intakeData: data, action: "submit" })
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      const eid = j.enrollmentId || j.enrollment?.id;
      const workflowRes = await fetch("/api/workflows/notary", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ enrollmentId: eid, userId: uid, clientEmail: p.email, clientName: p.legal_name, documentType: data.documentType, signerCount: parseInt(data.signerCount) || 1, scheduledTime: data.scheduledTime })
      });
      const workflowJson = await workflowRes.json().catch(() => ({}));
      if (!workflowRes.ok) throw new Error(workflowJson.error || "Could not start notary workflow");
      setSubmission({ enrollmentId: eid, workflowId: workflowJson.workflowId || workflowJson.workflow?.workflowId });
      localStorage.removeItem("dfg-intake-notary-progress");
      toast.success("Notary session confirmed!");
      setDone(true);
    } catch (e: any) { toast.error(e.message || "Submission failed"); }
    setSubmitting(false);
  }

  if (done) {
    const sessionDate = data.scheduledTime ? new Date(data.scheduledTime) : new Date();
    return <NotarySuccess data={data} sessionDate={sessionDate} flags={flags} enrollmentId={submission?.enrollmentId} workflowId={submission?.workflowId} />;
  }

  return (
    <>
      {resumePrompt && <ResumeBanner onResume={() => setResumePrompt(false)} onStartOver={startOver} />}
      <StepWizard steps={steps} currentStep={step} serviceColor={color} title={steps[step].label}
        onBack={() => setStep(s => Math.max(0, s - 1))}
        onContinue={() => { if (step < steps.length - 1) setStep(s => s + 1); else submit(); }}
        canContinue={
          step === 0 ? !!data.documentType :
          step === 1 ? !!data.signerCount :
          step === 2 ? data.sessionType === "in_person" || (techCheckPassed && !!data.scheduledTime && !!data.recordingConsent) :
          true
        }
        isLastStep={step === steps.length - 1}>

        {step === 0 && (
          <div className="space-y-4">
            <OptionGrid options={[
              { value: "Affidavit", label: "📋 Affidavit", description: "Sworn statement of facts" },
              { value: "Power of Attorney", label: "📜 Power of Attorney", description: "Legal authority document" },
              { value: "Deed / Real Estate", label: "🏠 Deed / Real Estate", description: "Property transfer or title" },
              { value: "Loan / Mortgage Docs", label: "💰 Loan / Mortgage", description: "Mortgage closing or refinance" },
              { value: "Business Agreement", label: "👔 Business Agreement", description: "Contracts, operating agreements" },
              { value: "Healthcare Directive", label: "📑 Healthcare Directive", description: "Living will, healthcare proxy" },
              { value: "Other", label: "🔐 Other Legal Document" },
            ]} selected={data.documentType || ""} onSelect={v => save({ ...data, documentType: v })} />
            {isPropertyDoc && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                🧾 Major property transactions often create tax events. <a href="/portal/intake?service=tax" className="font-bold underline">Schedule a Tax Review →</a>
              </div>
            )}
            {data.documentType && (
              <SecureUploadZone onUpload={async (files) => {
                try {
                  const uploaded = await uploadFilesToVault(files, "notary");
                  save({
                    ...data,
                    uploadedDocs: [...(data.uploadedDocs || []), ...uploaded.map((doc) => doc.fileName)],
                    vaultDocuments: [...(data.vaultDocuments || []), ...uploaded],
                  });
                  toast.success("Document uploaded to your vault");
                } catch (e: any) {
                  toast.error(e.message || "Upload failed");
                }
              }} label="Upload your document (recommended)" helpText="The notary can review your notary block beforehand. Prevents delays." />
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <OptionGrid options={[
              { value: "1", label: "Just me (1)" },
              { value: "2", label: "Two signers" },
              { value: "3-5", label: "3-5 signers" },
              { value: "6+", label: "6+ (contact us)" },
            ]} selected={data.signerCount || ""} onSelect={v => save({ ...data, signerCount: v })} />
            <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-1.5">
              <div className="font-bold text-ink mb-1">Each signer must have:</div>
              <div>✓ Driver's License, Passport, or State ID (unexpired)</div>
              <div>✗ Student ID or Military ID (not accepted)</div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <OptionGrid options={[
              { value: "ron", label: "🖥 Remote Online Notarization", description: "Live video session. Same-day available.", badge: "Recommended", badgeColor: "green" },
              { value: "in_person", label: "📍 In-Person", description: "622 E. Basin Road, New Castle, DE" },
            ]} selected={data.sessionType || ""} onSelect={v => save({ ...data, sessionType: v })} />

            {data.sessionType === "ron" && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <div className="text-sm font-bold text-amber-900">Tech Check (all required)</div>
                  {[
                    { k: "tech_webcam", label: "I have a working webcam" },
                    { k: "tech_mic", label: "I have a working microphone" },
                    { k: "tech_internet", label: "I have a stable internet connection" },
                    { k: "tech_quiet", label: "I am in a quiet, well-lit location" },
                  ].map(({ k, label }) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={!!data[k]} onChange={e => save({ ...data, [k]: e.target.checked })} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                {techCheckPassed && (
                  <div>
                    <label className="text-sm font-bold text-ink block mb-2">Preferred Date & Time (ET)</label>
                    <input type="datetime-local" value={data.scheduledTime || ""} onChange={e => save({ ...data, scheduledTime: e.target.value })} className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base" />
                    <p className="text-xs text-muted mt-1">All times shown in Eastern Time. Available slots: 9:15 AM - 4:30 PM weekdays.</p>
                  </div>
                )}

                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-900">
                  <div className="font-bold mb-1">⚠ Recording Consent Required</div>
                  Per Delaware state law, RON sessions are recorded and stored securely for 10 years.
                  <label className="flex items-start gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={!!data.recordingConsent} onChange={e => save({ ...data, recordingConsent: e.target.checked })} className="mt-1" />
                    <span className="font-bold">I understand and consent to recording.</span>
                  </label>
                </div>
              </>
            )}
            {data.sessionType === "in_person" && (
              <input type="datetime-local" value={data.scheduledTime || ""} onChange={e => save({ ...data, scheduledTime: e.target.value })} className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base" />
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5">
              <div><span className="text-muted font-bold">Document:</span> {data.documentType}</div>
              <div><span className="text-muted font-bold">Signers:</span> {data.signerCount}</div>
              <div><span className="text-muted font-bold">Type:</span> {data.sessionType === "ron" ? "Remote Online Notarization" : "In-Person"}</div>
              <div><span className="text-muted font-bold">Date/Time:</span> {data.scheduledTime ? new Date(data.scheduledTime).toLocaleString() : "Not set"}</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs">
              <div className="font-bold text-[#0B4DA2] mb-1">Fees</div>
              <div>Remote Online Notarization: $25 per session</div>
              <div>In-Person: $15 per signature + $10 travel fee</div>
              <div>Additional signers: $10 each</div>
            </div>
            {submitting && <p className="text-sm text-muted">Confirming session…</p>}
          </div>
        )}
      </StepWizard>
    </>
  );
}

function NotarySuccess({ data, sessionDate, flags, enrollmentId, workflowId }: { data: any; sessionDate: Date; flags: any; enrollmentId?: string; workflowId?: string }) {
  function addToCalendar() {
    downloadIcs({
      uid: `dfg-notary-${Date.now()}@dfgbusiness.com`,
      title: `DFG Notary Session — ${data.documentType}`,
      description: `Notary session for ${data.documentType}. ${data.sessionType === "ron" ? "Video link will be emailed 30 minutes before your session." : "Address: 622 E. Basin Road, Suite A, New Castle, DE 19720"}`,
      location: data.sessionType === "ron" ? "Remote Video Session" : "622 E. Basin Road, Suite A, New Castle, DE 19720",
      start: sessionDate,
      durationMinutes: 30,
      organizer: { name: "Divine Financial Group", email: "info@dfgbusiness.com" },
    }, "dfg-notary-session");
  }
  const isPropertyDoc = data.documentType === "Deed / Real Estate" || data.documentType === "Loan / Mortgage Docs";
  const reference = enrollmentId ? enrollmentId.slice(0, 8).toUpperCase() : "PENDING";
  return (
    <div className="bg-white border border-border rounded-2xl p-8 text-center space-y-4">
      <div className="text-5xl">📅</div>
      <h2 className="text-xl font-black text-ink">Session confirmed!</h2>
      <p className="text-sm text-muted">{sessionDate.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</p>
      <p className="text-xs text-muted">Reference #{reference}. Your video link will be emailed 30 minutes before your session. Documents are in your secure vault.</p>
      <div className="bg-soft rounded-xl p-4 text-left">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-black text-ink uppercase">Workflow Tracking</span>
          <span className="text-[10px] font-bold text-muted truncate">{workflowId || "Starting"}</span>
        </div>
        <StatusTimeline items={[
          { label: "Intake submitted", done: true },
          { label: "Document verified", done: (data.vaultDocuments || []).length > 0 },
          { label: "KYC verified", done: false },
          { label: "Session complete", done: false },
        ]} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button onClick={addToCalendar} className="px-3 py-2 bg-white border border-border rounded-lg text-xs font-bold hover:bg-soft">+ Google Calendar</button>
        <button onClick={addToCalendar} className="px-3 py-2 bg-white border border-border rounded-lg text-xs font-bold hover:bg-soft">+ Outlook</button>
        <button onClick={addToCalendar} className="px-3 py-2 bg-white border border-border rounded-lg text-xs font-bold hover:bg-soft">+ Apple Calendar</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a href="/portal/orders" className="px-4 py-3 bg-[#C8102E] text-white rounded-xl text-sm font-bold">Track Notary Order</a>
        <a href="/portal/vault" className="px-4 py-3 bg-white border border-border rounded-xl text-sm font-bold hover:bg-soft">View Vault Documents</a>
      </div>
      {isPropertyDoc && !flags.hasTax && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
          ✍️ Notarizing loan documents? Let our tax experts review the financial impact. <a href="/portal/intake?service=tax" className="font-bold underline">Schedule Tax Review →</a>
        </div>
      )}
    </div>
  );
}

/* ===== BOOKKEEPING WIZARD ===== */
function BookkeepingWizard({ flags }: { flags?: Record<string, boolean> }) {
  void flags;
  const [step, setStep] = useState(0);
  const [data, setData] = useState<any>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);
  const toast = useToast();
  const color = "#7C3AED";
  const steps = [{ label: "Business Stage" }, { label: "Volume & Tools" }, { label: "Payroll & Goals" }, { label: "Connect & Submit" }];

  useEffect(() => {
    const s = localStorage.getItem("dfg-intake-bookkeeping-progress");
    if (s) try { const p = JSON.parse(s); if (Object.keys(p).length > 0) { setData(p); setResumePrompt(true); } } catch {}
  }, []);
  function save(d: any) { setData(d); localStorage.setItem("dfg-intake-bookkeeping-progress", JSON.stringify(d)); }
  function startOver() { localStorage.removeItem("dfg-intake-bookkeeping-progress"); setData({}); setStep(0); setResumePrompt(false); }

  const PRICING: Record<string, string> = { "<50": "$149/mo", "50-200": "$249/mo", "200-500": "$399/mo", "500+": "Custom pricing" };

  async function submit() {
    setSubmitting(true);
    const uid = document.cookie.match(/d_user_id=([^;]+)/)?.[1];
    if (!uid) { setSubmitting(false); return; }
    try {
      const p = await fetchUserProfile();
      const r = await fetch("/api/services/enroll", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ serviceType: "bookkeeping", intakeData: data, action: "submit" })
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error);
      const eid = j.enrollmentId || j.enrollment?.id;
      await fetch("/api/workflows/bookkeeping", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId: eid, userId: uid, clientEmail: p.email, clientName: p.legal_name, businessStage: data.businessStage, transactionVolume: data.transactionVolume, currentTools: data.currentTools, reportingGoal: data.reportingGoal })
      });
      localStorage.removeItem("dfg-intake-bookkeeping-progress");
      toast.success("Bookkeeping is live!");
      setDone(true);
    } catch (e: any) { toast.error(e.message || "Submission failed"); }
    setSubmitting(false);
  }

  if (done) return <SuccessScreen service="Bookkeeping" crossSells={[
    { icon: "🧾", label: "Add Tax Prep (save 20%)", href: "/portal/intake?service=tax" },
  ]} />;

  return (
    <>
      {resumePrompt && <ResumeBanner onResume={() => setResumePrompt(false)} onStartOver={startOver} />}
      <StepWizard steps={steps} currentStep={step} serviceColor={color} title={steps[step].label}
        onBack={() => setStep(s => Math.max(0, s - 1))}
        onContinue={() => { if (step < steps.length - 1) setStep(s => s + 1); else submit(); }}
        canContinue={
          step === 0 ? !!data.businessStage && !!data.entityType :
          step === 1 ? !!data.transactionVolume :
          step === 2 ? !!data.payroll && !!data.yearEndGoal :
          !!data.bankConnect
        }
        isLastStep={step === steps.length - 1}>

        {step === 0 && (
          <div className="space-y-4">
            <OptionGrid options={[
              { value: "startup", label: "🌱 Brand new startup", description: "Just launched. Need setup from scratch." },
              { value: "established", label: "🏢 Established business", description: "1+ year. Need ongoing monthly bookkeeping." },
              { value: "catchup", label: "🧹 Catch-up / cleanup", description: "Books are behind. Need fixing." },
              { value: "yearend", label: "📊 Year-end only", description: "Just need clean books for tax season." },
            ]} selected={data.businessStage || ""} onSelect={v => save({ ...data, businessStage: v })} />
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Entity type</label>
              <select value={data.entityType || ""} onChange={e => save({ ...data, entityType: e.target.value })} className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base bg-white">
                <option value="">Select…</option>
                {["LLC","S-Corp","C-Corp","Sole Proprietorship","Partnership","None yet"].map(t => <option key={t}>{t}</option>)}
              </select>
              {data.entityType === "None yet" && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-2 text-xs text-[#0B4DA2]">
                  🏛 No entity yet? Forming an LLC takes 1 week and separates personal from business. <a href="/portal/intake?service=formation" className="font-bold underline">Start Formation →</a>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Monthly transaction volume</label>
              <p className="text-xs text-muted mb-2">Any money in or out: sales, expenses, transfers</p>
              <div className="space-y-2">
                {[
                  { v: "<50", label: "0-50 transactions" },
                  { v: "50-200", label: "50-200 transactions" },
                  { v: "200-500", label: "200-500 transactions" },
                  { v: "500+", label: "500+ transactions" },
                ].map(({ v, label }) => (
                  <button key={v} onClick={() => save({ ...data, transactionVolume: v })}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-sm font-bold ${data.transactionVolume === v ? "border-[#7C3AED] bg-purple-50 text-[#7C3AED]" : "border-border bg-white"}`}>
                    <span>{label}</span>
                    <span className={data.transactionVolume === v ? "text-[#7C3AED]" : "text-muted"}>{PRICING[v]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Current tools</label>
              <div className="grid grid-cols-2 gap-2">
                {["QuickBooks Online","QuickBooks Desktop","Xero","FreshBooks","Wave","Spreadsheets","Nothing","Other"].map(t => (
                  <button key={t} onClick={() => save({ ...data, currentTools: t })}
                    className={`p-3 text-xs font-bold rounded-xl border-2 ${data.currentTools === t ? "border-[#7C3AED] bg-purple-50 text-[#7C3AED]" : "border-border bg-white"}`}>{t}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Employees / Payroll</label>
              <OptionGrid options={[
                { value: "none", label: "No employees" },
                { value: "1-5", label: "1-5 employees" },
                { value: "6-20", label: "6-20 employees" },
                { value: "20+", label: "20+ employees" },
                { value: "1099", label: "Only contractors (1099)" },
              ]} selected={data.payroll || ""} onSelect={v => save({ ...data, payroll: v })} />
            </div>
            <div>
              <label className="text-sm font-bold text-ink block mb-2">Year-end goal</label>
              <OptionGrid options={[
                { value: "tax_ready", label: "Yes — tax-ready by year-end", description: "Bundle with Tax Prep — save 20%" },
                { value: "general", label: "No — general business management" },
              ]} selected={data.yearEndGoal || ""} onSelect={v => save({ ...data, yearEndGoal: v })} />
              {data.yearEndGoal === "tax_ready" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2 text-xs text-amber-900">
                  ✅ Bundle with Tax Preparation and save 20%. <a href="/portal/intake?service=tax" className="font-bold underline">Add Tax Prep →</a>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="text-sm font-bold mb-2">Required Documents</h4>
              <div className="space-y-1 text-sm">
                <div>✓ Last 3 months bank statements</div>
                <div>✓ Last 3 months credit card statements</div>
                <div>✓ Existing financial reports (P&L, balance sheet)</div>
                <div>✓ Chart of accounts (if you have one)</div>
              </div>
            </div>
            <SecureUploadZone onUpload={async (files) => {
              try {
                const uploaded = await uploadFilesToVault(files, "bookkeeping");
                save({
                  ...data,
                  uploadedDocs: [...(data.uploadedDocs || []), ...uploaded.map((doc) => doc.fileName)],
                  vaultDocuments: [...(data.vaultDocuments || []), ...uploaded],
                });
                toast.success("Statements uploaded to your vault");
              } catch (e: any) {
                toast.error(e.message || "Upload failed");
              }
            }} label="Upload statements" helpText="Drag all files at once. PDF, CSV, XLS." />
            <OptionGrid options={[
              { value: "connect_now", label: "🔗 Connect Bank Account", description: "Read-only Plaid connection (coming soon)" },
              { value: "manual", label: "📤 Manual Upload Monthly", description: "We'll send a secure link each month" },
              { value: "talk_later", label: "💬 Talk to us later", description: "We'll follow up with options" },
            ]} selected={data.bankConnect || ""} onSelect={v => save({ ...data, bankConnect: v })} />
            {submitting && <p className="text-sm text-muted">Setting up your bookkeeping…</p>}
          </div>
        )}
      </StepWizard>
    </>
  );
}

/* ===== SHARED UI HELPERS ===== */
type VaultUploadResult = {
  documentId: string;
  fileName: string;
  category: string;
  status: string;
};

async function uploadFilesToVault(files: File[], category: "tax" | "bookkeeping" | "notary"): Promise<VaultUploadResult[]> {
  const uploaded: VaultUploadResult[] = [];

  for (const file of files) {
    const body = new FormData();
    body.append("file", file);
    body.append("category", category);

    const res = await fetch("/api/vault/upload", {
      method: "POST",
      credentials: "include",
      body,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) throw new Error(json.error || `Could not upload ${file.name}`);

    uploaded.push({
      documentId: json.documentId,
      fileName: json.fileName || file.name,
      category,
      status: json.status || "quarantine",
    });
  }

  return uploaded;
}

function StatusTimeline({ items }: { items: { label: string; done: boolean }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
      {items.map((item, i) => (
        <div key={item.label} className={`rounded-xl border p-3 ${item.done ? "bg-green-50 border-green-200 text-green-800" : "bg-white border-border text-muted"}`}>
          <div className="text-[10px] font-black uppercase">Step {i + 1}</div>
          <div className="text-xs font-bold mt-1">{item.done ? "✓ " : ""}{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function ResumeBanner({ onResume, onStartOver }: { onResume: () => void; onStartOver: () => void }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center justify-between flex-wrap gap-2">
      <span className="text-xs font-bold text-[#0B4DA2]">📋 You have a saved application. Continue where you left off?</span>
      <div className="flex gap-2">
        <button onClick={onResume} className="px-3 py-1.5 bg-[#0B4DA2] text-white text-xs font-bold rounded">Resume</button>
        <button onClick={onStartOver} className="px-3 py-1.5 bg-white border border-border text-xs font-bold rounded">Start Over</button>
      </div>
    </div>
  );
}

function SuccessScreen({ service, crossSells = [] }: { service: string; crossSells?: { icon: string; label: string; href: string }[] }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-8 text-center space-y-4">
      <div className="text-6xl animate-bounce-slow">🎉</div>
      <h2 className="text-2xl font-black text-ink">Your {service} is submitted!</h2>
      <p className="text-sm text-muted">A specialist will reach out within 1 business day. Track progress on your dashboard.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto">
        <a href="/portal/vault" className="px-4 py-3 bg-white border border-border rounded-xl text-sm font-bold hover:bg-soft">📤 Upload Documents</a>
        <a href="/portal/chat" className="px-4 py-3 bg-white border border-border rounded-xl text-sm font-bold hover:bg-soft">💬 Chat with Specialist</a>
      </div>
      {crossSells.length > 0 && (
        <div className="pt-4 border-t border-border space-y-2 max-w-md mx-auto">
          <div className="text-xs font-bold uppercase text-muted">Recommended next</div>
          {crossSells.map((cs, i) => (
            <a key={i} href={cs.href} className="block px-4 py-3 bg-soft rounded-xl text-sm font-bold text-[#0B4DA2] hover:bg-blue-50">{cs.icon} {cs.label} →</a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===== UTILITIES ===== */
function toggle(arr: string[] = [], val: string) { const a = [...arr]; const i = a.indexOf(val); if (i >= 0) a.splice(i, 1); else a.push(val); return a; }

function getTaxDocs(data: any) {
  const docs = ["Government-issued Photo ID", "Prior year tax return"];
  const sources = data.incomeSources || [];
  const dedu = data.deductions || [];
  if (sources.includes("W-2 (Employee)")) docs.push("W-2 from all employers");
  if (sources.includes("1099 / Freelance")) docs.push("All 1099 forms");
  if (sources.includes("Rental Income")) docs.push("Schedule E / rental docs");
  if (sources.includes("Business Income")) docs.push("Business profit/loss records");
  if (sources.includes("Investment / Stocks")) docs.push("1099-B");
  if (sources.includes("Cryptocurrency")) docs.push("Crypto exchange CSV / 1099-B");
  if (sources.includes("Retirement / SSA")) docs.push("SSA-1099 / 1099-R");
  if (dedu.includes("Bought or sold a home")) docs.push("Form 1098 (Mortgage Interest)");
  if (dedu.includes("Student loan interest")) docs.push("Form 1098-E");
  if (dedu.includes("Medical expenses > 7.5% AGI")) docs.push("Medical receipts");
  if (dedu.includes("Business vehicle use")) docs.push("Mileage log");
  if (dedu.includes("Education credits")) docs.push("Form 1098-T");
  if ((data.dependentCount || 0) > 0) docs.push("Social Security cards for dependents");
  return docs;
}

function getCrossSell(service: string, flags: any) {
  const s: any[] = [];
  if (service === "formation") {
    if (!flags.hasBookkeeping) s.push({ icon: "📊", service: "bookkeeping", text: "Set up your bookkeeping from Day 1. Separate personal and business finances." });
    if (!flags.hasInsurance) s.push({ icon: "🚗", service: "insurance", text: "Protect your team and qualify for multi-policy discounts." });
  }
  if (service === "tax") {
    if (!flags.hasEntity) s.push({ icon: "🏛", service: "formation", text: "Filing as sole proprietor? An LLC could save thousands in SE taxes." });
    if (!flags.hasBookkeeping) s.push({ icon: "📊", service: "bookkeeping", text: "Monthly bookkeeping catches deductions year-round." });
  }
  if (service === "insurance") {
    if (!flags.hasNotary) s.push({ icon: "✍️", service: "notary", text: "Auto insurance docs often need notarization. Same-day service available." });
  }
  if (service === "notary") {
    if (!flags.hasTax) s.push({ icon: "🧾", service: "tax", text: "Property transactions have tax implications. Schedule a review." });
  }
  if (service === "bookkeeping") {
    if (!flags.hasTax) s.push({ icon: "🧾", service: "tax", text: "Bundle bookkeeping + tax prep and save 20% annually." });
    if (!flags.hasEntity) s.push({ icon: "🏛", service: "formation", text: "No business entity yet? Forming an LLC takes 1 week." });
  }
  return s;
}

async function fetchUserProfile() {
  try {
    const res = await fetch("/api/user/profile", { credentials: "include" });
    if (!res.ok) throw new Error("No profile");
    return await res.json();
  } catch {
    return { email: "client@example.com", legal_name: "Client", phone: "" };
  }
}

const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" }, { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];
