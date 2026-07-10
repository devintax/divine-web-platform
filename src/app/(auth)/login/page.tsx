"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo, Btn, Pill } from "@/components/ui";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-soft flex items-center justify-center"><div className="text-muted">Loading...</div></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [twoFactorHint, setTwoFactorHint] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/portal";
  const verified = searchParams.get("verified");
  const verifyMessage = searchParams.get("message");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json().catch(() => ({ error: "Login service returned an unreadable response." }));
      if (!res.ok) {
        if (data.requiresEmailVerification) {
          setNeedsEmailVerification(true);
          setError("");
        } else {
          setError(data.error || "Login failed");
        }
        setLoading(false);
        return;
      }
      if (data.requiresTwoFactor) {
        setNeedsTwoFactor(true);
        setTwoFactorHint(data.hint || "Enter the 6-digit verification code.");
        setLoading(false);
        return;
      }
      if (data.userId) {
        router.push(redirect); router.refresh();
      }
    } catch { setError("An unexpected error occurred."); setLoading(false); }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({ error: "Verification service returned an unreadable response." }));
      if (!res.ok) { setError(data.error || "Verification failed"); setLoading(false); return; }
      if (data.userId) {
        router.push(redirect); router.refresh();
      }
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }

  async function handleVerifyEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({ error: "Verification service returned an unreadable response." }));
      if (!res.ok) { setError(data.error || "Verification failed"); setLoading(false); return; }
      router.push(redirect);
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-soft flex items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><Logo /></div>
          <Pill tone="blue">Secure Client Portal</Pill>
        </div>
        <div className="bg-white border border-border rounded-[20px] p-8 shadow-sm">
          <h1 className="text-2xl font-black text-center mb-1">Welcome Back</h1>
          <p className="text-sm text-muted text-center mb-6">Sign in to access your financial dashboard</p>
          {verified === "1" && <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-xl px-4 py-3 mb-4">Email verified. You can sign in now.</div>}
          {(verified === "error" || verified === "missing") && <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl px-4 py-3 mb-4">{verifyMessage || "Verification link is invalid or expired."}</div>}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl px-4 py-3 mb-4">{error}</div>}
          {needsEmailVerification ? (
            <form onSubmit={handleVerifyEmail} className="flex flex-col gap-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#0B4DA2]">
                We sent a 6-digit verification code to {email}. Enter it below to activate your account.
              </div>
              <div><label className="text-xs font-bold text-muted block mb-1.5">Verification Code</label>
                <input type="text" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required minLength={6}
                  className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-center text-2xl font-black tracking-[0.35em] outline-none focus:border-[#0B4DA2] transition-colors" />
              </div>
              <Btn variant="primary" sz="lg" type="submit" disabled={loading || code.length !== 6} className="w-full">{loading ? "Verifying..." : "Verify Email & Sign In"}</Btn>
              <button type="button" onClick={() => { setNeedsEmailVerification(false); setCode(""); }} className="text-xs font-bold text-muted hover:text-[#0B4DA2]">
                Use a different account
              </button>
            </form>
          ) : needsTwoFactor ? (
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#0B4DA2]">
                {twoFactorHint || "Enter the 6-digit verification code."}
              </div>
              <div><label className="text-xs font-bold text-muted block mb-1.5">Verification Code</label>
                <input type="text" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required minLength={6}
                  className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-center text-2xl font-black tracking-[0.35em] outline-none focus:border-[#0B4DA2] transition-colors" />
              </div>
              <Btn variant="primary" sz="lg" type="submit" disabled={loading || code.length !== 6} className="w-full">{loading ? "Verifying..." : "Verify & Sign In"}</Btn>
              <button type="button" onClick={() => { setNeedsTwoFactor(false); setTwoFactorHint(""); setCode(""); }} className="text-xs font-bold text-muted hover:text-[#0B4DA2]">
                Use a different account
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div><label className="text-xs font-bold text-muted block mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required
                  className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0B4DA2] transition-colors" />
              </div>
              <div><label className="text-xs font-bold text-muted block mb-1.5">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required
                  className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0B4DA2] transition-colors" />
              </div>
              <Btn variant="primary" sz="lg" type="submit" disabled={loading} className="w-full">{loading ? "Signing in..." : "Sign In"}</Btn>
            </form>
          )}
          <div className="mt-3 text-center">
            <Link href="/reset-password" className="text-xs text-muted font-bold hover:text-[#0B4DA2]">Forgot password?</Link>
          </div>
          <div className="mt-6 text-center">
            <span className="text-sm text-muted">Don&apos;t have an account? </span>
            <Link href="/signup" className="text-sm text-[#0B4DA2] font-bold no-underline hover:underline">Create Account</Link>
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-4 text-[10px] text-muted font-semibold">
          <span>&#128274; AES-256 Encrypted</span><span>&#128737; SOC2 Compliant</span><span>&#10004; GLBA Compliant</span>
        </div>
      </div>
    </div>
  );
}
