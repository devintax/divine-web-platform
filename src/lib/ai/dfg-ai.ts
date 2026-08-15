import "server-only";

export type AIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AITextResult = {
  text: string;
  provider: "litellm" | "openrouter" | "disabled" | "unavailable";
  model?: string;
  error?: string;
};

type GenerateOptions = {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
};

type ChatOptions = {
  messages: AIChatMessage[];
  maxTokens?: number;
  temperature?: number;
};

const DEFAULT_TIMEOUT_MS = 15000;

function aiEnabled() {
  return process.env.AI_ENABLED !== "false";
}

function timeoutMs() {
  const parsed = Number(process.env.AI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function normalizeBaseUrl(raw?: string) {
  return (raw || "").trim().replace(/\/+$/, "");
}

function extractContent(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : typeof part === "string" ? part : ""))
      .join("")
      .trim();
  }
  return "";
}

async function postChatCompletion(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<{ text: string; status: number; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { text: "", status: res.status, error: payload?.error?.message || payload?.message || `HTTP ${res.status}` };
    }
    return { text: extractContent(payload), status: res.status };
  } catch (error: any) {
    const message = error?.name === "AbortError" ? "AI request timed out" : error?.message || "AI request failed";
    return { text: "", status: 0, error: message };
  } finally {
    clearTimeout(timer);
  }
}

async function callLiteLLM(options: ChatOptions): Promise<AITextResult> {
  const baseUrl = normalizeBaseUrl(process.env.AI_BASE_URL);
  const model = process.env.AI_MODEL || "ollama/phi3.5";
  const clientId = process.env.CF_ACCESS_CLIENT_ID || process.env.CLOUDFLARE_ACCESS_CLIENT_ID;
  const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET || process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET;
  const masterKey = process.env.LITELLM_MASTER_KEY || process.env.AI_API_KEY;

  if (!baseUrl || !clientId || !clientSecret || !masterKey) {
    return { text: "", provider: "unavailable", model, error: "LiteLLM environment is incomplete" };
  }

  const result = await postChatCompletion(
    `${baseUrl}/chat/completions`,
    {
      "CF-Access-Client-Id": clientId,
      "CF-Access-Client-Secret": clientSecret,
      Authorization: `Bearer ${masterKey}`,
    },
    {
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 500,
    },
  );

  return {
    text: result.text,
    provider: result.text ? "litellm" : "unavailable",
    model,
    error: result.error,
  };
}

async function callOpenRouter(options: ChatOptions): Promise<AITextResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free";
  if (!apiKey) return { text: "", provider: "unavailable", model, error: "OpenRouter API key is not configured" };

  const result = await postChatCompletion(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000",
      "X-Title": "Divine Financial Group",
    },
    {
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 500,
    },
  );

  return {
    text: result.text,
    provider: result.text ? "openrouter" : "unavailable",
    model,
    error: result.error,
  };
}

export async function chatWithAI(options: ChatOptions): Promise<AITextResult> {
  if (!aiEnabled()) return { text: "", provider: "disabled" };

  const primary = await callLiteLLM(options);
  if (primary.text) return primary;

  const fallback = await callOpenRouter(options);
  if (fallback.text) return fallback;

  return {
    text: "",
    provider: "unavailable",
    model: primary.model || fallback.model,
    error: primary.error || fallback.error || "No AI provider returned a response",
  };
}

export async function generateText(options: GenerateOptions): Promise<AITextResult> {
  return chatWithAI({
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.userMessage },
    ],
    maxTokens: options.maxTokens,
    temperature: options.temperature,
  });
}

export async function summarizeIntake(input: {
  serviceType: string;
  intakeData: Record<string, unknown>;
  clientName?: string | null;
}): Promise<AITextResult> {
  const result = await generateText({
    systemPrompt:
      "You summarize financial service intake data for staff. Use plain English, no markdown, no legal advice, and keep it to two concise sentences.",
    userMessage: JSON.stringify({
      serviceType: input.serviceType,
      clientName: input.clientName || "Client",
      intakeData: input.intakeData || {},
    }),
    maxTokens: 180,
    temperature: 0.15,
  });

  if (result.text) return result;
  return {
    ...result,
    text: fallbackIntakeSummary(input.serviceType, input.intakeData, input.clientName),
  };
}

export async function financialHealthNarrative(input: {
  score: number;
  services: Array<{ service_type?: string; status?: string }>;
  clientName?: string | null;
}): Promise<AITextResult> {
  const result = await generateText({
    systemPrompt:
      "You are a helpful financial services concierge. Explain a client's financial readiness score in two short sentences. Do not promise outcomes or give legal/tax advice.",
    userMessage: JSON.stringify({
      score: input.score,
      clientName: input.clientName || "Client",
      services: input.services,
    }),
    maxTokens: 160,
    temperature: 0.25,
  });

  if (result.text) return result;
  return {
    ...result,
    text: `Your current readiness score is ${input.score}. Completing active services and keeping documents current will improve your overall profile.`,
  };
}

export async function checkAIHealth() {
  const primaryConfigured = Boolean(
    process.env.AI_BASE_URL &&
    (process.env.CF_ACCESS_CLIENT_ID || process.env.CLOUDFLARE_ACCESS_CLIENT_ID) &&
    (process.env.CF_ACCESS_CLIENT_SECRET || process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET) &&
    (process.env.LITELLM_MASTER_KEY || process.env.AI_API_KEY),
  );
  const fallbackConfigured = Boolean(process.env.OPENROUTER_API_KEY);

  if (!aiEnabled()) {
    return { enabled: false, primaryConfigured, fallbackConfigured, primary: "disabled", fallback: "disabled" };
  }

  const result = await chatWithAI({
    messages: [
      { role: "system", content: "Reply with the single word ok." },
      { role: "user", content: "health check" },
    ],
    maxTokens: 8,
    temperature: 0,
  });

  return {
    enabled: true,
    primaryConfigured,
    fallbackConfigured,
    primary: primaryConfigured ? "configured" : "missing_env",
    fallback: fallbackConfigured ? "configured" : "missing_env",
    provider: result.provider,
    model: result.model,
    healthy: Boolean(result.text),
    error: result.text ? null : result.error || "No response from AI providers",
  };
}

function fallbackIntakeSummary(serviceType: string, data: Record<string, unknown>, clientName?: string | null) {
  const name = clientName || "The client";
  const keys = Object.entries(data || {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`);
  return keys.length
    ? `${name} submitted a ${serviceType} intake with ${keys.join("; ")}. Staff should review the intake answers and request any missing documents before moving the case forward.`
    : `${name} submitted a ${serviceType} intake. Staff should review the case and request any missing documents before moving the case forward.`;
}
