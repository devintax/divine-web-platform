import { type ReactNode, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "red" | "outline" | "ghost" | "white" | "dark" | "secondary";

type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  red: "bg-accent text-white hover:bg-red-700",
  outline: "bg-white text-ink border border-border hover:bg-soft",
  ghost: "bg-transparent text-muted hover:text-ink",
  white: "bg-white text-primary hover:bg-gray-50",
  dark: "bg-white/10 text-white border border-white/25 hover:bg-white/20",
  secondary: "bg-slate-100 text-ink border border-border hover:bg-slate-200",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3.5 py-1.5 text-xs",
  md: "px-5 py-2.5 text-[13px]",
  lg: "px-7 py-3 text-[15px]",
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  sz?: Size;
  icon?: string;
  full?: boolean;
}

export function Btn({ children, variant = "primary", sz = "md", icon, full, className = "", ...props }: BtnProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-bold cursor-pointer border-none transition-all duration-150 hover:opacity-90 hover:-translate-y-px active:translate-y-0 ${variantClasses[variant]} ${sizeClasses[sz]} ${full ? "w-full" : ""} ${className}`}
      {...props}
    >
      {icon && <span className="text-inherit">{icon}</span>}
      {children}
    </button>
  );
}
