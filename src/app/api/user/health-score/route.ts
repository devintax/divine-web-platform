import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { updateHealthScore } from "@/lib/health-score";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { financialHealthNarrative } from "@/lib/ai/dfg-ai";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const score = await updateHealthScore(session.profileId);
  const { data: services } = await getSupabaseAdmin()
    .from("service_enrollments")
    .select("service_type,status")
    .eq("user_id", session.profileId);
  const narrative = await financialHealthNarrative({
    score,
    services: services || [],
    clientName: session.legalName,
  });
  return NextResponse.json({
    score,
    narrative: narrative.text,
    aiProvider: narrative.provider,
    aiModel: narrative.model,
  });
}

export const POST = GET;
