import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { can } from "@/lib/rbac/can";
import { canAccessServiceDesk, isServiceType } from "@/lib/service-workflow";

export async function GET(req: NextRequest) {
  const session = await verifyStaff();
  if (!session || !can(session.role, "view_case_queue")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = req.nextUrl.searchParams.get("service");
  if (service && (!isServiceType(service) || !canAccessServiceDesk(session.role, service))) {
    return NextResponse.json({ error: "Forbidden for this service desk" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  let query = admin
    .from("service_enrollments")
    .select("*")
    .in("status", ["pending", "active", "completed"])
    .order("created_at", { ascending: true })
    .limit(100);
  if (service) query = query.eq("service_type", service);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load cases" }, { status: 500 });

  const rows = (data || []) as any[];
  const caseIds = rows.map((r) => r.id);
  const userIds = [...new Set(rows.flatMap((r) => [r.user_id, r.assigned_staff_id, r.assigned_to]).filter(Boolean))];

  const [profiles, messages, missingDocs, deliverables, checklist] = await Promise.all([
    userIds.length ? admin.from("user_profiles").select("id,legal_name,email,phone,role").in("id", userIds) : Promise.resolve({ data: [] }),
    caseIds.length ? admin.from("case_messages").select("*").in("enrollment_id", caseIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    caseIds.length ? admin.from("missing_documents").select("*").in("enrollment_id", caseIds) : Promise.resolve({ data: [] }),
    caseIds.length ? admin.from("case_deliverables").select("*").in("enrollment_id", caseIds) : Promise.resolve({ data: [] }),
    caseIds.length ? admin.from("case_checklist_items").select("*").in("enrollment_id", caseIds) : Promise.resolve({ data: [] }),
  ]);

  const profileMap = ((profiles as any).data || []).reduce((acc: Record<string, any>, p: any) => {
    acc[p.id] = p;
    return acc;
  }, {});
  const grouped = (list: any[] = []) => list.reduce((acc, row) => {
    (acc[row.enrollment_id] ||= []).push(row);
    return acc;
  }, {} as Record<string, any[]>);

  return NextResponse.json({
    cases: rows.map((row) => ({
      ...row,
      client: profileMap[row.user_id] || null,
      assigned_staff: profileMap[row.assigned_staff_id || row.assigned_to] || null,
      case_messages: grouped((messages as any).data)[row.id] || [],
      missing_documents: grouped((missingDocs as any).data)[row.id] || [],
      case_deliverables: grouped((deliverables as any).data)[row.id] || [],
      case_checklist_items: grouped((checklist as any).data)[row.id] || [],
    })),
  });
}
