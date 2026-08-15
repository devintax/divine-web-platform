import { NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { checkAIHealth } from "@/lib/ai/dfg-ai";

export const runtime = "nodejs";

export async function GET() {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Staff access required" }, { status: 403 });

  return NextResponse.json({
    ai: await checkAIHealth(),
    env: {
      AI_ENABLED: process.env.AI_ENABLED !== "false",
      AI_BASE_URL: Boolean(process.env.AI_BASE_URL),
      AI_MODEL: process.env.AI_MODEL || "ollama/phi3.5",
      CF_ACCESS_CLIENT_ID: Boolean(process.env.CF_ACCESS_CLIENT_ID || process.env.CLOUDFLARE_ACCESS_CLIENT_ID),
      CF_ACCESS_CLIENT_SECRET: Boolean(process.env.CF_ACCESS_CLIENT_SECRET || process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET),
      LITELLM_MASTER_KEY: Boolean(process.env.LITELLM_MASTER_KEY || process.env.AI_API_KEY),
      OPENROUTER_API_KEY: Boolean(process.env.OPENROUTER_API_KEY),
      OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free",
    },
  });
}
