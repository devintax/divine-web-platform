import { getSupabaseAdmin } from "./supabase-admin";

export const SERVICE_WEIGHTS: Record<string, number> = {
  formation: 25, tax: 25, insurance: 20, bookkeeping: 20, notary: 10,
};

export const STATUS_MULTIPLIER: Record<string, number> = {
  completed: 1.0, active: 0.7, pending: 0.3, draft: 0.1, cancelled: 0,
};

export async function calculateHealthScore(userId: string): Promise<number> {
  const admin = getSupabaseAdmin();
  const { data: enrollments } = await admin
    .from("service_enrollments")
    .select("service_type,status")
    .eq("user_id", userId);
  let score = 50;
  if (enrollments) {
    for (const e of enrollments) {
      const w = SERVICE_WEIGHTS[e.service_type || ""] || 0;
      const m = STATUS_MULTIPLIER[e.status || ""] || 0;
      score += w * m;
    }
  }
  return Math.min(100, Math.round(score));
}

export async function updateHealthScore(userId: string): Promise<number> {
  const s = await calculateHealthScore(userId);
  const admin = getSupabaseAdmin();
  await admin
    .from("user_profiles")
    .update({ health_score: s, updated_at: new Date().toISOString() })
    .eq("id", userId);
  return s;
}
