import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "d_session";
export const LEGACY_SESSION_COOKIE_NAME = "d_user_id";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  authId: string;
  iat: number;
  exp: number;
  nonce: string;
};

function secret() {
  const value =
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.INSFORGE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

  if (!value) throw new Error("SESSION_SECRET is required for signed sessions");
  return value;
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(authId: string, maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    authId,
    iat: now,
    exp: now + maxAgeSeconds,
    nonce: randomBytes(12).toString("base64url"),
  };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.authId || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
