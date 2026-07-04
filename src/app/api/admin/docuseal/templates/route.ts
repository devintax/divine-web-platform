import { NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { listDocusealTemplates } from "@/lib/docuseal";

export async function GET() {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  try {
    const templates = await listDocusealTemplates();
    return NextResponse.json({ templates: Array.isArray(templates) ? templates : [] });
  } catch (error) {
    return NextResponse.json({ templates: [], error: error instanceof Error ? error.message : "Could not load DocuSeal templates" }, { status: 500 });
  }
}
