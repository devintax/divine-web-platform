import { NextRequest, NextResponse } from "next/server";
import { promoteVaultDocument } from "@/lib/vault/pipeline";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json();
    if (!documentId) return NextResponse.json({ error: "Missing documentId" }, { status: 400 });

    const result = await promoteVaultDocument(documentId);
    return NextResponse.json({ success: true, status: result.status });
  } catch (error) {
    console.error("[vault/scan]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scan failed" }, { status: 500 });
  }
}
