import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const VALID = ["tax","bookkeeping","formation","insurance","notary"];

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const svc = req.nextUrl.searchParams.get("service");
  let q = admin.from("service_enrollments").select("*").eq("user_id", session.profileId);
  if (svc && VALID.includes(svc)) q = q.eq("service_type", svc);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enrollments: data || [] });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { serviceType, intakeData, step, totalSteps, action } = body;
  if (!VALID.includes(serviceType)) return NextResponse.json({ error: "Invalid service type" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const progress = totalSteps > 0 ? Math.round((step / totalSteps) * 100) : 0;

  const { data: existing } = await admin.from("service_enrollments").select("id").eq("user_id", session.profileId).eq("service_type", serviceType)
    .in("status", ["draft","pending"]).order("created_at", { ascending: false }).limit(1).single();

  if (action === "submit") {
    let enrollmentId: string | undefined;
    if (existing) {
      await admin.from("service_enrollments").update({ status: "pending", progress: 100, intake_data: intakeData, updated_at: new Date().toISOString() }).eq("id", existing.id);
      enrollmentId = existing.id;
    } else {
      const { data: newEnr } = await admin.from("service_enrollments").insert({ user_id: session.profileId, service_type: serviceType, status: "pending", progress: 100, intake_data: intakeData }).select("id").single();
      enrollmentId = newEnr?.id;
    }
    return NextResponse.json({ success: true, status: "submitted", enrollmentId, enrollment: { id: enrollmentId } });
  }

  if (existing) await admin.from("service_enrollments").update({ progress, intake_data: intakeData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("service_enrollments").insert({ user_id: session.profileId, service_type: serviceType, status: "draft", progress, intake_data: intakeData });

  return NextResponse.json({ success: true, status: "draft_saved" });
}
