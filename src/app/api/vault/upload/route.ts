import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "general";
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 52428800) return NextResponse.json({ error: "File too large. Max 50MB." }, { status: 400 });

    const allowed = ["application/pdf","image/jpeg","image/png","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) return NextResponse.json({ error: "File type not allowed" }, { status: 400 });

    const ext = file.name.split(".").pop() || "bin";
    const storageName = `${session.profileId}/${randomUUID()}.${ext}`;
    const admin = getSupabaseAdmin();

    const { data: upData, error: upErr } = await admin.storage.from("dfg-quarantine").upload(storageName, file, { contentType: file.type });
    if (upErr) return NextResponse.json({ error: "Upload failed" }, { status: 500 });

    const { data: doc, error: dbErr } = await admin.from("vault_documents").insert({
      user_id: session.profileId, file_name: storageName, display_name: file.name, file_size: file.size, mime_type: file.type,
      storage_path: upData?.key || storageName, storage_key: upData?.key || storageName, storage_url: upData?.url || "",
      category, status: "quarantine", uploaded_via: "direct", virus_scanned: false,
    }).select("id").single();

    if (dbErr) return NextResponse.json({ error: "Failed to save record" }, { status: 500 });

    await logAudit({ action: "vault_upload_init", userId: session.profileId, resourceType: "vault_document", resourceId: doc.id, metadata: { file_name: file.name, category, size: file.size } });
    return NextResponse.json({ success: true, documentId: doc.id, status: "quarantine" });
  } catch (e) { console.error("[vault upload]", e); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
