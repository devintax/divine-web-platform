"use client";

import { Plus, ReceiptText, Save } from "lucide-react";
import { useEffect, useState } from "react";

type Transaction = { date: string; description: string; amount: string; category: string; status: string };

export default function BookkeepingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/portal/bookkeeping", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setTransactions(data.transactions || []);
        setReports(data.reports || []);
      })
      .finally(() => setLoading(false));
  }, []);

  function update(index: number, key: keyof Transaction, value: string) {
    setTransactions((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  async function save() {
    setSaving(true);
    await fetch("/api/portal/bookkeeping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ transactions, reports }),
    });
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink">Bookkeeping</h1>
          <p className="mt-1 text-xs text-muted">Client-visible transaction review for staff-updated books.</p>
        </div>
        <button onClick={() => setTransactions((rows) => [...rows, { date: "", description: "", amount: "", category: "", status: "Needs review" }])} className="inline-flex items-center gap-2 rounded-xl bg-[#0B4DA2] px-4 py-2 text-sm font-bold text-white">
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <ReceiptText className="mx-auto text-muted" size={34} />
          <h2 className="mt-3 text-lg font-black text-ink">No transactions posted yet</h2>
          <p className="mt-1 text-sm text-muted">Staff updates will appear here as bookkeeping work progresses.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          <div className="grid grid-cols-[120px_1.3fr_120px_140px_140px] gap-2 border-b border-border bg-soft px-4 py-3 text-xs font-black uppercase text-muted">
            <div>Date</div><div>Description</div><div>Amount</div><div>Category</div><div>Status</div>
          </div>
          {transactions.map((row, index) => (
            <div key={index} className="grid grid-cols-[120px_1.3fr_120px_140px_140px] gap-2 border-b border-border px-4 py-3 last:border-0">
              <Cell value={row.date} onChange={(value) => update(index, "date", value)} placeholder="YYYY-MM-DD" />
              <Cell value={row.description} onChange={(value) => update(index, "description", value)} placeholder="Description" />
              <Cell value={row.amount} onChange={(value) => update(index, "amount", value)} placeholder="$0.00" />
              <Cell value={row.category} onChange={(value) => update(index, "category", value)} placeholder="Category" />
              <Cell value={row.status} onChange={(value) => update(index, "status", value)} placeholder="Status" />
            </div>
          ))}
        </div>
      )}

      <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#0B4DA2] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
        <Save size={16} /> {saving ? "Saving..." : "Save Bookkeeping View"}
      </button>
    </div>
  );
}

function Cell({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-w-0 rounded-lg border border-border px-2 py-2 text-sm" />;
}
