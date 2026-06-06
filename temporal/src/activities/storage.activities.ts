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
    is_active: true,
  });
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/upload/${token}`;
}

export async function simulateMalwareScan(documentId: string): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return true;
}
