import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type CaseBundle = {
  enrollment: any;
  client: any | null;
  assignedStaff: any | null;
  messages: any[];
  missingDocuments: any[];
  deliverables: any[];
  checklist: any[];
  documents: any[];
};

export async function loadCaseBundle(enrollmentId: string): Promise<CaseBundle | null> {
  const admin = getSupabaseAdmin();
  const { data: enrollment } = await admin.from("service_enrollments").select("*").eq("id", enrollmentId).single();
  if (!enrollment) return null;

  const staffId = (enrollment as any).assigned_staff_id || (enrollment as any).assigned_to;
  const [client, assignedStaff, messages, missingDocuments, deliverables, checklist, linkedDocuments, serviceDocuments] = await Promise.all([
    admin.from("user_profiles").select("id,legal_name,email,phone,role").eq("id", (enrollment as any).user_id).single(),
    staffId ? admin.from("user_profiles").select("id,legal_name,email,role").eq("id", staffId).single() : Promise.resolve({ data: null }),
    admin.from("case_messages").select("*").eq("enrollment_id", enrollmentId).order("created_at", { ascending: true }),
    admin.from("missing_documents").select("*").eq("enrollment_id", enrollmentId).order("created_at", { ascending: false }),
    admin.from("case_deliverables").select("*").eq("enrollment_id", enrollmentId).order("created_at", { ascending: false }),
    admin.from("case_checklist_items").select("*").eq("enrollment_id", enrollmentId).order("display_order", { ascending: true }),
    admin.from("vault_documents").select("*").eq("enrollment_id", enrollmentId).eq("is_deleted", false).order("created_at", { ascending: false }),
    admin.from("vault_documents").select("*").eq("user_id", (enrollment as any).user_id).eq("category", (enrollment as any).service_type).eq("is_deleted", false).order("created_at", { ascending: false }),
  ]);
  const documentMap = new Map<string, any>();
  for (const doc of [...(((linkedDocuments as any).data || [])), ...(((serviceDocuments as any).data || []))]) {
    documentMap.set(doc.id, doc);
  }

  return {
    enrollment,
    client: (client as any).data || null,
    assignedStaff: (assignedStaff as any).data || null,
    messages: (messages as any).data || [],
    missingDocuments: (missingDocuments as any).data || [],
    deliverables: (deliverables as any).data || [],
    checklist: (checklist as any).data || [],
    documents: [...documentMap.values()].sort((a, b) => Date.parse(b.created_at || "0") - Date.parse(a.created_at || "0")),
  };
}

export function canReadCase(bundle: CaseBundle, session: { profileId: string; role: string }) {
  return session.role !== "client" || bundle.enrollment.user_id === session.profileId;
}

export function publicCaseBundle(bundle: CaseBundle, includeInternal: boolean) {
  return {
    ...bundle,
    messages: includeInternal ? bundle.messages : bundle.messages.filter((m) => !m.is_internal),
    checklist: includeInternal ? bundle.checklist : bundle.checklist.filter((i) => i.visible_to_client),
  };
}
