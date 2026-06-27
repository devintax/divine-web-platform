import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { can } from "@/lib/rbac/can";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await verifyStaff();
  if (!session || !can(session.role, "view_any_chat_history")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim();
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 25)));

  const admin = getSupabaseAdmin();
  let query = admin
    .from("call_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (search) query = query.or(`caller_name.ilike.%${search}%,caller_phone.ilike.%${search}%,intent.ilike.%${search}%,summary.ilike.%${search}%`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ callLogs: [], totalCount: 0, error: "Call logs are not ready" });
  return NextResponse.json({ callLogs: data || [], totalCount: count || 0, page, totalPages: Math.ceil((count || 0) / limit) });
}

export async function POST(req: NextRequest) {
  const session = await verifyStaff();
  if (!session || !can(session.role, "join_any_live_chat")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("call_logs")
    .insert({
      caller_name: String(body.callerName || body.caller_name || "Voice Caller"),
      caller_phone: String(body.callerPhone || body.caller_phone || ""),
      intent: String(body.intent || "general"),
      summary: String(body.summary || ""),
      full_transcript: String(body.fullTranscript || body.full_transcript || ""),
      duration_seconds: Number(body.durationSeconds || body.duration_seconds || 0),
      call_source: String(body.callSource || body.call_source || "web"),
      handled_by: session.profileId,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "Could not save call log" }, { status: 500 });
  await writeAuditLog({
    staffId: session.profileId,
    action: "call_log_created",
    resourceType: "call_log",
    resourceId: data?.id,
    eventCategory: "admin",
  });
  return NextResponse.json({ ok: true, id: data?.id }, { status: 201 });
}
