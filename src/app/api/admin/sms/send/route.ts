import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { logAudit } from "@/lib/audit";
import { sendSms, normalizePhone } from "@/lib/sms";
import type { SmsSendResult } from "@/lib/sms";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await verifyStaff();
    if (!session) return NextResponse.json({ error: "Staff access required" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const to = normalizePhone(String(body.to || "").trim());
    const message = String(body.body || body.message || "").trim().slice(0, 1600);
    if (!to || !message) return NextResponse.json({ error: "Phone number and message body are required" }, { status: 422 });

    const result = await withTimeout(
      sendSms(to, message, { relatedResourceType: "manual", sentBy: session.profileId }),
      30000,
      process.env.SMS_PROVIDER === "vendel" ? "vendel" : "textbee",
    );

    await logAudit({
      staffId: session.profileId,
      action: "sms_sent_manually",
      resourceType: "sms_message",
      resourceId: result.messageId || undefined,
      eventCategory: "system",
      metadata: {
        provider: result.provider,
        success: result.success,
        error: result.error || null,
      },
    }).catch((error) => console.warn("[admin/sms/send] audit log skipped", error));

    if (!result.success) {
      return NextResponse.json({
        error: result.error || "SMS send failed",
        provider: result.provider,
        tip: getSendTip(result.error || ""),
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true, provider: result.provider, messageId: result.messageId });
  } catch (error) {
    console.error("[admin/sms/send] Unhandled error", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal SMS send error",
      tip: "The send route caught an internal error and returned JSON instead of crashing. Check server logs for details.",
    }, { status: 500 });
  }
}

async function withTimeout(promise: Promise<SmsSendResult>, ms: number, provider: SmsSendResult["provider"]): Promise<SmsSendResult> {
  return Promise.race([
    promise,
    new Promise<SmsSendResult>((resolve) => {
      setTimeout(() => resolve({ success: false, provider, error: `SMS send timed out after ${Math.round(ms / 1000)}s` }), ms);
    }),
  ]);
}

function getSendTip(error: string) {
  if (error.includes("401") || error.toLowerCase().includes("authentication required")) {
    return "The provider key is authenticated for some reads but not SMS send. Check gateway API key permissions or regenerate a send-enabled key.";
  }
  if (error.toLowerCase().includes("device") || error.includes("TEXTBEE_DEVICE_ID")) {
    return "TextBee needs TEXTBEE_DEVICE_ID from the TextBee device page/API, and the FOXXD C10 app must register a fresh FCM token.";
  }
  if (error.toLowerCase().includes("fcm")) {
    return "Reinstall/rebuild the TextBee Android app with the confirmed google-services.json so the phone registers a matching FCM token.";
  }
  if (error.toLowerCase().includes("timed out")) {
    return "The SMS gateway did not respond in time. Check provider health and try again.";
  }
  return "Check /portal/admin/sms-status for provider health and configuration details.";
}
