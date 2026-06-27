import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { can } from "@/lib/rbac/can";
import { loadCaseBundle } from "@/lib/case-records";
import { logAudit } from "@/lib/audit";
import { sendSms } from "@/lib/sms";

const SERVICE_LABELS: Record<string, string> = {
  tax: "Tax Preparation",
  formation: "Business Formation",
  insurance: "Auto Insurance",
  notary: "Notary Services",
  bookkeeping: "Bookkeeping",
};

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyStaff();
  if (!session || !can(session.role, "send_sms_to_client")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const bundle = await loadCaseBundle(id);
  if (!bundle) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (!bundle.client?.phone) return NextResponse.json({ error: "Client has no phone number on file" }, { status: 422 });

  const serviceLabel = SERVICE_LABELS[bundle.enrollment.service_type] || "service";
  const pendingDocs = bundle.missingDocuments.filter((doc) => !doc.is_received);
  const docList = pendingDocs.map((doc) => doc.document_name).filter(Boolean).join(", ");
  const message = pendingDocs.length
    ? `Hi ${bundle.client.legal_name || "there"}! Reminder from DFG: your ${serviceLabel} case is waiting on ${docList}. Please upload at ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/portal/orders. Questions? Call (302) 322-5515.`
    : `Hi ${bundle.client.legal_name || "there"}! Your Divine Financial Group ${serviceLabel} case needs attention. Please log in at ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/portal/orders. Questions? Call (302) 322-5515.`;

  const result = await sendSms(bundle.client.phone, message, {
    relatedResourceType: "missing_document",
    relatedResourceId: id,
    sentBy: session.profileId,
  });

  await logAudit({
    action: "client_nudge_sms_sent",
    userId: bundle.client.id,
    staffId: session.profileId,
    resourceType: "enrollment",
    resourceId: id,
    eventCategory: "system",
    metadata: { provider: result.provider, success: result.success, pendingDocs: pendingDocs.length },
  });

  if (!result.success) return NextResponse.json({ error: result.error || "SMS failed", provider: result.provider }, { status: 502 });
  return NextResponse.json({ success: true, provider: result.provider, pendingDocs: pendingDocs.length });
}
