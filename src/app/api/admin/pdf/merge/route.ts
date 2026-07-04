import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { mergePdfs } from "@/lib/stirling";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Staff access required" }, { status: 403 });

  const form = await req.formData();
  const files = form.getAll("files").filter((file): file is File => file instanceof File);
  if (files.length < 2) return NextResponse.json({ error: "At least two PDF files are required" }, { status: 422 });
  if (files.some((file) => file.type !== "application/pdf")) {
    return NextResponse.json({ error: "Only PDF files can be merged" }, { status: 422 });
  }

  try {
    const payload = await Promise.all(files.map(async (file) => ({
      filename: file.name || "document.pdf",
      buffer: Buffer.from(await file.arrayBuffer()),
    })));
    const output = await mergePdfs(payload);
    return new Response(output as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="dfg_merged.pdf"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "PDF merge failed" }, { status: 502 });
  }
}
