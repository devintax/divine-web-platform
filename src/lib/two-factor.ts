import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "crypto";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

type ChallengePayload = {
  authId: string;
  profileId: string;
  email: string;
  codeHash: string;
  expiresAt: number;
};

function secret() {
  return process.env.AUTH_SECRET || process.env.INSFORGE_SERVICE_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "dfg-dev-secret";
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
