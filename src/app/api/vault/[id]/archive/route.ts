import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";
import { can } from "@/lib/rbac/can";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const archive = body.archive !== false;

  const admin = getSupabaseAdmin();
  const { data: doc } = await admin.from("vault_documents").select("id,user_id,display_name,file_name,status").eq("id", id).eq("is_deleted", false).single();
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const ownsDocument = doc.user_id === session.profileId;
  const staffCanArchive = archive ? can(session.role, "vault_soft_delete") : can(session.role, "vault_restore_deleted");
  if (!ownsDocument && !staffCanArchive) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!archive && !staffCanArchive && !ownsDocument) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const nextStatus = archive ? "archived" : "clean";
  const { data: updated, error } = await admin.from("vault_documents").update({ status: nextStatus }).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: "Could not update document archive state" }, { status: 500 });

  await logAudit({
    action: archive ? "vault_document_archived" : "vault_document_unarchived",
    userId: doc.user_id,
    staffId: ownsDocument ? null : session.profileId,
    resourceType: "vault_document",
    resourceId: id,
    eventCategory: "vault",
    metadata: { display_name: doc.display_name || doc.file_name, previous_status: doc.status, next_status: nextStatus },
  });

  return NextResponse.json({ success: true, document: updated });
}
