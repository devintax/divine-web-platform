import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data: link, error: linkErr } = await admin.from("upload_links").select("*").eq("token", token).eq("is_active", true).single();
    if (linkErr || !link) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      await admin.from("upload_links").update({ is_active: false }).eq("id", link.id);
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    // Parse FormData
    const form = await req.formData();
    const files = form.getAll("files") as File[];
    if (!files.length) return NextResponse.json({ error: "No files provided" }, { status: 400 });

    // Upload to InsForge storage under vault bucket
    const uploaded: any[] = [];
    for (const file of files) {
      const path = `public/${link.id}/${file.name}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { data, error } = await admin.storage.from("vault").upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: true });
      if (error) throw new Error(error.message);
      uploaded.push({ name: file.name, path: (data as any)?.path || path });
    }

    // Create vault_document entries
    for (const u of uploaded) {
      await admin.from("vault_documents").insert({
        user_id: link.client_user_id,
        service_type: "public_upload",
        file_name: u.name,
        storage_path: u.path,
        status: "uploaded",
      });
    }

    // Trigger vault workflow via internal fetch
    const config = { json: { source: "public_upload", token, files: uploaded.map((u: any) => u.name) } };
    try {
      await fetch(`${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/workflows/vault`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config.json) });
    } catch { /* workflow trigger best effort */ }

    return NextResponse.json({ success: true, uploaded });
  } catch (e: any) {
    console.error("[vault/public-upload]", e);
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 });
  }
}
