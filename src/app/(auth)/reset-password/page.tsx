"use client";

import { ArrowLeft, KeyRound, MailCheck, Send } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Btn, Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-soft p-6" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const status = searchParams.get("insforge_status");
  const flowType = searchParams.get("insforge_type");
  const flowError = searchParams.get("insforge_error");
  const isReadyToReset = Boolean(token) && status === "ready" && flowType === "reset_password";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const toast = useToast();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send reset email.");
      setSent(true);
      toast.success("Reset link sent if account exists");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, code, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Password reset failed.");
      setResetComplete(true);
      toast.success("Password updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password reset failed. Please request a new link.");
    } finally {
      setLoading(false);
    }
  }

  if (resetComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft p-6">
        <Card className="w-full max-w-md p-8 text-center">
          <KeyRound className="mx-auto text-primary" size={44} />
          <h2 className="mt-4 text-xl font-black text-ink">Password updated</h2>
          <p className="mt-2 text-sm leading-7 text-muted">Your password has been reset. You can now sign in with the new password.</p>
          <Link href="/login" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#0B4DA2]">
            <ArrowLeft size={16} /> Back to sign in
          </Link>
        </Card>
      </div>
    );
  }

  if (flowError || (status === "error" && flowType === "reset_password")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft p-6">
        <Card className="w-full max-w-md p-8 text-center">
          <KeyRound className="mx-auto text-primary" size={44} />
          <h2 className="mt-4 text-xl font-black text-ink">Reset link expired</h2>
          <p className="mt-2 text-sm leading-7 text-muted">{flowError || "Please request a new password reset link."}</p>
          <Link href="/reset-password" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#0B4DA2]">
            Request a new link
          </Link>
        </Card>
      </div>
    );
  }

  if (isReadyToReset) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft p-6">
        <Card className="w-full max-w-md p-8">
          <KeyRound className="text-primary" size={40} />
          <h1 className="mt-4 text-2xl font-black text-ink">Create New Password</h1>
          <p className="mt-2 text-sm leading-7 text-muted">Enter a new password for your Divine Financial Group account.</p>
          <form onSubmit={resetPassword} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">New Password</label>
              <input
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border-[1.5px] border-border px-4 py-3 text-base outline-none focus:border-[#0B4DA2]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">Confirm Password</label>
              <input
                type="password"
                required
                minLength={10}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border-[1.5px] border-border px-4 py-3 text-base outline-none focus:border-[#0B4DA2]"
              />
            </div>
            <Btn variant="primary" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update Password"} {!loading && <KeyRound size={16} />}
            </Btn>
          </form>
        </Card>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft p-6">
        <Card className="w-full max-w-md p-8">
          <MailCheck className="text-primary" size={44} />
          <h2 className="mt-4 text-xl font-black text-ink">Check your email</h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            If an account exists for <b>{email}</b>, you will receive a 6-digit reset code. Enter it below to create a new password.
          </p>
          <form onSubmit={resetPassword} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">Reset Code</label>
              <input
                inputMode="numeric"
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-xl border-[1.5px] border-border px-4 py-3 text-base outline-none focus:border-[#0B4DA2]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">New Password</label>
              <input
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border-[1.5px] border-border px-4 py-3 text-base outline-none focus:border-[#0B4DA2]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">Confirm Password</label>
              <input
                type="password"
                required
                minLength={10}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border-[1.5px] border-border px-4 py-3 text-base outline-none focus:border-[#0B4DA2]"
              />
            </div>
            <Btn variant="primary" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update Password"} {!loading && <KeyRound size={16} />}
            </Btn>
          </form>
          <div className="mt-5 text-center">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-[#0B4DA2]">
              <ArrowLeft size={16} /> Back to sign in
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-soft p-6">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-black text-ink">Reset Password</h1>
        <p className="mt-2 text-sm leading-7 text-muted">Enter your email and we will send a reset link if the account exists.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-xl border-[1.5px] border-border px-4 py-3 text-base outline-none focus:border-[#0B4DA2]"
            />
          </div>
          <Btn variant="primary" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"} {!loading && <Send size={16} />}
          </Btn>
        </form>
        <div className="mt-5 text-center text-sm">
          <Link href="/login" className="inline-flex items-center gap-2 font-bold text-[#0B4DA2]">
            <ArrowLeft size={16} /> Back to sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
