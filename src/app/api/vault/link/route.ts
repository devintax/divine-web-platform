import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Staff only" }, { status: 403 });
  const { recipientEmail, expiresIn, targetUserId, purpose } = await req.json();
  const hoursMap: Record<string, number> = { "24h": 24, "48h": 48, "7 days": 168 };
  const hours = hoursMap[expiresIn] || 48;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("upload_links").insert({
    created_by: session.profileId,
    client_user_id: targetUserId || null,
    recipient_email: recipientEmail || null,
    purpose: purpose || "Document upload",
    expires_at: expiresAt,
    is_active: true,
  }).select("token").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({ action: "upload_link_created", userId: targetUserId, staffId: session.profileId, resourceType: "upload_link", resourceId: data.token, metadata: { recipient_email: recipientEmail, expires_in: expiresIn } });
  return NextResponse.json({ success: true, token: data.token, expiresAt, url: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/upload/${data.token}` });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("upload_links").select("*").eq("token", token).eq("is_active", true).single();
  if (error || !data) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (data.expires_at && new Date(data.expires_at) < new Date()) return NextResponse.json({ error: "Link expired" }, { status: 410 });
  return NextResponse.json({ valid: true, recipientEmail: data.recipient_email, purpose: data.purpose });
}
