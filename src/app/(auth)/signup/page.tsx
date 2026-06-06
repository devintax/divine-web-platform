"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo, Btn, Pill } from "@/components/ui";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, name }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Signup failed"); setLoading(false); return; }
      if (data.userId) {
        document.cookie = `d_user_id=${data.userId};path=/;SameSite=Lax`;
        router.push("/portal"); router.refresh();
      } else { setSuccess(true); }
    } catch { setError("An unexpected error occurred."); setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-soft flex items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><Logo /></div>
          <Pill tone="green">Create Your Account</Pill>
        </div>
        <div className="bg-white border border-border rounded-[20px] p-8 shadow-sm">
          {success ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">&#9993;</div>
              <h2 className="text-xl font-black mb-2">Check Your Email</h2>
              <p className="text-sm text-muted leading-relaxed mb-6">We&apos;ve sent a confirmation link to <strong className="text-ink">{email}</strong>.</p>
              <Link href="/login"><Btn variant="primary">Go to Login</Btn></Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black text-center mb-1">Create Account</h1>
              <p className="text-sm text-muted text-center mb-6">Join Divine Financial Group&apos;s secure client portal</p>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl px-4 py-3 mb-4">{error}</div>}
              <form onSubmit={handleSignup} className="flex flex-col gap-4">
                <div><label className="text-xs font-bold text-muted block mb-1.5">Full Legal Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full legal name" required
                    className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0B4DA2] transition-colors" />
                </div>
                <div><label className="text-xs font-bold text-muted block mb-1.5">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required
                    className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0B4DA2] transition-colors" />
                </div>
                <div><label className="text-xs font-bold text-muted block mb-1.5">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8}
                    className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0B4DA2] transition-colors" />
                </div>
                <div><label className="text-xs font-bold text-muted block mb-1.5">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required
                    className="w-full border-[1.5px] border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#0B4DA2] transition-colors" />
                </div>
                <Btn variant="primary" sz="lg" type="submit" disabled={loading} className="w-full">{loading ? "Creating Account..." : "Create Account"}</Btn>
              </form>
              <div className="mt-6 text-center">
                <span className="text-sm text-muted">Already have an account? </span>
                <Link href="/login" className="text-sm text-[#0B4DA2] font-bold no-underline hover:underline">Sign In</Link>
              </div>
            </>
          )}
        </div>
        <div className="mt-6 flex justify-center gap-4 text-[10px] text-muted font-semibold">
          <span>&#128274; AES-256 Encrypted</span><span>&#128737; SOC2 Compliant</span><span>&#10004; GLBA Compliant</span>
        </div>
      </div>
    </div>
  );
}
