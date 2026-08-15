import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { DFGEmail } from "@/lib/email/dfg-email";
import { sendSms } from "@/lib/sms";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

type ChallengePayload = {
  authId: string;
  profileId: string;
  email: string;
  codeHash: string;
  expiresAt: number;
};

function secret() {
  const value = process.env.SESSION_SECRET || process.env.AUTH_SECRET;
  if (!value) throw new Error("SESSION_SECRET or AUTH_SECRET is required for two-factor challenges");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function hashCode(code: string) {
  return createHmac("sha256", secret()).update(code).digest("hex");
}

function encode(payload: ChallengePayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string): ChallengePayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ChallengePayload;
    if (!payload.expiresAt || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createTwoFactorChallenge(input: { authId: string; profileId: string; email: string }) {
  const code = String(randomInt(100000, 999999));
  const token = encode({
    authId: input.authId,
    profileId: input.profileId,
    email: input.email,
    codeHash: hashCode(code),
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return { code, token, maxAgeSeconds: CHALLENGE_TTL_MS / 1000 };
}

export function verifyTwoFactorChallenge(token: string | undefined, code: string) {
  if (!token || !/^\d{6}$/.test(code)) return null;
  const payload = decode(token);
  if (!payload) return null;
  const expected = Buffer.from(payload.codeHash);
  const actual = Buffer.from(hashCode(code));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return payload;
}

export async function sendTwoFactorCode(input: {
  code: string;
  email: string;
  phone?: string | null;
  legalName?: string | null;
}) {
  const phone = String(input.phone || "").trim();
  if (phone) {
    const sms = await sendSms(
      phone,
      `Your Divine Financial Group verification code is ${input.code}. It expires in 10 minutes. Do not share this code with anyone.`,
      {
        relatedResourceType: "two_factor",
        bypassPreferences: true,
      },
    );
    if (sms.success) {
      return { channel: "sms" as const, hint: `Code sent via text to ${maskPhone(phone)}` };
    }
    console.warn("[2fa] SMS delivery failed; falling back to email:", sms.error);
  }

  await DFGEmail.twoFactorCode(input.email, input.legalName, input.code);
  return { channel: "email" as const, hint: `Code sent to ${maskEmail(input.email)}` };
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `***-***-${digits.slice(-4) || "****"}`;
}

function maskEmail(email: string) {
  const [user = "", domain = ""] = email.split("@");
  const first = user[0] || "*";
  return domain ? `${first}***@${domain}` : `${first}***`;
}
