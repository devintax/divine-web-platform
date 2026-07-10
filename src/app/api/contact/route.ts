import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { DFGEmail } from "@/lib/email/dfg-email";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] || char);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const service = String(body.service || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !email) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("contact_submissions").insert({
      full_name: name,
      email,
      phone: phone || null,
      service_interest: service || null,
      message: message || null,
      status: "new",
    }).select("id").single();

    if (error) return NextResponse.json({ error: "Failed to submit" }, { status: 500 });

    const staffEmail = process.env.ADMIN_EMAIL || process.env.MAIL_FROM || "support@dfgworld.net";
    await DFGEmail.raw(
      staffEmail,
      `New Contact: ${name} - ${service || "General"}`,
      `<h2>New Contact Form Submission</h2>
       <p><b>Name:</b> ${escapeHtml(name)}</p>
       <p><b>Email:</b> ${escapeHtml(email)}</p>
       <p><b>Phone:</b> ${escapeHtml(phone || "-")}</p>
       <p><b>Service Interest:</b> ${escapeHtml(service || "-")}</p>
       <p><b>Message:</b></p><blockquote>${escapeHtml(message || "-").replace(/\n/g, "<br>")}</blockquote>`,
      { bypassPreferences: true },
    );

    await DFGEmail.raw(
      email,
      "We received your message - Divine Financial Group",
      `<p>Hi ${escapeHtml(name)},</p>
       <p>Thank you for contacting Divine Financial Group. We received your message regarding <strong>${escapeHtml(service || "our services")}</strong> and will respond within one business day.</p>
       <p>If you need immediate assistance, please call us at <a href="tel:3023225515">(302) 322-5515</a>.</p>
       <p>Divine Financial Group<br>622 E. Basin Road, Suite A<br>New Castle, DE 19720</p>`,
      { bypassPreferences: true },
    );

    await logAudit({
      action: "contact_form_submitted",
      metadata: { email, service_interest: service },
      resourceType: "contact_submission",
      resourceId: data.id,
    });

    return NextResponse.json({ success: true, message: "Message sent successfully" });
  } catch (e: any) {
    console.error("[contact]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
