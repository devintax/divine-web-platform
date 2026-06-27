import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isServiceType, priorityForService, SERVICE_WORKFLOW } from "@/lib/service-workflow";

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

  const enrollments = (data || []) as any[];
  const ids = enrollments.map((e) => e.id);
  const assignedIds = [...new Set(enrollments.map((e) => e.assigned_staff_id || e.assigned_to).filter(Boolean))];
  const [messages, deliverables, missingDocs, checklist, staffProfiles] = await Promise.all([
    ids.length ? admin.from("case_messages").select("*").in("enrollment_id", ids).eq("is_internal", false).order("created_at", { ascending: true }) : Promise.resolve({ data: [] }),
    ids.length ? admin.from("case_deliverables").select("*").in("enrollment_id", ids).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ids.length ? admin.from("missing_documents").select("*").in("enrollment_id", ids).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ids.length ? admin.from("case_checklist_items").select("*").in("enrollment_id", ids).eq("visible_to_client", true).order("display_order", { ascending: true }) : Promise.resolve({ data: [] }),
    assignedIds.length ? admin.from("user_profiles").select("id,legal_name,email").in("id", assignedIds) : Promise.resolve({ data: [] }),
  ]);
  const byEnrollment = (rows: any[] = []) => rows.reduce((acc, row) => {
    (acc[row.enrollment_id] ||= []).push(row);
    return acc;
  }, {} as Record<string, any[]>);
  const missingRows = ((missingDocs as any).data || []) as any[];
  const uploadLinkIds = [...new Set(missingRows.map((row) => row.upload_link_id).filter(Boolean))];
  const { data: uploadLinks } = uploadLinkIds.length
    ? await admin.from("upload_links").select("id,token,expires_at,is_active").in("id", uploadLinkIds)
    : { data: [] };
  const uploadLinkMap = ((uploadLinks as any[]) || []).reduce((acc: Record<string, any>, row: any) => {
    acc[row.id] = row;
    return acc;
  }, {});
  const missingWithLinks = missingRows.map((row) => ({ ...row, upload_link: row.upload_link_id ? uploadLinkMap[row.upload_link_id] || null : null }));
  const staffMap = ((staffProfiles as any).data || []).reduce((acc: Record<string, any>, row: any) => {
    acc[row.id] = row;
    return acc;
  }, {});

  return NextResponse.json({
    enrollments: enrollments.map((e) => ({
      ...e,
      case_messages: byEnrollment((messages as any).data)[e.id] || [],
      case_deliverables: byEnrollment((deliverables as any).data)[e.id] || [],
      missing_documents: byEnrollment(missingWithLinks)[e.id] || [],
      case_checklist_items: byEnrollment((checklist as any).data)[e.id] || [],
      assigned_staff: staffMap[e.assigned_staff_id || e.assigned_to] || null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { serviceType, intakeData, step, totalSteps, action } = body;
  if (!isServiceType(serviceType)) return NextResponse.json({ error: "Invalid service type" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const progress = totalSteps > 0 ? Math.round((step / totalSteps) * 100) : 0;

  const { data: existing } = await admin.from("service_enrollments").select("id").eq("user_id", session.profileId).eq("service_type", serviceType)
    .in("status", ["draft","pending"]).order("created_at", { ascending: false }).limit(1).single();

  if (action === "submit") {
    let enrollmentId: string | undefined;
    const workflow = SERVICE_WORKFLOW[serviceType];
    const submitted = {
      status: "pending",
      progress: 10,
      current_step: 1,
      intake_data: intakeData,
      pod: workflow.pod,
      priority: priorityForService(serviceType, intakeData),
      client_message: "Your request is under review. A specialist will update this case shortly.",
      sla_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      await admin.from("service_enrollments").update(submitted).eq("id", existing.id);
      enrollmentId = existing.id;
    } else {
      const { data: newEnr } = await admin.from("service_enrollments").insert({ user_id: session.profileId, service_type: serviceType, ...submitted }).select("id").single();
      enrollmentId = newEnr?.id;
    }
    if (enrollmentId) await ensureCaseLifecycle(enrollmentId, serviceType, session.profileId);
    return NextResponse.json({ success: true, status: "submitted", enrollmentId, enrollment: { id: enrollmentId } });
  }

  if (existing) await admin.from("service_enrollments").update({ progress, intake_data: intakeData, updated_at: new Date().toISOString() }).eq("id", existing.id);
  else await admin.from("service_enrollments").insert({ user_id: session.profileId, service_type: serviceType, status: "draft", progress, intake_data: intakeData });

  return NextResponse.json({ success: true, status: "draft_saved" });
}

async function ensureCaseLifecycle(enrollmentId: string, serviceType: keyof typeof SERVICE_WORKFLOW, userId: string) {
  const admin = getSupabaseAdmin();
  const { data: existingItems } = await admin.from("case_checklist_items").select("id").eq("enrollment_id", enrollmentId).limit(1);
  if (!existingItems?.length) {
    await admin.from("case_checklist_items").insert(
      SERVICE_WORKFLOW[serviceType].checklist.map((item, index) => ({
        enrollment_id: enrollmentId,
        label: item.label,
        display_order: index + 1,
        visible_to_client: item.clientVisible !== false,
      })),
    );
  }
  const { data: existingMessages } = await admin.from("case_messages").select("id").eq("enrollment_id", enrollmentId).eq("sender_type", "system").limit(1);
  if (!existingMessages?.length) {
    await admin.from("case_messages").insert({
      enrollment_id: enrollmentId,
      sender_id: userId,
      sender_type: "system",
      message: `${SERVICE_WORKFLOW[serviceType].label} intake received and routed to ${SERVICE_WORKFLOW[serviceType].pod}.`,
      read_by_client: false,
      read_by_staff: false,
    });
  }
}
