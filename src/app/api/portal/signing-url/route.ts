import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getDocusealSubmission, getDocusealSigningUrl } from "@/lib/docuseal";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const submissionId = req.nextUrl.searchParams.get("submissionId");
  if (!submissionId) return NextResponse.json({ error: "submissionId is required" }, { status: 422 });
  try {
    const submission = await getDocusealSubmission(submissionId);
    return NextResponse.json({ signingUrl: getDocusealSigningUrl(submission, session.email), submission });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load signing URL" }, { status: 502 });
  }
}
