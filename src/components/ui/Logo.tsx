import Image from "next/image";
import Link from "next/link";

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 no-underline">
      <Image
        src="/images/dfg-logo.png"
        alt="Divine Financial Group"
        width={compact ? 40 : 46}
        height={compact ? 40 : 46}
        className="shrink-0 object-contain"
        priority
      />
      {!compact && (
        <div>
          <div className={`font-black text-[15px] tracking-[-0.3px] leading-tight ${light ? "text-white" : "text-ink"}`}>
            Divine Financial Group
          </div>
          <div className={`text-[9px] font-bold tracking-[0.16em] uppercase mt-0.5 ${light ? "text-white/70" : "text-accent"}`}>
            Your Trusted Financial Partner
          </div>
        </div>
      )}
    </Link>
  );
}
