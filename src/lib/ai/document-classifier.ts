"use client";

export type DocumentClassification = {
  label: string;
  category: "tax" | "formation" | "insurance" | "notary" | "bookkeeping" | "identity" | "general";
  confidence: number;
  signals: string[];
};

const RULES: Array<{
  label: string;
  category: DocumentClassification["category"];
  terms: string[];
}> = [
  { label: "W-2 Tax Form", category: "tax", terms: ["w2", "w-2", "wage", "withholding"] },
  { label: "1099 Tax Form", category: "tax", terms: ["1099", "misc", "nec", "interest", "dividend"] },
  { label: "Prior Year Tax Return", category: "tax", terms: ["1040", "tax return", "return", "schedule c", "schedule e"] },
  { label: "Articles or Formation Filing", category: "formation", terms: ["articles", "certificate of formation", "incorporation", "llc", "entity"] },
  { label: "EIN or IRS Letter", category: "formation", terms: ["ein", "irs letter", "cp575", "ss-4"] },
  { label: "Insurance Policy", category: "insurance", terms: ["policy", "declarations", "insurance", "binder", "coverage"] },
  { label: "Driver License", category: "identity", terms: ["license", "drivers", "driver", "id card", "passport"] },
  { label: "Notary Document", category: "notary", terms: ["notary", "affidavit", "deed", "power of attorney", "poa", "acknowledgment", "jurat"] },
  { label: "Bank or Bookkeeping Statement", category: "bookkeeping", terms: ["bank statement", "statement", "transactions", "quickbooks", "profit loss", "p&l", "ledger"] },
];

export async function classifyDocument(file: File): Promise<DocumentClassification> {
  const haystack = `${file.name} ${file.type}`.toLowerCase().replace(/[_-]+/g, " ");
  let best: {
    label: string;
    category: DocumentClassification["category"];
    score: number;
    signals: string[];
  } = { label: "General Document", category: "general", score: 0, signals: [] };

  for (const rule of RULES) {
    const signals = rule.terms.filter((term) => haystack.includes(term));
    const score = signals.length / Math.max(rule.terms.length, 1);
    if (signals.length && score > best.score) {
      best = { label: rule.label, category: rule.category, score, signals };
    }
  }

  const confidence = best.score > 0 ? Math.min(0.96, 0.58 + best.score * 0.38) : 0.35;
  return {
    label: best.label,
    category: best.category,
    confidence: Math.round(confidence * 100) / 100,
    signals: best.signals,
  };
}
