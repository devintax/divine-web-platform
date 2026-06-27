export type ServiceType = "tax" | "formation" | "insurance" | "notary" | "bookkeeping";

export const SERVICE_TYPES: ServiceType[] = ["tax", "formation", "insurance", "notary", "bookkeeping"];

export const SERVICE_WORKFLOW: Record<ServiceType, {
  label: string;
  deskPath: string;
  pod: string;
  color: string;
  allowedRoles: string[];
  checklist: { label: string; clientVisible?: boolean }[];
}> = {
  tax: {
    label: "Tax Preparation",
    deskPath: "/portal/admin/tax",
    pod: "tax-pod",
    color: "#16A34A",
    allowedRoles: ["tax_intern", "accountant", "manager", "super_admin"],
    checklist: [
      { label: "Review client intake form", clientVisible: false },
      { label: "Verify all required documents received" },
      { label: "W-2 forms collected" },
      { label: "1099 / freelance income docs" },
      { label: "Prior year return reviewed", clientVisible: false },
      { label: "Deductions maximized", clientVisible: false },
      { label: "Draft return prepared" },
      { label: "Senior review completed", clientVisible: false },
      { label: "Client review sent" },
      { label: "Client approved return" },
      { label: "Filed with IRS" },
    ],
  },
  formation: {
    label: "Business Formation",
    deskPath: "/portal/admin/formation",
    pod: "formation-desk",
    color: "#0B4DA2",
    allowedRoles: ["specialist", "manager", "super_admin"],
    checklist: [
      { label: "Review entity intake" },
      { label: "Collect owner details" },
      { label: "Prepare formation documents" },
      { label: "File with state" },
      { label: "State approval received" },
      { label: "EIN requested" },
      { label: "Articles and EIN delivered" },
    ],
  },
  insurance: {
    label: "Insurance Broker Station",
    deskPath: "/portal/admin/insurance",
    pod: "broker-station",
    color: "#D97706",
    allowedRoles: ["broker", "manager", "super_admin"],
    checklist: [
      { label: "Review intake and vehicle details" },
      { label: "Verify driver history" },
      { label: "Compare carrier quotes" },
      { label: "Send quote comparison" },
      { label: "Bind selected policy" },
      { label: "Deliver policy documents" },
    ],
  },
  notary: {
    label: "Notary Console",
    deskPath: "/portal/admin/notary",
    pod: "notary-console",
    color: "#C8102E",
    allowedRoles: ["notary", "manager", "super_admin"],
    checklist: [
      { label: "Confirm appointment" },
      { label: "Review uploaded document" },
      { label: "Verify identity/KYC" },
      { label: "Conduct notary session" },
      { label: "Upload notarized document" },
      { label: "Close notary record" },
    ],
  },
  bookkeeping: {
    label: "Bookkeeping Pod",
    deskPath: "/portal/admin/books",
    pod: "bookkeeping-pod",
    color: "#7C3AED",
    allowedRoles: ["accountant", "manager", "super_admin"],
    checklist: [
      { label: "Review bookkeeping intake" },
      { label: "Collect bank statements or connection" },
      { label: "Review prior accounting data" },
      { label: "Set up Chart of Accounts" },
      { label: "Enter opening balances" },
      { label: "Categorize initial transactions" },
      { label: "Generate first monthly report" },
      { label: "Send report to client" },
      { label: "Client confirmed ongoing service" },
    ],
  },
};

export function isServiceType(value: unknown): value is ServiceType {
  return typeof value === "string" && SERVICE_TYPES.includes(value as ServiceType);
}

export function canAccessServiceDesk(role: string, service: ServiceType) {
  return SERVICE_WORKFLOW[service].allowedRoles.includes(role);
}

export function priorityForService(service: ServiceType, intakeData: any): "low" | "normal" | "high" | "urgent" {
  if (service === "tax" && (intakeData?.incomeSources?.length || 0) > 3) return "high";
  if (service === "notary" && intakeData?.sessionType === "ron") return "high";
  return "normal";
}
