export async function generateCaseSummary(params: {
  serviceType: string;
  clientName?: string;
  intakeData: Record<string, unknown>;
}): Promise<string> {
  if (process.env.AI_ENABLED === "false") return fallbackSummary(params);

  const baseUrl = (process.env.AI_BASE_URL || "").trim().replace(/\/+$/, "");
  const clientId = process.env.CF_ACCESS_CLIENT_ID || process.env.CLOUDFLARE_ACCESS_CLIENT_ID;
  const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET || process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET;
  const masterKey = process.env.LITELLM_MASTER_KEY || process.env.AI_API_KEY;
  if (!baseUrl || !clientId || !clientSecret || !masterKey) return fallbackSummary(params);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS || 15000));
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Access-Client-Id": clientId,
        "CF-Access-Client-Secret": clientSecret,
        Authorization: `Bearer ${masterKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "ollama/phi3.5",
        temperature: 0.15,
        max_tokens: 180,
        messages: [
          {
            role: "system",
            content: "Summarize financial service intake data for staff in two concise sentences. No markdown, no advice.",
          },
          { role: "user", content: JSON.stringify(params) },
        ],
      }),
      signal: controller.signal,
    });
    const payload: any = await res.json().catch(() => ({}));
    const text = payload?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : fallbackSummary(params);
  } catch {
    return fallbackSummary(params);
  } finally {
    clearTimeout(timer);
  }
}

function fallbackSummary(params: { serviceType: string; clientName?: string; intakeData: Record<string, unknown> }) {
  const keys = Object.keys(params.intakeData || {}).slice(0, 4);
  return `${params.clientName || "Client"} submitted a ${params.serviceType} intake${keys.length ? ` with ${keys.join(", ")}` : ""}. Staff should review the answers and request any missing documents.`;
}
