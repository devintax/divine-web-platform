import { type ReactNode } from "react";

type Tone = "blue" | "red" | "green" | "gold" | "gray" | "white";

const toneClasses: Record<Tone, string> = {
  blue: "bg-blue-50 text-primary border-blue-200",
  red: "bg-red-50 text-accent border-red-200",
  green: "bg-emerald-50 text-success border-emerald-200",
  gold: "bg-amber-50 text-warning border-amber-200",
  gray: "bg-soft text-muted border-border",
  white: "bg-white/15 text-white border-white/30",
};

interface PillProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

export function Pill({ children, tone = "blue", className = "" }: PillProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${toneClasses[tone]} ${className}`}>
      {children}
    </span>
  );
}
