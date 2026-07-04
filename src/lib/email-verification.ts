import "server-only";

import { createHash, randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createEmailVerification(authUserId: string) {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  const { error } = await getSupabaseAdmin()
    .from("user_profiles")
    .update({
      email_verified: false,
      email_verify_token: hashToken(token),
      email_verify_expiry: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("auth_user_id", authUserId);

  if (error) throw error;
  return { token, expiresAt };
}

export async function verifyEmailToken(token: string) {
  const tokenHash = hashToken(token);
  const admin = getSupabaseAdmin();
  const { data: profile, error } = await admin
    .from("user_profiles")
    .select("id,auth_user_id,email,legal_name,email_verify_expiry,email_verified")
    .eq("email_verify_token", tokenHash)
    .single();

  if (error || !profile) return { ok: false as const, error: "Invalid verification link." };
  if (profile.email_verified === true) return { ok: true as const, profile };
  if (!profile.email_verify_expiry || new Date(profile.email_verify_expiry).getTime() < Date.now()) {
    return { ok: false as const, error: "Verification link expired. Please request a new verification email." };
  }

  const { error: updateError } = await admin
    .from("user_profiles")
    .update({
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      email_verify_token: null,
      email_verify_expiry: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) return { ok: false as const, error: "Could not verify email. Please try again." };
  return { ok: true as const, profile };
}
