import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { loadCaseBundle, canReadCase } from "@/lib/case-records";
import { sendSms } from "@/lib/sms";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const bundle = await loadCaseBundle(id);
  if (!bundle || !canReadCase(bundle, session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const message = String(body.message || "").trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const senderType = session.role === "client" ? "client" : "staff";
  const isInternal = senderType === "staff" && !!body.isInternal;
  const { data, error } = await getSupabaseAdmin().from("case_messages").insert({
    enrollment_id: id,
    sender_id: session.profileId,
    sender_type: senderType,
    message,
    is_internal: isInternal,
    read_by_client: senderType === "client" || isInternal,
    read_by_staff: senderType === "staff",
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await getSupabaseAdmin().from("service_enrollments").update({
    updated_at: new Date().toISOString(),
    client_message: isInternal ? bundle.enrollment.client_message : message,
  }).eq("id", id);

  if (senderType === "staff" && !isInternal && bundle.client?.phone) {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: recentSms } = await getSupabaseAdmin()
      .from("sms_messages")
      .select("id")
      .eq("related_resource_type", "case_message")
      .eq("related_resource_id", id)
      .gte("created_at", cutoff)
      .limit(1);

    if (!recentSms?.length) {
      await sendSms(
        bundle.client.phone,
        `Hi ${bundle.client.legal_name || "there"}! Your Divine Financial Group specialist sent you a message. View it at ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/portal/orders. Questions? Call (302) 322-5515.`,
        { relatedResourceType: "case_message", relatedResourceId: id, sentBy: session.profileId },
      );
    }
  }

  return NextResponse.json({ success: true, message: data });
}
