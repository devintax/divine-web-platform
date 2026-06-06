"use client";

import { useState } from "react";
import Link from "next/link";
import { Btn, Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

const BASE = process.env.NEXT_PUBLIC_INSFORGE_URL || "http://127.0.0.1:7130";
const KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      // Best-effort call to InsForge password reset endpoint
      await fetch(`${BASE}/api/auth/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: KEY },
        body: JSON.stringify({ email }),
      }).catch(() => {});
      setSent(true);
      toast.success("Reset link sent if account exists");
    } catch {
      toast.error("Could not send reset email. Please try again.");
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft p-6">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-black mb-2">Check your email</h2>
          <p className="text-sm text-muted">If an account exists for <b>{email}</b>, you&apos;ll receive a reset link within 2 minutes. Check your spam folder if you don&apos;t see it.</p>
          <Link href="/login" className="block mt-4 text-sm font-bold text-[#0B4DA2]">← Back to sign in</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-soft p-6">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-black text-ink mb-2">Reset Password</h1>
        <p className="text-sm text-muted mb-5">Enter your email and we&apos;ll send you a reset link.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-muted block mb-1">Email Address</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#0B4DA2]" />
          </div>
          <Btn variant="primary" className="w-full" disabled={loading}>{loading ? "Sending..." : "Send Reset Link →"}</Btn>
        </form>
        <div className="mt-5 text-center text-sm">
          <Link href="/login" className="font-bold text-[#0B4DA2]">← Back to sign in</Link>
        </div>
      </Card>
    </div>
  );
}
