import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type ConciergeIntent =
  | "formation"
  | "tax"
  | "insurance"
  | "notary"
  | "bookkeeping"
  | "status"
  | "vault"
  | "human_handoff"
  | "billing"
  | "general";

type ConciergeSession = {
  profileId: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
};

type IntentConfig = {
  id: ConciergeIntent;
  keywords: string[];
  service?: string;
  action?: string;
};

const INTENTS: IntentConfig[] = [
  { id: "formation", service: "formation", action: "navigate_to_intake", keywords: ["llc", "corporation", "corp", "business formation", "incorporate", "entity", "register my business", "start a business", "articles", "operating agreement", "registered agent", "ein"] },
  { id: "tax", service: "tax", action: "navigate_to_intake", keywords: ["tax", "taxes", "irs", "filing", "tax return", "w-2", "w2", "1099", "refund", "deduction", "write off", "tax prep", "schedule c", "self employed"] },
  { id: "insurance", service: "insurance", action: "navigate_to_intake", keywords: ["insurance", "auto", "car", "coverage", "quote", "policy", "premium", "rate", "liability", "comprehensive", "collision"] },
  { id: "notary", service: "notary", action: "navigate_to_intake", keywords: ["notary", "notarize", "sign", "deed", "affidavit", "power of attorney", "acknowledgment", "jurat", "ron", "remote online"] },
  { id: "bookkeeping", service: "bookkeeping", action: "navigate_to_intake", keywords: ["bookkeeping", "books", "accounting", "ledger", "payroll", "monthly report", "reconcile", "quickbooks", "financial statements"] },
  { id: "status", action: "show_orders", keywords: ["status", "track", "progress", "where is", "update", "case", "order", "application"] },
  { id: "vault", action: "open_vault", keywords: ["vault", "upload", "document", "file", "download", "secure file", "missing document", "paperwork"] },
  { id: "human_handoff", action: "queue_callback", keywords: ["human", "agent", "person", "representative", "call me", "callback", "speak", "talk to someone", "support"] },
  { id: "billing", action: "billing_help", keywords: ["pay", "payment", "stripe", "invoice", "bill", "billing", "refund", "receipt", "price", "cost"] },
];

function detectIntent(message: string): IntentConfig {
  const lower = message.toLowerCase();
  return INTENTS.find((intent) => intent.keywords.some((keyword) => lower.includes(keyword))) || { id: "general", keywords: [] };
}

function firstName(session: ConciergeSession) {
  return (session.legalName || session.email || "there").split(" ")[0];
}

function isOffHours(now = new Date()) {
  const day = now.getUTCDay();
  const hourET = (now.getUTCHours() - 5 + 24) % 24;
  return day === 0 || day === 6 || hourET < 9 || hourET >= 17;
}

async function getLatestEnrollment(profileId: string, service?: string) {
  let q = getSupabaseAdmin().from("service_enrollments").select("id,service_type,status,progress,client_message,updated_at").eq("user_id", profileId);
  if (service) q = q.eq("service_type", service);
  const { data } = await q.order("updated_at", { ascending: false }).limit(1).single();
  return data;
}

async function getVaultCount(profileId: string) {
  const { data } = await getSupabaseAdmin().from("vault_documents").select("id").eq("user_id", profileId).eq("is_deleted", false);
  return data?.length || 0;
}

async function queueCallback(session: ConciergeSession, context: string) {
  await getSupabaseAdmin().from("callback_queue").insert({
    user_id: session.profileId,
    preferred_method: session.phone ? "call" : "email",
    service_context: context,
    status: "pending",
    ai_gathered_data: { source: "ai_concierge", message: "Handoff requested" },
  });
}

export async function generateConciergeReply(message: string, session: ConciergeSession) {
  const intent = detectIntent(message);
  const name = firstName(session);
  const offHours = isOffHours();
  let reply: string;
  let href: string | undefined;

  if (intent.id === "status") {
    const latest = await getLatestEnrollment(session.profileId);
    href = "/portal/orders";
    reply = latest
      ? `Your latest ${latest.service_type} case is ${latest.status} at ${latest.progress || 0}%. ${latest.client_message || "Open Orders for the full timeline and messages."}`
      : "I do not see an active service case yet. You can start an intake from Services, and it will appear in Orders as soon as it is submitted.";
  } else if (intent.id === "vault") {
    const count = await getVaultCount(session.profileId);
    href = "/portal/vault";
    reply = count > 0
      ? `You currently have ${count} document${count === 1 ? "" : "s"} in your secure vault. You can upload, review, or download files from Vault.`
      : "Your secure vault is ready, but I do not see uploaded documents yet. You can upload files from Vault or use any upload link your specialist sent.";
  } else if (intent.id === "human_handoff") {
    await queueCallback(session, "human_handoff");
    reply = offHours
      ? `I queued a callback for you, ${name}. Our office is closed right now, so a specialist will follow up next business morning.`
      : `I queued a callback for you, ${name}. A specialist will follow up as soon as possible.`;
  } else if (intent.id === "billing") {
    href = "/portal/orders";
    reply = "For payments, invoices, or receipts, open Orders and select the related service. If a payment link is ready, it will be attached to that case.";
  } else if (intent.service) {
    href = `/portal/intake?service=${intent.service}`;
    const latest = await getLatestEnrollment(session.profileId, intent.service);
    if (latest && latest.status !== "completed") {
      reply = `You already have a ${intent.service} case in progress at ${latest.progress || 0}%. Open Orders to see messages, requested documents, and next steps.`;
      href = "/portal/orders";
    } else {
      const labels: Record<string, string> = {
        formation: "business formation",
        tax: "tax preparation",
        insurance: "auto insurance",
        notary: "notary services",
        bookkeeping: "bookkeeping",
      };
      reply = `I can help with ${labels[intent.service] || intent.service}, ${name}. Start the intake and your request will route to the right specialist queue.`;
    }
  } else {
    reply = "I can help with business formation, taxes, auto insurance, notary services, bookkeeping, order status, vault documents, billing, or reaching a human specialist.";
  }

  return {
    reply,
    intent: intent.id,
    service: intent.service,
    action: intent.action,
    href,
    offHours,
  };
}
