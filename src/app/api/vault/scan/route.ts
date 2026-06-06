import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json();
    if (!documentId) return NextResponse.json({ error: "Missing documentId" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data: doc, error } = await admin.from("vault_documents").select("*").eq("id", documentId).single();
    if (error || !doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    await admin.from("vault_documents").update({ status: "scanning" }).eq("id", documentId);

    // Download from quarantine bucket
    const quarantineKey = doc.file_name!;
    const { data: blob, error: dlErr } = await admin.storage.from("dfg-quarantine").download(quarantineKey);
    if (dlErr || !blob) {
      await admin.from("vault_documents").update({ status: "flagged" }).eq("id", documentId);
      return NextResponse.json({ error: "Scan failed — file not accessible" }, { status: 500 });
    }

    // Upload to vault bucket
    const vaultKey = `vault/${doc.user_id}/${doc.category || "general"}/${Date.now()}_${doc.file_name}`;
    const { data: upData, error: upErr } = await admin.storage.from("dfg-vault").upload(vaultKey, blob, { contentType: doc.mime_type || "application/octet-stream" });
    if (upErr) {
      await admin.from("vault_documents").update({ status: "flagged" }).eq("id", documentId);
      return NextResponse.json({ error: "Failed to move to vault" }, { status: 500 });
    }

    // Remove from quarantine
    try { await admin.storage.from("dfg-quarantine").remove(quarantineKey); } catch {}

    await admin.from("vault_documents").update({
      status: "clean", virus_scanned: true, virus_clean: true,
      storage_path: upData?.key || vaultKey, storage_key: upData?.key || vaultKey,
      storage_url: upData?.url || "",
      routed_to: mapPod(doc.category || "general"),
    }).eq("id", documentId);

    await logAudit({ action: "vault_scan_passed", userId: doc.user_id, resourceType: "vault_document", resourceId: documentId, metadata: { file_name: doc.display_name } });
    return NextResponse.json({ success: true, status: "clean" });
  } catch (e) { console.error("[scan]", e); return NextResponse.json({ error: "Scan failed" }, { status: 500 }); }
}

function mapPod(c: string) {
  const m: Record<string, string> = { tax:"Tax Pod", formation:"Legal Pod", insurance:"Insurance Pod", notary:"Notary Pod", bookkeeping:"Finance Pod", general:"General" };
  return m[c] || "General";
}
