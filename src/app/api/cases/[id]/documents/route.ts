import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { canAccessServiceDesk, isServiceType } from "@/lib/service-workflow";
import { startWorkflow, TASK_QUEUES } from "@/lib/temporal";

const SCAN_STATUSES = new Set(["quarantine", "uploaded"]);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { data: enrollment } = await admin.from("service_enrollments").select("*").eq("id", id).single();
  if (!enrollment || !isServiceType(enrollment.service_type)) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }
  const isClientOwner = session.role === "client" && enrollment.user_id === session.profileId;
  const isDeskStaff = session.role !== "client" && canAccessServiceDesk(session.role, enrollment.service_type);
  if (!isClientOwner && !isDeskStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [linked, serviceScoped] = await Promise.all([
    admin.from("vault_documents").select("*").eq("enrollment_id", id).eq("is_deleted", false).order("created_at", { ascending: false }),
    admin.from("vault_documents").select("*").eq("user_id", enrollment.user_id).eq("category", enrollment.service_type).eq("is_deleted", false).order("created_at", { ascending: false }),
  ]);

  const map = new Map<string, any>();
  for (const row of [...((linked as any).data || []), ...((serviceScoped as any).data || [])]) map.set(row.id, row);
  const documents = [...map.values()].sort((a, b) => Date.parse(b.created_at || "0") - Date.parse(a.created_at || "0"));

  await Promise.all(documents.filter((doc) => SCAN_STATUSES.has(doc.status)).map((doc) => triggerVaultScan(doc, enrollment)));
  return NextResponse.json({ documents });
}

async function triggerVaultScan(doc: any, enrollment: any) {
  try {
    await startWorkflow("documentVaultPipelineWorkflow", TASK_QUEUES.VAULT, `vault-${doc.id}`, [
      { documentId: doc.id, userId: enrollment.user_id, category: enrollment.service_type, displayName: doc.display_name || doc.file_name },
    ]);
  } catch {
    // Existing scan workflows or local Temporal downtime should not block staff document viewing.
  }
}
