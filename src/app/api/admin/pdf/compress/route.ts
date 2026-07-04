import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { compressPdf } from "@/lib/stirling";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Staff access required" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  const level = String(form.get("level") || "medium") as "low" | "medium" | "high" | "extreme";
  if (!(file instanceof File)) return NextResponse.json({ error: "PDF file is required" }, { status: 422 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Only PDF files can be compressed" }, { status: 422 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const output = await compressPdf(buffer, file.name || "document.pdf", level);
    return new Response(output as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeDownloadName(file.name, "compressed")}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "PDF compression failed" }, { status: 502 });
  }
}

function safeDownloadName(filename: string, suffix: string) {
  const base = (filename || "document.pdf").replace(/\.pdf$/i, "").replace(/[^a-z0-9._-]/gi, "_").slice(0, 120) || "document";
  return `${base}_${suffix}.pdf`;
}
