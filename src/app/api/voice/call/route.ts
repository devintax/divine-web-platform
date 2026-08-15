import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { writeAuditLog } from "@/lib/audit";
import { normalizePhone } from "@/lib/sms";
import { makeOutboundCall } from "@/lib/voice/dograh";

export async function POST(req: NextRequest) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Staff only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const to = normalizePhone(String(body.to || ""));
  if (!to) return NextResponse.json({ error: "Phone number required" }, { status: 400 });
  const agentId = String(process.env.DOGRAH_AGENT_ID || "").trim();
  const triggerNodeId = String(process.env.DOGRAH_TRIGGER_NODE_ID || process.env.DOGRAH_TRIGGER_PATH || "").trim();
  if (!agentId) {
    return NextResponse.json(
      {
        error: "Dograh AI agent is not configured yet.",
        setupRequired: true,
        detail: "Run npm run voice:setup, add the printed DOGRAH_AGENT_ID to .env.local, then restart Next.js.",
      },
      { status: 409 },
    );
  }
  if (!triggerNodeId) {
    return NextResponse.json(
      {
        error: "Dograh API Trigger is not configured yet.",
        setupRequired: true,
        detail: "Add an API Trigger node in Dograh, set DOGRAH_TRIGGER_NODE_ID to its trigger path, then restart Next.js.",
      },
      { status: 409 },
    );
  }

  try {
    const call = await makeOutboundCall({
      to,
      agentId,
      staffId: session.profileId,
      metadata: { initiated_from: "dfg_admin_voice_console", use_ai_agent: Boolean(body.useAiAgent) },
    });

    const { data } = await getSupabaseAdmin()
      .from("call_logs")
      .insert({
        dograh_call_id: call.id,
        caller_phone: to,
        caller_name: body.callerName || "Outbound Call",
        intent: body.intent || "outbound",
        summary: "Outbound call initiated from staff console.",
      call_source: body.useAiAgent ? "ai_voice_agent" : "outbound",
        handled_by: session.profileId,
      })
      .select("id")
      .single();

    await writeAuditLog({
      staffId: session.profileId,
      action: "outbound_voice_call_started",
      resourceType: "call_log",
      resourceId: data?.id,
      eventCategory: "admin",
      metadata: { dograhCallId: call.id, to, useAiAgent: Boolean(body.useAiAgent) },
    });

    return NextResponse.json({ callId: call.id, status: call.status || "queued" });
  } catch (error: any) {
    const message = String(error?.message || "Could not start outbound call");
    const setupRequired = message.includes("DOGRAH_AGENT_ID") || message.includes("DOGRAH_TRIGGER");
    const telephonyMissing = /telephony|provider|configuration|outbound/i.test(message);
    const providerRestricted = /non-verified numbers|D60|account level|upgrade their account/i.test(message);
    return NextResponse.json(
      {
        error: setupRequired
          ? "Dograh voice setup is incomplete."
          : providerRestricted
            ? "Telnyx blocked the outbound call."
          : telephonyMissing
            ? "Dograh telephony is not configured yet."
            : message,
        setupRequired,
        telephonyMissing,
        providerRestricted,
        detail: setupRequired
          ? "Set DOGRAH_AGENT_ID and DOGRAH_TRIGGER_NODE_ID in .env.local, then restart Next.js."
          : providerRestricted
            ? "Telnyx returned D60: this account cannot call non-verified destination numbers at its current account level. Verify the destination number in Telnyx or upgrade/remove the outbound trial restriction."
          : telephonyMissing
            ? "The voice agent exists, but Dograh needs an outbound telephony provider and default outbound number before real phone calls can be placed."
            : undefined,
      },
      { status: setupRequired ? 409 : providerRestricted ? 424 : telephonyMissing ? 424 : 502 },
    );
  }
}
