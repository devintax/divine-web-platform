"use client";

interface OptionGridProps {
  options: {
    value: string;
    label: string;
    description?: string;
    badge?: string;
    badgeColor?: "green" | "blue" | "gold";
    icon?: string;
  }[];
  selected: string | string[];
  onSelect: (value: string) => void;
  multiSelect?: boolean;
}

const BADGE_STYLES: Record<string, string> = {
  green: "bg-green-100 text-green-700 border-green-200",
  blue: "bg-blue-100 text-[#0B4DA2] border-blue-200",
  gold: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function OptionGrid({ options, selected, onSelect, multiSelect }: OptionGridProps) {
  const isSelected = (val: string) =>
    multiSelect ? (selected as string[]).includes(val) : selected === val;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((opt) => {
        const active = isSelected(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`relative text-left p-4 rounded-xl border-2 transition-all duration-150 min-h-[56px] focus:outline-none focus:ring-2 focus:ring-[#0B4DA2] focus:ring-offset-2 ${
              active
                ? "border-[#0B4DA2] bg-[#EBF2FF] text-[#0B4DA2]"
                : "border-[#E2E8F0] bg-white text-ink hover:bg-slate-50"
            }`}
          >
            {opt.badge && (
              <span className={`absolute top-2 right-2 text-[9px] font-bold uppercase border px-1.5 py-0.5 rounded ${BADGE_STYLES[opt.badgeColor || "blue"]}`}>{opt.badge}</span>
            )}
            <div className="flex items-center gap-2 mb-1">
              {active && <span className="text-base font-bold">✓</span>}
              {opt.icon && <span>{opt.icon}</span>}
              <span className="font-bold text-sm">{opt.label}</span>
            </div>
            {opt.description && <span className="text-xs text-muted leading-relaxed block">{opt.description}</span>}
          </button>
        );
      })}
    </div>
  );
}

export { OptionGrid };
