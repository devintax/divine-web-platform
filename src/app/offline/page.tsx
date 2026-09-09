import { RefreshCw, WifiOff } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui";

export default function OfflinePage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-soft p-5 safe-top safe-bottom">
      <section className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <WifiOff className="mx-auto text-primary" size={48} aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-black text-ink">You&apos;re offline</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Reconnect to access secure documents, messages, and account information.</p>
        <Link href="/portal" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white">
          <RefreshCw size={17} aria-hidden="true" /> Try again
        </Link>
        <p className="mt-7 text-xs text-muted">Need help? <a className="font-bold text-primary" href="tel:+13023225515">Call (302) 322-5515</a></p>
      </section>
    </main>
  );
}
