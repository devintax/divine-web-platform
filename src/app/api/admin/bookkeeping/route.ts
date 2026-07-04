import { NextRequest, NextResponse } from "next/server";
import { verifyStaff } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await verifyStaff();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const enrollmentId = String(body.enrollmentId || "");
  const transaction = body.transaction;
  if (!enrollmentId || !transaction || typeof transaction !== "object") {
    return NextResponse.json({ error: "enrollmentId and transaction are required" }, { status: 422 });
  }

  const admin = getSupabaseAdmin();
  const { data: enrollment } = await admin
    .from("service_enrollments")
    .select("id,user_id,service_type,intake_data")
    .eq("id", enrollmentId)
    .single();

  if (!enrollment || (enrollment as any).service_type !== "bookkeeping") {
    return NextResponse.json({ error: "Bookkeeping enrollment not found" }, { status: 404 });
  }

  const intake = ((enrollment as any).intake_data || {}) as any;
  const transactions = Array.isArray(intake.transactions) ? intake.transactions : [];
  const nextTransaction = {
    id: crypto.randomUUID(),
    date: String(transaction.date || new Date().toISOString().slice(0, 10)),
    description: String(transaction.description || "").trim(),
    amount: String(transaction.amount || "").trim(),
    category: String(transaction.category || "Uncategorized").trim(),
    status: String(transaction.status || "Posted").trim(),
    addedBy: session.profileId,
    addedAt: new Date().toISOString(),
  };
  if (!nextTransaction.description || !nextTransaction.amount) {
    return NextResponse.json({ error: "Description and amount are required" }, { status: 422 });
  }

  const { error } = await admin
    .from("service_enrollments")
    .update({
      intake_data: { ...intake, transactions: [nextTransaction, ...transactions].slice(0, 500) },
      client_message: "Your bookkeeping transaction view has been updated.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", enrollmentId);

  if (error) return NextResponse.json({ error: "Could not save transaction" }, { status: 500 });

  await admin.from("case_messages").insert({
    enrollment_id: enrollmentId,
    sender_id: session.profileId,
    sender_type: "staff",
    message: `Bookkeeping transaction added: ${nextTransaction.description}`,
    read_by_client: false,
    read_by_staff: true,
  });

  await logAudit({
    staffId: session.profileId,
    userId: (enrollment as any).user_id,
    action: "bookkeeping_transaction_added",
    resourceType: "service_enrollment",
    resourceId: enrollmentId,
    eventCategory: "workflow",
    metadata: { transactionId: nextTransaction.id },
  });

  return NextResponse.json({ success: true, transaction: nextTransaction });
}
