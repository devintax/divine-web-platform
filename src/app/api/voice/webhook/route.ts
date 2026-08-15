import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { writeAuditLog } from "@/lib/audit";
import { generateText } from "@/lib/ai/dfg-ai";
import { sendSms } from "@/lib/sms";
import { handleVoiceToolCall } from "@/lib/voice/dfg-tools";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-dograh-secret") || req.headers.get("x-webhook-secret");
  if (process.env.DOGRAH_WEBHOOK_SECRET && secret !== process.env.DOGRAH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: true });

  const event = String(payload.event || payload.type || "");
  const call = payload.call || payload.data?.call || payload.data || {};
  const callId = String(call.id || payload.call_id || payload.id || "");

  if (event === "tool.call" || event === "tool_call") {
    const toolCall = payload.tool_call || payload.toolCall || {};
    const fn = toolCall.function || {};
    const args = typeof fn.arguments === "string" ? safeJson(fn.arguments) : fn.arguments || toolCall.arguments || {};
    const result = await handleVoiceToolCall({
      toolName: String(fn.name || toolCall.name || ""),
      toolArgs: args,
      callId,
    });
    return NextResponse.json({ tool_call_id: toolCall.id, result: result.result });
  }

  if (event === "call.started" || event === "call_started") {
    await upsertCallLog({
      dograh_call_id: callId,
      caller_phone: call.from || call.caller_phone || "",
      caller_name: call.metadata?.caller_name || "Incoming Call",
      intent: call.metadata?.intent || "inbound",
      call_source: call.agent_id ? "ai_voice_agent" : "inbound",
      duration_seconds: 0,
      summary: "Call in progress...",
    });
    return NextResponse.json({ ok: true });
  }

  if (event === "call.ended" || event === "call_ended" || event === "call.completed") {
    const transcript = String(payload.transcript || call.transcript || "");
    let summary = String(call.summary || payload.summary || "");
    if (!summary && transcript) {
      const ai = await generateText({
        systemPrompt: "Summarize this Divine Financial Group phone call in 2-3 factual sentences for staff. Include follow-up needed if present.",
        userMessage: transcript.slice(0, 3000),
        maxTokens: 140,
        temperature: 0.2,
      });
      summary = ai.text || "Call completed.";
    }

    const { data } = await upsertCallLog({
      dograh_call_id: callId,
      caller_phone: call.from || call.caller_phone || "",
      caller_name: call.metadata?.caller_name || payload.caller_name || "Unknown Caller",
      intent: call.metadata?.intent || payload.intent || "inbound",
      summary: summary || "Call completed.",
      full_transcript: transcript,
      duration_seconds: Number(call.duration || call.duration_seconds || 0),
      recording_url: call.recording_url || payload.recording_url || null,
      call_source: call.agent_id ? "ai_voice_agent" : "inbound",
      ended_reason: call.ended_reason || payload.ended_reason || null,
    });

    await writeAuditLog({
      action: "voice_call_completed",
      resourceType: "call_log",
      resourceId: data?.id,
      eventCategory: "system",
      metadata: {
        dograhCallId: callId,
        duration: call.duration || call.duration_seconds || 0,
        endedReason: call.ended_reason || payload.ended_reason,
        hasRecording: Boolean(call.recording_url || payload.recording_url),
      },
    });

    if ((call.ended_reason || payload.ended_reason) === "transfer_requested" && call.from) {
      await sendSms(
        call.from,
        "Thank you for calling Divine Financial Group. A specialist will follow up shortly. Questions? Call (302) 322-5515.",
        { relatedResourceType: "call_log", relatedResourceId: data?.id, bypassPreferences: true },
      ).catch(console.error);
    }
  }

  return NextResponse.json({ ok: true });
}

async function upsertCallLog(row: Record<string, unknown>) {
  const admin = getSupabaseAdmin();
  const withDograh = Boolean(row.dograh_call_id);
  if (withDograh) {
    const result = await admin.from("call_logs").upsert(row, { onConflict: "dograh_call_id" }).select("id").single();
    if (!result.error) return result;
    console.warn("[dograh webhook] upsert failed", result.error.message);
  }
  return admin.from("call_logs").insert(row).select("id").single();
}

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
