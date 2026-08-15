import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("service_enrollments")
    .select("id,status,progress,intake_data,updated_at,created_at")
    .eq("user_id", session.profileId)
    .eq("service_type", "bookkeeping")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return NextResponse.json({ enrollment: null, transactions: [], reports: [] });
  const intake = ((data as any).intake_data || {}) as any;
  const { data: transactionRows, error: transactionError } = await admin
    .from("bookkeeping_transactions")
    .select("id,transaction_date,description,amount,category,status")
    .eq("enrollment_id", (data as any).id)
    .eq("user_id", session.profileId)
    .order("transaction_date", { ascending: false });

  return NextResponse.json({
    enrollment: data,
    transactions: !transactionError
      ? (transactionRows || []).map((row: any) => ({
          id: row.id,
          date: row.transaction_date || "",
          description: row.description || "",
          amount: row.amount == null ? "" : String(row.amount),
          category: row.category || "",
          status: row.status || "Needs review",
        }))
      : intake.transactions || [],
    reports: intake.reports || [],
    tableBacked: !transactionError,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const admin = getSupabaseAdmin();
  const { data: enrollment } = await admin
    .from("service_enrollments")
    .select("id,intake_data")
    .eq("user_id", session.profileId)
    .eq("service_type", "bookkeeping")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (!enrollment) return NextResponse.json({ error: "No bookkeeping enrollment found" }, { status: 404 });

  const intake = ((enrollment as any).intake_data || {}) as any;
  const transactions = Array.isArray(body.transactions) ? body.transactions.slice(0, 500) : intake.transactions || [];
  const reports = Array.isArray(body.reports) ? body.reports.slice(0, 100) : intake.reports || [];

  const { error: transactionDeleteError } = await admin
    .from("bookkeeping_transactions")
    .delete()
    .eq("enrollment_id", (enrollment as any).id)
    .eq("user_id", session.profileId);

  if (!transactionDeleteError && transactions.length) {
    const { error: transactionInsertError } = await admin.from("bookkeeping_transactions").insert(
      transactions.map((row: any) => ({
        enrollment_id: (enrollment as any).id,
        user_id: session.profileId,
        transaction_date: row.date || null,
        description: String(row.description || ""),
        amount: Number(String(row.amount || "0").replace(/[^0-9.-]/g, "")) || 0,
        category: String(row.category || ""),
        status: String(row.status || "Needs review"),
        source: "staff_entry",
      })),
    );
    if (transactionInsertError) {
      console.warn("[portal/bookkeeping] transaction table insert failed; preserving intake_data fallback", transactionInsertError);
    }
  } else if (transactionDeleteError) {
    console.warn("[portal/bookkeeping] transaction table unavailable; using intake_data fallback", transactionDeleteError);
  }

  const { error } = await admin
    .from("service_enrollments")
    .update({ intake_data: { ...intake, transactions, reports }, updated_at: new Date().toISOString() })
    .eq("id", (enrollment as any).id);

  if (error) return NextResponse.json({ error: "Could not save bookkeeping view" }, { status: 500 });
  await logAudit({ userId: session.profileId, action: "bookkeeping_client_view_updated", resourceType: "service_enrollment", resourceId: (enrollment as any).id, eventCategory: "workflow" });
  return NextResponse.json({ success: true, transactions, reports });
}
