import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type DograhAgent = { id: string | number; name?: string; workflow_uuid?: string };

async function setupVoiceAgent() {
  const agentName = "Divine - DFG Voice Receptionist";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
  const webhookUrl = `${appUrl.replace(/\/+$/, "")}/api/voice/webhook`;
  const existingAgents = await listAgents().catch(() => []);
  const existing = existingAgents.find((agent) => agent.name === agentName);
  if (existing?.id) {
    const agentIdentifier = existing.workflow_uuid || existing.id;
    console.log("AI Voice Agent already exists");
    console.log(`DOGRAH_AGENT_ID=${agentIdentifier}`);
    console.log(`Webhook URL=${webhookUrl}`);
    return;
  }

  const agent = await createAgent({
    name: agentName,
    firstMessage:
      "Thank you for calling Divine Financial Group. I'm Divine, your AI assistant. I can help with tax preparation, business formation, insurance, notary services, or bookkeeping. How can I help you today?",
    systemPrompt: `
You are Divine, the AI voice receptionist for Divine Financial Group in New Castle, Delaware.

DFG address: 622 E. Basin Road, Suite A, New Castle, DE 19720.
DFG phone: (302) 322-5515. Services: tax preparation, business formation, auto insurance, notary services, and bookkeeping.

Responsibilities:
- Greet callers warmly and professionally.
- Identify whether the caller needs tax, formation, insurance, notary, bookkeeping, billing, or general help.
- Use lookup_client for existing callers when phone number is available.
- Use get_case_status for case status questions.
- Use schedule_callback when a human specialist is needed.
- Use create_voice_intake for new service requests.
- Use send_info_sms when the caller asks for information or a portal link.

Rules:
- Do not give tax, legal, insurance, investment, or filing advice.
- For urgent IRS/legal/deadline situations, collect details and schedule a human callback.
- Keep spoken responses concise.
- Transfer to a human when the caller asks or the request is complex.
`.trim(),
    webhookUrl,
    tools: [],
    transferPhoneNumber: process.env.DFG_PHONE_NUMBER || "+13023225515",
  });

  console.log("AI Voice Agent created");
  console.log(`DOGRAH_AGENT_ID=${agent.workflow_uuid || agent.id}`);
  console.log(`Webhook URL=${webhookUrl}`);
}

setupVoiceAgent().catch((error) => {
  console.error(error);
  process.exit(1);
});

function dograhBaseUrl() {
  return (process.env.DOGRAH_BASE_URL || "https://dograh.dfgworld.net").trim().replace(/\/+$/, "");
}

function dograhApiKey() {
  return (process.env.DOGRAH_API_KEY || "").trim();
}

async function dograh<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = dograhApiKey();
  if (!apiKey) throw new Error("DOGRAH_API_KEY is not configured");
  const resolvedPath = path.startsWith("/api/v1/") ? path : `/api/v1${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(`${dograhBaseUrl()}${resolvedPath}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...(init?.headers || {}),
    },
  });
  const text = await response.text();
  const payload = text ? safeJson(text) : {};
  if (!response.ok) {
    const rawMessage = typeof payload?.detail === "string" ? payload.detail : payload?.message || payload?.error || text || `HTTP ${response.status}`;
    const message = sanitizeMessage(rawMessage);
    throw new Error(`Dograh ${resolvedPath}: ${message}`);
  }
  return payload as T;
}

async function listAgents(): Promise<DograhAgent[]> {
  const data: any = await dograh("/workflow/fetch");
  return data.agents || data.data?.agents || data.data || data || [];
}

async function createAgent(params: {
  name: string;
  firstMessage: string;
  systemPrompt: string;
  webhookUrl: string;
  tools: unknown[];
  transferPhoneNumber: string;
}): Promise<DograhAgent> {
  const data: any = await dograh("/workflow/create/template", {
    method: "POST",
    body: JSON.stringify({
      call_type: "outbound",
      use_case: params.name,
      activity_description: `${params.firstMessage}\n\n${params.systemPrompt}\n\nWebhook URL: ${params.webhookUrl}\nTransfer phone: ${params.transferPhoneNumber}`,
    }),
  });
  return data.agent || data.workflow || data.data || data;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function sanitizeMessage(message: unknown) {
  const text = typeof message === "string" ? message : "Dograh API request failed";
  if (/<\/?[a-z][\s\S]*>/i.test(text) || text.includes("<!DOCTYPE")) {
    return "Dograh returned an HTML error page. Check API key permissions and server-side route access.";
  }
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}
