import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("notification_reads").select("notification_id").eq("staff_id", session.profileId);
  if (error) return NextResponse.json({ readIds: [], error: "Notification reads are not ready" });
  return NextResponse.json({ readIds: (data || []).map((row: any) => row.notification_id) });
}

export async function POST(req: NextRequest) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { notificationIds } = await req.json().catch(() => ({}));
  const ids = (Array.isArray(notificationIds) ? notificationIds : [notificationIds]).filter(Boolean);
  if (!ids.length) return NextResponse.json({ ok: true });

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("notification_reads")
    .upsert(
      ids.map((notificationId: string) => ({ staff_id: session.profileId, notification_id: notificationId })),
      { onConflict: "staff_id,notification_id", ignoreDuplicates: true },
    );
  if (error) return NextResponse.json({ error: "Could not mark notifications read" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
