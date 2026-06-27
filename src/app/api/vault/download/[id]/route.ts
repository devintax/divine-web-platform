import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { can } from "@/lib/rbac/can";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = getSupabaseAdmin();
  const { data: doc, error } = await admin.from("vault_documents").select("*").eq("id", id).eq("is_deleted", false).single();
  if (error || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const ownsDocument = doc.user_id === session.profileId;
  if (!ownsDocument && !can(session.role, "vault_download_file")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (doc.status !== "clean" && doc.status !== "archived") {
    return NextResponse.json({ error: "Document is not cleared for download" }, { status: 409 });
  }

  const bucket = doc.storage_bucket || "dfg-vault";
  const key = doc.storage_key || doc.storage_path || doc.file_name;
  if (!key) return NextResponse.json({ error: "Document storage key missing" }, { status: 500 });

  const { data: blob, error: downloadError } = await admin.storage.from(bucket).download(key);
  if (downloadError || !blob) return NextResponse.json({ error: "Document file unavailable" }, { status: 404 });

  const fileName = safeFileName(doc.display_name || doc.file_name || "document");
  return new NextResponse(blob.stream(), {
    headers: {
      "Content-Type": doc.mime_type || blob.type || "application/octet-stream",
      "Content-Length": String(doc.file_size || blob.size || ""),
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function safeFileName(value: string) {
  return value.replace(/[\r\n"]/g, "").replace(/[\\/:*?<>|]/g, "_").slice(0, 180) || "document";
}
