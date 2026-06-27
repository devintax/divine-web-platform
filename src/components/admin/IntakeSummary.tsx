"use client";

type IntakeSummaryProps = {
  serviceType: string;
  intakeData?: Record<string, unknown> | null;
  submittedAt?: string;
  clientName?: string;
};

const FIELD_LABELS: Record<string, Record<string, string>> = {
  tax: {
    filingStatus: "Filing Status",
    filingType: "Filing Type",
    incomeSources: "Income Sources",
    incomeTypes: "Income Types",
    deductions: "Deductions and Credits",
    dependentCount: "Number of Dependents",
    taxYear: "Tax Year",
    estimatedIncome: "Estimated Income Range",
    notes: "Notes",
  },
  formation: {
    businessName: "Business Name",
    entityType: "Entity Type",
    state: "State of Formation",
    ownerCount: "Number of Owners",
    industry: "Industry",
    registeredAgent: "Registered Agent",
    ownerName: "Owner Full Name",
    ownerEmail: "Owner Email",
    ownerPhone: "Owner Phone",
  },
  insurance: {
    zipCode: "ZIP Code",
    vehicleYear: "Vehicle Year",
    vehicleMake: "Vehicle Make",
    vehicleModel: "Vehicle Model",
    vehicleUsage: "Vehicle Usage",
    driverHistory: "Driver History",
    coverageLevel: "Coverage Level Requested",
    annualMileage: "Annual Mileage",
    currentCarrier: "Current Carrier",
    currentPremium: "Current Monthly Premium",
  },
  notary: {
    documentType: "Document Type",
    signerCount: "Number of Signers",
    sessionType: "Session Type",
    scheduledTime: "Scheduled Time",
    techCheckDone: "Tech Check Completed",
    consentGiven: "Recording Consent",
  },
  bookkeeping: {
    businessStage: "Business Stage",
    transactionVolume: "Monthly Transactions",
    currentTools: "Current Accounting Tools",
    bankAccountCount: "Bank Accounts",
    creditCardCount: "Business Credit Cards",
    hasEmployees: "Has Employees",
    employeeCount: "Employee Count",
    payrollService: "Payroll Service",
    reportingGoal: "Reporting Goals",
  },
};

const SERVICE_CONFIG: Record<string, { color: string; label: string }> = {
  tax: { color: "#0B4DA2", label: "Tax Preparation" },
  formation: { color: "#0891B2", label: "Business Formation" },
  insurance: { color: "#D97706", label: "Auto Insurance" },
  notary: { color: "#16A34A", label: "Notary Services" },
  bookkeeping: { color: "#7C3AED", label: "Bookkeeping" },
};

const SKIP_KEYS = new Set([
  "workflowId",
  "enrollmentId",
  "payment_completed",
  "stripe_session",
  "stripe_amount_total",
  "wfId",
  "step",
  "savedAt",
  "uploadedDocId",
  "uploadedDocName",
]);

function labelFor(serviceType: string, key: string) {
  const labels = FIELD_LABELS[serviceType] || {};
  return labels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([nestedKey, nestedValue]) => `${labelFor("", nestedKey)}: ${formatValue(nestedKey, nestedValue)}`)
      .filter(Boolean)
      .join("; ");
  }
  if (key.toLowerCase().includes("time") || key.toLowerCase().includes("date")) {
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString();
  }
  return String(value);
}

export default function IntakeSummary({ serviceType, intakeData, submittedAt, clientName }: IntakeSummaryProps) {
  const config = SERVICE_CONFIG[serviceType] || { color: "#0B4DA2", label: serviceType };
  const fields = Object.entries(intakeData || {})
    .filter(([key]) => !SKIP_KEYS.has(key))
    .map(([key, value]) => ({ key, label: labelFor(serviceType, key), value: formatValue(key, value) }))
    .filter((field) => field.value);

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-white">
      <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ backgroundColor: config.color }}>
        <div>
          <p className="text-white font-black text-sm">{config.label} Intake</p>
          <p className="text-white/85 text-xs">
            Submitted by {clientName || "Client"}
            {submittedAt ? ` on ${new Date(submittedAt).toLocaleDateString()}` : ""}
          </p>
        </div>
        <span className="text-xs text-white font-bold px-2 py-1 rounded-full bg-white/20">{fields.length} fields</span>
      </div>

      {fields.length === 0 ? (
        <div className="p-4 text-sm text-muted">No intake answers were saved for this case.</div>
      ) : (
        <div className="divide-y divide-border">
          {fields.map((field) => (
            <div key={field.key} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 px-4 py-2.5">
              <span className="text-xs font-bold text-muted">{field.label}</span>
              <span className="text-sm text-ink break-words">{field.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
