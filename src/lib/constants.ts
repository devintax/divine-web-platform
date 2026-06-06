export const BRAND = {
  name: "Divine Financial Group",
  tagline: "Your Trusted Partner in Financial Success",
  subtitle: "Your Trusted Financial Partner",
  phone: "(302) 322-5515",
  fax: "(302) 846-7881",
  text: "(302) 648-7858",
  whatsapp: "(302) 522-6002",
  email: "info@dfgbusiness.com",
  website: "www.dfgbusiness.com",
  address: "622 E. Basin Road, Suite A, New Castle, DE 19720",
  facebook: "https://www.facebook.com/divinefinancialgroup",
  twitter: "https://x.com/divineFinGroup",
  instagram: "https://www.instagram.com/divinefingroup/",
  hours: {
    weekday: "Monday – Friday: 9:00 AM – 5:00 PM",
    saturday: "Saturday (Tax Season): 10:00 AM – 2:00 PM",
    sunday: "Sunday: Closed",
  },
} as const;

export const SERVICES = [
  {
    id: "tax",
    num: "01",
    icon: "🧾",
    title: "Tax Preparation & Planning",
    shortTitle: "Tax Preparation",
    color: "#0B4DA2",
    desc: "Professional tax filing for individuals and businesses. We identify deductions and credits to minimize your tax liability.",
    longDesc: "Expert tax filing services that maximize deductions and ensure compliance for individuals and businesses.",
    items: [
      "Individual & business tax filing",
      "Deduction maximization",
      "Year-round tax planning",
      "IRS compliance support",
    ],
    fullItems: [
      "Professional tax filing for individuals and businesses",
      "Identifying deductions and credits to minimize tax liability",
      "Strategic tax planning for year-round financial benefits",
      "IRS compliance and audit support",
      "1040, Schedule C, Corporate returns, and more",
    ],
  },
  {
    id: "formation",
    num: "02",
    icon: "🏛",
    title: "Business Formation & Consulting",
    shortTitle: "Business Formation",
    color: "#C8102E",
    desc: "Helping entrepreneurs establish their businesses with proper structuring, legal documentation, and compliance advisory.",
    longDesc: "Helping entrepreneurs establish their businesses with proper structuring, legal documentation, and compliance advisory services.",
    items: [
      "LLC, S-Corp, C-Corp setup",
      "EIN registration",
      "Legal documentation",
      "Business strategy consulting",
    ],
    fullItems: [
      "Guidance on choosing the right structure: LLC, Sole Proprietorship, Corporation",
      "Assistance with legal documentation and state registration",
      "EIN (Employer Identification Number) filing",
      "Business strategy and compliance advisory services",
      "Annual report and registered agent support",
    ],
  },
  {
    id: "insurance",
    num: "03",
    icon: "🚗",
    title: "Auto & Life Insurance Solutions",
    shortTitle: "Auto Insurance",
    color: "#D97706",
    desc: "Personalized protection plans to safeguard your financial well-being with competitive rates from reliable providers.",
    longDesc: "Personalized insurance policies to provide financial protection at competitive rates from reliable providers.",
    items: [
      "Auto insurance quotes",
      "Life insurance plans",
      "Competitive carrier rates",
      "Expert coverage advice",
    ],
    fullItems: [
      "Personalized auto insurance policies",
      "Life insurance coverage options",
      "Competitive rates from 50+ reliable carriers",
      "Expert advice on selecting the best coverage",
      "Quick quote comparison and policy review",
    ],
  },
  {
    id: "notary",
    num: "04",
    icon: "✍️",
    title: "Notary Public Services",
    shortTitle: "Notary Services",
    color: "#16A34A",
    desc: "Secure and professional notarization for legal, financial, and personal documents.",
    longDesc: "Secure and professional notarization for legal, financial, and personal documents. Walk-in or scheduled appointments.",
    items: [
      "Legal document notarization",
      "Remote Online Notary (RON)",
      "Identity verification",
      "Session recording (legal)",
    ],
    fullItems: [
      "Legal, financial, and personal document notarization",
      "Remote Online Notarization (RON) available",
      "Walk-in or scheduled appointments",
      "Identity verification and KYC compliance",
      "Session recording for legal requirements",
    ],
  },
  {
    id: "bookkeeping",
    num: "05",
    icon: "📊",
    title: "Bookkeeping & Payroll Management",
    shortTitle: "Bookkeeping",
    color: "#0891b2",
    desc: "Accurate record-keeping and payroll management for streamlined business operations.",
    longDesc: "Comprehensive bookkeeping to maintain financial accuracy with payroll processing and detailed financial reporting.",
    items: [
      "Monthly bookkeeping",
      "Payroll processing",
      "Financial reporting",
      "QuickBooks/Xero integration",
    ],
    fullItems: [
      "Comprehensive monthly bookkeeping",
      "Payroll processing — timely and compliant",
      "Detailed financial reporting for business decisions",
      "QuickBooks, Xero, and Plaid integration",
      "Year-end cleanup and tax-ready reports",
    ],
  },
] as const;

export const PORTAL_SERVICES = [
  { id: "formation", label: "Business Formation", icon: "🏛", color: "#0B4DA2", pct: 64, status: "Filing in progress", badge: "blue" as const },
  { id: "tax", label: "Tax Preparation", icon: "🧾", color: "#C8102E", pct: 38, status: "Needs W-2 upload", badge: "red" as const },
  { id: "bookkeeping", label: "Bookkeeping", icon: "📊", color: "#0891b2", pct: 72, status: "12 transactions", badge: "blue" as const },
  { id: "insurance", label: "Auto Insurance", icon: "🚗", color: "#C8102E", pct: 82, status: "Quote ready", badge: "gold" as const },
  { id: "notary", label: "Notary Services", icon: "✍️", color: "#16A34A", pct: 91, status: "Session confirmed", badge: "green" as const },
] as const;

export const INTAKE_FLOWS: Record<string, {
  title: string;
  steps: Array<{
    label: string;
    question: string;
    type: "input" | "opts" | "multi" | "upload";
    placeholder?: string;
    helper: string;
    options?: string[];
  }>;
}> = {
  formation: {
    title: "Business Formation Wizard",
    steps: [
      { label: "Business Name", question: "What is your business name?", type: "input", placeholder: "e.g. Divine Logistics LLC", helper: "We check real-time name availability with your state's Secretary of State." },
      { label: "Entity Type", question: "Which structure are you forming?", type: "opts", options: ["LLC", "S-Corp", "C-Corp", "Nonprofit"], helper: "This controls your tax treatment, liability protection, and compliance requirements." },
      { label: "State of Operation", question: "Where will you operate?", type: "opts", options: ["Delaware", "Maryland", "Pennsylvania", "New Jersey"], helper: "We prepare and file state-specific paperwork on your behalf." },
      { label: "Registered Agent", question: "Who handles your legal mail?", type: "opts", options: ["Divine Financial Group", "I have my own agent", "Not sure yet"], helper: "We offer registered agent services, turning legal mail into a client retention service." },
    ],
  },
  tax: {
    title: "Tax Preparation Intake",
    steps: [
      { label: "Filing Status", question: "How are you filing this year?", type: "opts", options: ["Single", "Married Filing Jointly", "Head of Household", "Business Owner"], helper: "This determines your checklist, available deductions, and required schedules." },
      { label: "Income Sources", question: "Select all income sources that apply.", type: "multi", options: ["W-2 (Employee)", "1099 / Freelance", "Rental Income", "Stocks / Crypto"], helper: "We create dedicated upload slots in your vault for each income type." },
      { label: "Deductions", question: "Any major deductions this year?", type: "multi", options: ["Bought a Home", "Student Loans", "Medical Expenses", "Business Mileage"], helper: "We maximize every deduction. Even small items can significantly reduce your liability." },
      { label: "Upload Prior Return", question: "Upload last year's tax return to save time.", type: "upload", helper: "Your file is auto-tagged and securely routed to your Tax Pod within seconds." },
    ],
  },
  bookkeeping: {
    title: "Bookkeeping Onboarding",
    steps: [
      { label: "Business Stage", question: "Where is your business right now?", type: "opts", options: ["New startup", "Established business", "Cleanup needed", "Not sure"], helper: "New businesses get chart-of-accounts setup. Established businesses get a cleanup review." },
      { label: "Transaction Volume", question: "How many transactions per month?", type: "opts", options: ["0-50", "50-200", "200+", "Don't know"], helper: "This determines your pricing tier and which bookkeeper is assigned to your account." },
      { label: "Current Tools", question: "What accounting tools do you currently use?", type: "opts", options: ["QuickBooks", "Xero", "Spreadsheets", "Nothing yet"], helper: "We connect to or migrate data from QuickBooks, Xero, Plaid, or spreadsheets." },
      { label: "Reporting Goal", question: "What outcome do you want from bookkeeping?", type: "opts", options: ["Monthly reports", "Tax readiness", "Payroll support", "Year-end cleanup"], helper: "This tailors the monthly deliverables your bookkeeper provides." },
    ],
  },
  insurance: {
    title: "Auto Insurance Rater",
    steps: [
      { label: "Location", question: "What is the ZIP code where your vehicle is parked?", type: "input", placeholder: "e.g. 19720", helper: "We compare rates from 50+ carriers in your area for the most competitive quote." },
      { label: "Vehicle", question: "Tell us about your vehicle.", type: "opts", options: ["Enter year/make/model", "Scan VIN", "Upload current policy", "Shopping for a car"], helper: "Manual entry is fastest for the MVP. VIN scan integration coming soon." },
      { label: "Vehicle Usage", question: "How do you primarily use the vehicle?", type: "opts", options: ["Personal", "Commuting", "Rideshare (Uber/Lyft)", "Commercial use"], helper: "Commercial or rideshare use triggers a Business Formation cross-sell for asset protection." },
      { label: "Driver History", question: "Any accidents or tickets in the last 3 years?", type: "opts", options: ["None", "One ticket", "One accident", "Multiple incidents"], helper: "Honest answers get the most accurate rates. All data is encrypted and confidential." },
    ],
  },
  notary: {
    title: "Notary Services Scheduler",
    steps: [
      { label: "Document Type", question: "What are we notarizing today?", type: "opts", options: ["Affidavit", "Power of Attorney", "Deed", "Loan Document"], helper: "Document type determines session length, witness requirements, and legal jurisdiction." },
      { label: "Number of Signers", question: "How many people need to sign?", type: "opts", options: ["1 signer", "2 signers", "3+ signers", "Not sure"], helper: "We allocate the right notary and ensure all parties have their IDs ready." },
      { label: "ID Verification", question: "Do you have a valid government-issued photo ID ready?", type: "opts", options: ["Yes, ready", "No, need to find it", "ID is expired", "Need help"], helper: "KYC identity verification happens before the video session begins — required by law." },
      { label: "Scheduling", question: "Pick a 15-minute video session window.", type: "opts", options: ["Today 4:30 PM", "Tomorrow 10:00 AM", "Tomorrow 2:15 PM", "This Weekend"], helper: "Your session is recorded per state notary law and stored in your secure vault." },
    ],
  },
};

export const CROSS_SELL: Record<string, string[]> = {
  formation: [
    "After forming your LLC, add Bookkeeping to keep personal and business finances separate.",
    "Consider our Registered Agent + annual compliance subscription package.",
  ],
  tax: [
    "Filing as self-employed? An LLC can protect your personal assets from business liabilities.",
    "High tax bill? Monthly bookkeeping prevents year-end surprises and maximizes deductions.",
  ],
  bookkeeping: [
    "No accounting tool yet? We set up your Chart of Accounts from scratch.",
    "Bundle with Tax Prep for up to 30% savings on annual financial management.",
  ],
  insurance: [
    "Commercial or rideshare use? Form an LLC first to protect your personal assets.",
    "Upload your current policy and our broker finds you a better rate within 24 hours.",
  ],
  notary: [
    "Notarizing a deed or loan? Schedule a Tax Prep review — major asset moves affect taxes.",
    "Multiple signers? We create a full e-sign packet and coordinate all parties.",
  ],
};

export const VAULT_FILES = [
  { name: "2025_W2_Alicia.pdf", category: "Tax", status: "Clean", route: "Tax Pod", size: "128 KB" },
  { name: "Auto_Policy.jpg", category: "Insurance", status: "OCR tagged", route: "Insurance Pod", size: "2.1 MB" },
  { name: "Operating_Agreement.docx", category: "Formation", status: "Under review", route: "Legal Pod", size: "44 KB" },
  { name: "Government_ID.png", category: "Notary", status: "Scanning...", route: "Notary Pod", size: "1.3 MB" },
  { name: "Schedule_C.pdf", category: "Tax", status: "Clean", route: "Tax Pod", size: "88 KB" },
] as const;

export const AUDIT_LOG = [
  "Client uploaded 2025 W-2 via safe link · 10:32 AM",
  "Malware scan passed, moved to vault · 10:33 AM",
  "Tax Pod viewed file (MFA verified) · 11:04 AM",
  "System generated missing-doc request · 11:10 AM",
  "Insurance Broker accessed Auto Policy · 11:45 AM",
  "Legal Pod submitted SOS filing · 12:02 PM",
] as const;

export const ADMIN_CASES = [
  { client: "Alicia Mensah", service: "Tax Preparation", status: "Needs W-2 upload", risk: "Medium" as const, sla: "2h", pod: "Tax Pod" },
  { client: "Bright Path Logistics", service: "Business Formation", status: "SOS filing review", risk: "Low" as const, sla: "6h", pod: "Legal Pod" },
  { client: "Kojo Addo", service: "Auto Insurance", status: "Broker quote pending", risk: "High" as const, sla: "45m", pod: "Insurance Pod" },
  { client: "Nana Boateng", service: "Notary", status: "ID verification failed", risk: "High" as const, sla: "20m", pod: "Notary Pod" },
  { client: "Marcus Rivera", service: "Bookkeeping", status: "Missing bank statements", risk: "Low" as const, sla: "12h", pod: "Finance Pod" },
] as const;

export const RBAC_ROLES = [
  { role: "Client Support", access: ["View basic PII (Name/Email/Phone)", "Reset passwords and MFA", "Vault metadata only (no file content)", "Live chat and secure messaging", "Internal case transfer to specialists", "Billing and refund management"] },
  { role: "Tax Intern", access: ["Tax documents content view only", "Generate upload links", "Secure messaging with clients"] },
  { role: "Insurance Broker", access: ["Full insurance module access", "Bind and finalize policies", "Insurance vault files only"] },
  { role: "Business Specialist", access: ["Full formation module access", "Submit state filings (SOS)", "Notary session coordination"] },
  { role: "Senior Accountant", access: ["Full financial module access", "Vault delete and move permissions", "Tax return approval authority"] },
  { role: "General Manager", access: ["Full platform access", "Audit log viewer", "Staff account management", "Emergency override approval"] },
] as const;
