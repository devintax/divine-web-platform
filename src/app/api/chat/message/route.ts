import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BOT_INTENTS: { keywords: string[]; reply: string; service?: string }[] = [
  { keywords: ["llc","corporation","business","form","incorporate","entity"], reply: "I can help you form your business. What name are you considering?", service: "formation" },
  { keywords: ["tax","filing","irs","return","w2","1099","refund","deduction"], reply: "I can connect you with our tax team. Are you filing personal, business, or both?", service: "tax" },
  { keywords: ["insurance","auto","car","coverage","quote","policy","rate"], reply: "Let's find you the best auto insurance rate. What ZIP code is your vehicle registered in?", service: "insurance" },
  { keywords: ["notary","notarize","sign","document","deed","affidavit","power of attorney"], reply: "I can schedule your notary session. What type of document needs notarizing?", service: "notary" },
  { keywords: ["bookkeeping","books","accounting","ledger","payroll","monthly report"], reply: "Our bookkeeping team can help. Is your business brand new or already established?", service: "bookkeeping" },
  { keywords: ["human","agent","person","real","speak","call","talk","help"], reply: "Connecting you to a specialist now. Estimated wait: under 2 minutes. 🟢" },
  { keywords: ["hours","open","available","when","schedule"], reply: "Office hours: Mon-Fri 9 AM-5 PM ET, Sat 10 AM-2 PM during tax season. AI is available 24/7." },
  { keywords: ["phone","email","address","contact"], reply: "Reach us at (302) 322-5515 or info@dfgbusiness.com. Office: 622 E. Basin Road, Suite A, New Castle, DE 19720." },
];

function detectIntent(message: string): { reply: string; service?: string } {
  const lower = message.toLowerCase();
  for (const intent of BOT_INTENTS) {
    if (intent.keywords.some(k => lower.includes(k))) return { reply: intent.reply, service: intent.service };
  }
  return { reply: "Got it! I've saved your info and a Divine Financial Group specialist will follow up shortly. In the meantime, you can browse our services or upload documents to your secure vault." };
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const admin = getSupabaseAdmin();
  await admin.from("chat_messages").insert({ user_id: session.profileId, role: "user", content: message });

  const { reply, service } = detectIntent(message);
  await admin.from("chat_messages").insert({ user_id: session.profileId, role: "bot", content: reply });

  // Off-hours detection: weekday after 5pm ET or weekends
  const now = new Date();
  const dow = now.getUTCDay();
  const hourET = (now.getUTCHours() - 5 + 24) % 24;
  const isOffHours = dow === 0 || dow === 6 || hourET < 9 || hourET >= 17;

  if (isOffHours && message.toLowerCase().includes("human")) {
    try {
      await admin.from("callback_queue").insert({
        user_id: session.profileId,
        preferred_method: "phone",
        service_context: service || "general",
        status: "pending",
      });
    } catch { /* ignore */ }
  }

  return NextResponse.json({ reply, intent: service, offHours: isOffHours });
}

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("chat_messages").select("id, role, content, created_at").eq("user_id", session.profileId).order("created_at", { ascending: true }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data || [] });
}
