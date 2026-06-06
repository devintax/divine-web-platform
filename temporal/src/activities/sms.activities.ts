import { getSupabaseAdmin } from "../lib/insforge";

// Twilio is loaded lazily so missing credentials don't crash the worker.
async function getTwilio() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  try {
    const twilio = (await import("twilio")).default;
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (e) {
    console.warn("[SMS] twilio not installed, SMS disabled:", (e as any)?.message);
    return null;
  }
}

async function sendSMS(to: string, body: string, metadata: Record<string, unknown>) {
  if (!to) return;
  const client = await getTwilio();
  if (client && process.env.TWILIO_PHONE_NUMBER) {
    try {
      await client.messages.create({ body, from: process.env.TWILIO_PHONE_NUMBER, to });
    } catch (e) {
      console.warn("[SMS] send failed:", (e as any)?.message);
    }
  } else {
    console.log("[SMS stub]", to, "—", body);
  }
  await getSupabaseAdmin().from("audit_logs").insert({
    action: "sms_sent",
    metadata: { ...metadata, to_masked: to.replace(/.(?=.{4})/g, "*"), body_preview: body.slice(0, 80) },
  }).catch(() => {});
}

export async function sendStatusSMS(params: { to: string; message: string }): Promise<void> {
  await sendSMS(params.to, `Divine Financial Group: ${params.message}`, { type: "status_sms" });
}

export async function sendMissingDocumentSMS(params: { to: string; service: string; uploadLink: string }): Promise<void> {
  await sendSMS(params.to, `DFG: Your ${params.service} needs more docs. Upload: ${params.uploadLink} (48hr)`, { type: "missing_docs_sms", service: params.service });
}

export async function sendComplianceAlertSMS(params: { to: string; businessName: string; alertType: string; daysUntilDue: number }): Promise<void> {
  await sendSMS(params.to, `DFG: ${params.businessName} — ${params.alertType} due in ${params.daysUntilDue} days. Call (302) 322-5515.`, { type: "compliance_sms", businessName: params.businessName });
}
