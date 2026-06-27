import { getSupabaseAdmin } from "../lib/insforge";
import crypto from 'crypto';

export async function generateUploadLink(params: {
  userId: string; recipientEmail: string; purpose: string; expiresInHours: number;
}): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + params.expiresInHours);
  await getSupabaseAdmin().from('upload_links').insert({
    token,
    client_user_id: params.userId,
    recipient_email: params.recipientEmail,
    purpose: params.purpose,
    expires_at: expiresAt.toISOString(),
    used_count: 0,
    max_uses: 1,
    is_active: true,
  });
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/upload/${token}`;
}

export async function scanAndPromoteDocument(params: { documentId: string }): Promise<{ status: string }> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${base}/api/vault/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: params.documentId }),
  });
  const data = await response.json().catch(() => ({})) as { error?: string; status?: string };
  if (!response.ok) throw new Error(data.error || "Vault scan failed");
  return { status: data.status || "unknown" };
}
