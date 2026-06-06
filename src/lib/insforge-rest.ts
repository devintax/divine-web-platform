// Direct REST client for InsForge API routes that don't have SDK wrappers
// This handles auth and generic CRUD that the SDK exposes

const BASE = process.env.NEXT_PUBLIC_INSFORGE_URL || "http://127.0.0.1:7130";
const KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "";

export async function insforgeFetch(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>
) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": KEY,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Attempt to parse JSON, fallback to text
  let json: any;
  try { json = await res.json(); } catch { json = {}; }

  return {
    ok: res.ok,
    status: res.status,
    data: json.data ?? json,
    error: json.error ?? null,
    message: json.message ?? "",
  };
}
