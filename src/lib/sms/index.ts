import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { TextBeeProvider } from "./providers/textbee";
import { VendelProvider } from "./providers/vendel";
import type { SmsHealthResult, SmsProvider, SmsProviderName, SmsSendResult } from "./types";

export type { SmsHealthResult, SmsSendResult };

export interface SendSmsOptions {
  relatedResourceType?: string;
  relatedResourceId?: string;
  sentBy?: string;
}

export function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return `+${trimmed.replace(/\D/g, "")}`;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

export async function sendSms(to: string, body: string, options: SendSmsOptions = {}): Promise<SmsSendResult> {
  const phone = normalizePhone(to);
  const primaryName = configuredProviderName(process.env.SMS_PROVIDER || "textbee");
  const fallbackName = process.env.SMS_FALLBACK_PROVIDER ? configuredProviderName(process.env.SMS_FALLBACK_PROVIDER) : "vendel";
  const logProvider = providerName(primaryName) || providerName(fallbackName || "") || "vendel";

  if (!phone) {
    const result: SmsSendResult = { success: false, provider: logProvider, error: "Missing recipient phone number" };
    await logSms(phone, body, result, options);
    return result;
  }

  const primary = buildProvider(primaryName);
  if (!primary) {
    const fallback = fallbackName ? buildProvider(fallbackName) : null;
    if (fallback) {
      const fallbackResult = await fallback.send(phone, body);
      await logSms(phone, body, fallbackResult, options);
      return fallbackResult;
    }
    const result: SmsSendResult = { success: false, provider: logProvider, error: `${primaryName} is not configured` };
    await logSms(phone, body, result, options);
    return result;
  }

  let result = await primary.send(phone, body);
  if (!result.success && fallbackName && fallbackName !== primaryName) {
    const fallback = buildProvider(fallbackName);
    if (fallback) result = await fallback.send(phone, body);
  }

  await logSms(phone, body, result, options);
  return result;
}

export async function checkAllProviders(): Promise<Record<SmsProviderName, SmsHealthResult & { configured: boolean }>> {
  const entries = await Promise.all((["vendel", "textbee"] as SmsProviderName[]).map(async (name) => {
    const provider = buildProvider(name);
    if (!provider) return [name, { configured: false, online: false, detail: "Not configured" }] as const;
    return [name, { configured: true, ...(await provider.checkHealth()) }] as const;
  }));
  return Object.fromEntries(entries) as Record<SmsProviderName, SmsHealthResult & { configured: boolean }>;
}

function configuredProviderName(value: string) {
  return value.toLowerCase().trim();
}

function providerName(value: string): SmsProviderName | null {
  const normalized = configuredProviderName(value);
  if (normalized === "vendel" || normalized === "textbee") return normalized;
  return null;
}

function buildProvider(name: string): SmsProvider | null {
  try {
    if (name === "vendel") return new VendelProvider();
    if (name === "textbee") return new TextBeeProvider();
  } catch {
    return null;
  }
  return null;
}

async function logSms(to: string, body: string, result: SmsSendResult, options: SendSmsOptions) {
  try {
    await getSupabaseAdmin().from("sms_messages").insert({
      recipient_phone: to || "unknown",
      body,
      provider: result.provider,
      provider_message_id: result.messageId || null,
      status: result.success ? "sent" : "failed",
      error_message: result.error || null,
      related_resource_type: options.relatedResourceType || null,
      related_resource_id: options.relatedResourceId || null,
      sent_by: options.sentBy || null,
      sent_at: result.success ? new Date().toISOString() : null,
      failed_at: result.success ? null : new Date().toISOString(),
    });
  } catch (error) {
    console.error("[sms] Failed to log SMS", error);
  }
}
