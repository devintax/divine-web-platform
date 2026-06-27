import { getSupabaseAdmin } from "../lib/insforge";

type SmsProviderName = "vendel" | "textbee";

interface SmsSendResult {
  success: boolean;
  provider: SmsProviderName;
  messageId?: string;
  status?: string;
  error?: string;
}

function normalizePhone(phone: string) {
  const trimmed = String(phone || "").trim();
  if (trimmed.startsWith("+")) return `+${trimmed.replace(/\D/g, "")}`;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

function maskPhone(phone: string) {
  return phone.replace(/.(?=.{4})/g, "*");
}

function configuredProvider(value: string | undefined, fallback: SmsProviderName): SmsProviderName {
  return String(value || fallback).toLowerCase() === "textbee" ? "textbee" : "vendel";
}

async function sendWithProvider(provider: SmsProviderName, to: string, body: string): Promise<SmsSendResult> {
  return provider === "textbee" ? sendWithTextBee(to, body) : sendWithVendel(to, body);
}

async function sendWithVendel(to: string, body: string): Promise<SmsSendResult> {
  const apiUrl = (process.env.VENDEL_API_URL || "").replace(/\/$/, "");
  const apiKey = process.env.VENDEL_API_KEY || "";
  if (!apiUrl || !apiKey) return { success: false, provider: "vendel", error: "Vendel is not configured" };

  try {
    const response = await fetch(`${apiUrl}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({ recipients: [to], body }),
    });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, provider: "vendel", error: payload.error || payload.message || `Vendel HTTP ${response.status}` };
    }
    const messageId = Array.isArray(payload.message_ids) ? payload.message_ids[0] : payload.messageId || payload.id || payload.batch_id;
    return { success: true, provider: "vendel", messageId: messageId ? String(messageId) : undefined, status: payload.status || "sent" };
  } catch (error) {
    return { success: false, provider: "vendel", error: error instanceof Error ? error.message : "Vendel send failed" };
  }
}

async function sendWithTextBee(to: string, body: string): Promise<SmsSendResult> {
  const apiUrl = (process.env.TEXTBEE_API_URL || "").replace(/\/$/, "");
  const apiKey = process.env.TEXTBEE_API_KEY || "";
  const deviceId = process.env.TEXTBEE_DEVICE_ID || "";
  if (!apiUrl || !apiKey || !deviceId) return { success: false, provider: "textbee", error: "TextBee is not configured" };

  try {
    const response = await fetch(`${apiUrl}/api/v1/gateway/devices/${deviceId}/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ recipients: [to], message: body }),
    });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, provider: "textbee", error: payload.error || payload.message || `TextBee HTTP ${response.status}` };
    }
    const messageId = Array.isArray(payload.message_ids) ? payload.message_ids[0] : payload.messageId || payload.id;
    return { success: true, provider: "textbee", messageId: messageId ? String(messageId) : undefined, status: payload.status || "sent" };
  } catch (error) {
    return { success: false, provider: "textbee", error: error instanceof Error ? error.message : "TextBee send failed" };
  }
}

async function sendSMS(to: string, body: string, metadata: Record<string, unknown>) {
  const phone = normalizePhone(to);
  const primary = configuredProvider(process.env.SMS_PROVIDER, "vendel");
  const fallback = process.env.SMS_FALLBACK_PROVIDER ? configuredProvider(process.env.SMS_FALLBACK_PROVIDER, "textbee") : null;

  if (!phone) return;

  let result = await sendWithProvider(primary, phone, body);
  if (!result.success && fallback && fallback !== primary) {
    result = await sendWithProvider(fallback, phone, body);
  }

  await getSupabaseAdmin().from("sms_messages").insert({
    recipient_phone: phone,
    body,
    provider: result.provider,
    provider_message_id: result.messageId || null,
    status: result.success ? "sent" : "failed",
    error_message: result.error || null,
    related_resource_type: typeof metadata.type === "string" ? metadata.type : null,
    sent_at: result.success ? new Date().toISOString() : null,
    failed_at: result.success ? null : new Date().toISOString(),
  }).catch(() => {});

  await getSupabaseAdmin().from("audit_logs").insert({
    action: result.success ? "sms_sent" : "sms_failed",
    metadata: {
      ...metadata,
      provider: result.provider,
      provider_message_id: result.messageId,
      error: result.error,
      to_masked: maskPhone(phone),
      body_preview: body.slice(0, 80),
    },
  }).catch(() => {});
}

export async function sendStatusSMS(params: { to: string; message: string }): Promise<void> {
  await sendSMS(params.to, `Divine Financial Group: ${params.message}`, { type: "status_sms" });
}

export async function sendMissingDocumentSMS(params: { to: string; service: string; uploadLink: string }): Promise<void> {
  await sendSMS(params.to, `DFG: Your ${params.service} needs more docs. Upload: ${params.uploadLink} (48hr)`, { type: "missing_docs_sms", service: params.service });
}

export async function sendComplianceAlertSMS(params: { to: string; businessName: string; alertType: string; daysUntilDue: number }): Promise<void> {
  await sendSMS(params.to, `DFG: ${params.businessName} - ${params.alertType} due in ${params.daysUntilDue} days. Call (302) 322-5515.`, { type: "compliance_sms", businessName: params.businessName });
}
