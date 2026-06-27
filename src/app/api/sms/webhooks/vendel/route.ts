import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (process.env.VENDEL_WEBHOOK_SECRET) {
    const incoming =
      req.headers.get("x-webhook-secret") ||
      req.headers.get("x-vendel-secret") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (incoming !== process.env.VENDEL_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: true });

  const event = payload.event || payload.type;
  const messageId = String(payload.message_id || payload.messageId || payload.id || "");
  const timestamp = payload.timestamp || payload.created_at || new Date().toISOString();
  const admin = getSupabaseAdmin();

  if (event === "sms_received") {
    await admin.from("sms_messages").insert({
      recipient_phone: payload.to || payload.from || "unknown",
      body: payload.body || payload.message || "",
      provider: "vendel",
      provider_message_id: messageId || null,
      status: "received",
      sent_at: timestamp,
    });
    return NextResponse.json({ ok: true });
  }

  if (!messageId) return NextResponse.json({ ok: true });

  const update: Record<string, unknown> = {};
  if (event === "sms_delivered" || payload.status === "delivered") {
    update.status = "delivered";
    update.delivered_at = timestamp;
  } else if (event === "sms_failed" || payload.status === "failed") {
    update.status = "failed";
    update.failed_at = timestamp;
    update.error_message = payload.error || payload.error_message || "Delivery failed";
  } else if (event === "sms_sent" || payload.status === "sent") {
    update.status = "sent";
    update.sent_at = timestamp;
  }

  if (Object.keys(update).length) {
    await admin.from("sms_messages").update(update).eq("provider", "vendel").eq("provider_message_id", messageId);
  }
  return NextResponse.json({ ok: true });
}
