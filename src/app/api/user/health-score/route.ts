import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { updateHealthScore } from "@/lib/health-score";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const score = await updateHealthScore(session.profileId);
  return NextResponse.json({ score });
}

export const POST = GET;
