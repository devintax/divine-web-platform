import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendSms } from "@/lib/sms";
import type { DograhTool } from "./dograh";

export const DFG_VOICE_TOOLS: DograhTool[] = [
  {
    type: "function",
    function: {
      name: "lookup_client",
      description: "Look up a client by phone number and return their active DFG cases.",
      parameters: {
        type: "object",
        properties: {
          phone_number: { type: "string", description: "Caller phone number in E.164 format" },
        },
        required: ["phone_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_case_status",
      description: "Get status and progress for an existing client's service cases.",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string" },
          service_type: { type: "string", enum: ["tax", "formation", "insurance", "notary", "bookkeeping"] },
        },
        required: ["client_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_callback",
      description: "Record a callback request and text the caller a confirmation.",
      parameters: {
        type: "object",
        properties: {
          caller_name: { type: "string" },
          caller_phone: { type: "string" },
          reason: { type: "string" },
          preferred_time: { type: "string" },
          service_type: { type: "string" },
        },
        required: ["caller_name", "caller_phone", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_voice_intake",
      description: "Record a new lead or service request collected over the phone.",
      parameters: {
        type: "object",
        properties: {
          caller_name: { type: "string" },
          caller_phone: { type: "string" },
          caller_email: { type: "string" },
          service_type: { type: "string", enum: ["tax", "formation", "insurance", "notary", "bookkeeping"] },
          intake_summary: { type: "string" },
        },
        required: ["caller_name", "caller_phone", "service_type", "intake_summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_info_sms",
      description: "Text the caller DFG service information and optionally the portal link.",
      parameters: {
        type: "object",
        properties: {
          phone_number: { type: "string" },
          service_type: { type: "string" },
          include_portal_link: { type: "boolean" },
        },
        required: ["phone_number"],
      },
    },
  },
];

export async function handleVoiceToolCall(params: {
  toolName: string;
  toolArgs: Record<string, any>;
  callId: string;
}): Promise<{ result: string }> {
  const { toolName, toolArgs, callId } = params;
  const admin = getSupabaseAdmin();

  if (toolName === "lookup_client") {
    const digits = lastTen(toolArgs.phone_number);
    const { data: clients } = await admin
      .from("user_profiles")
      .select("id,legal_name,email,phone,role")
      .ilike("phone", `%${digits}%`)
      .limit(1);
    const client = clients?.[0];
    if (!client) return result({ found: false, message: "No account found for this phone number." });

    const { data: enrollments } = await admin
      .from("service_enrollments")
      .select("service_type,status,progress,priority,sla_deadline")
      .eq("user_id", client.id)
      .in("status", ["pending", "active", "review"]);

    return result({
      found: true,
      client_id: client.id,
      name: client.legal_name,
      email: client.email,
      open_cases: enrollments || [],
    });
  }

  if (toolName === "get_case_status") {
    let query = admin
      .from("service_enrollments")
      .select("service_type,status,progress,priority,sla_deadline")
      .eq("user_id", String(toolArgs.client_id || ""))
      .in("status", ["pending", "active", "review"]);
    if (toolArgs.service_type) query = query.eq("service_type", String(toolArgs.service_type));
    const { data: cases } = await query.order("created_at", { ascending: false });
    return result(cases?.length ? cases : { message: "No active cases found." });
  }

  if (toolName === "schedule_callback") {
    const summary = `Callback requested: ${toolArgs.reason || "No reason provided"}. Preferred time: ${toolArgs.preferred_time || "not specified"}`;
    await insertCallLog({
      caller_name: toolArgs.caller_name,
      caller_phone: toolArgs.caller_phone,
      intent: toolArgs.service_type || "callback_request",
      summary,
      call_source: "ai_voice_agent",
      dograh_call_id: callId,
    });
    await sendSms(
      String(toolArgs.caller_phone || ""),
      `Hi ${toolArgs.caller_name || "there"}, a DFG specialist will call you back ${toolArgs.preferred_time ? `around ${toolArgs.preferred_time}` : "shortly"}. Questions? Call (302) 322-5515.`,
      { relatedResourceType: "call_log", bypassPreferences: true },
    ).catch(console.error);
    return result({ success: true, message: "Callback recorded and confirmation text sent." });
  }

  if (toolName === "create_voice_intake") {
    await insertCallLog({
      caller_name: toolArgs.caller_name,
      caller_phone: toolArgs.caller_phone,
      intent: toolArgs.service_type || "general",
      summary: toolArgs.intake_summary || "Voice intake captured.",
      full_transcript: JSON.stringify(toolArgs),
      call_source: "ai_voice_agent",
      dograh_call_id: callId,
    });
    await sendSms(
      String(toolArgs.caller_phone || ""),
      `Thank you for calling Divine Financial Group. To continue your ${toolArgs.service_type || "service"} request, visit ${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"} or call (302) 322-5515.`,
      { relatedResourceType: "call_log", bypassPreferences: true },
    ).catch(console.error);
    return result({ success: true, message: "Voice intake recorded and portal link sent." });
  }

  if (toolName === "send_info_sms") {
    const serviceInfo: Record<string, string> = {
      tax: "tax preparation",
      formation: "business formation",
      insurance: "auto insurance",
      notary: "notary services",
      bookkeeping: "bookkeeping",
    };
    const service = serviceInfo[String(toolArgs.service_type || "")] || "tax preparation, business formation, auto insurance, notary services, and bookkeeping";
    const portal = toolArgs.include_portal_link ? ` Start here: ${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"}` : "";
    await sendSms(
      String(toolArgs.phone_number || ""),
      `Divine Financial Group helps with ${service}. Call (302) 322-5515 or visit 622 E. Basin Rd, New Castle DE.${portal}`,
      { relatedResourceType: "call_log", bypassPreferences: true },
    ).catch(console.error);
    return result({ success: true, message: "SMS sent." });
  }

  return result({ error: `Unknown tool: ${toolName}` });
}

async function insertCallLog(row: Record<string, unknown>) {
  const { error } = await getSupabaseAdmin().from("call_logs").insert(row);
  if (error) console.warn("[voice tools] call log insert failed", error.message);
}

function result(value: unknown) {
  return { result: JSON.stringify(value) };
}

function lastTen(phone: string) {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}
