import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || "info@dfgbusiness.com";

async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  if (!RESEND_KEY) { console.warn("[contact] RESEND_API_KEY not set"); return; }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
  } catch (e) { console.error("[contact] email send failed", e); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, service, message } = body;
    if (!name || !email) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("contact_submissions").insert({
      full_name: name, email, phone: phone || null, service_interest: service || null, message: message || null, status: "new",
    }).select("id").single();
    if (error) return NextResponse.json({ error: "Failed to submit" }, { status: 500 });

    // Notification to staff
    await sendEmail(
      "info@dfgbusiness.com",
      `New Contact: ${name} - ${service || "General"}`,
      `<h2>New Contact Form Submission</h2>
       <p><b>Name:</b> ${name}</p>
       <p><b>Email:</b> ${email}</p>
       <p><b>Phone:</b> ${phone || "—"}</p>
       <p><b>Service Interest:</b> ${service || "—"}</p>
       <p><b>Message:</b></p><blockquote>${(message || "—").replace(/\n/g, "<br>")}</blockquote>`,
      email
    );
    // Auto-reply to client
    await sendEmail(
      email,
      "We received your message — Divine Financial Group",
      `<p>Hi ${name},</p>
       <p>Thank you for contacting Divine Financial Group. We received your message regarding <strong>${service || "our services"}</strong> and will respond within one business day.</p>
       <p>If you need immediate assistance, please call us at <a href="tel:3023225515">(302) 322-5515</a>.</p>
       <p>— Divine Financial Group<br>622 E. Basin Road, Suite A<br>New Castle, DE 19720</p>`
    );

    await logAudit({ action: "contact_form_submitted", metadata: { email, service_interest: service }, resourceType: "contact_submission", resourceId: data.id });
    return NextResponse.json({ success: true, message: "Message sent successfully" });
  } catch (e: any) {
    console.error("[contact]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
