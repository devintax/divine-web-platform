import { Card } from "./Card";
import { Pill } from "./Pill";

interface Suggestion {
  icon: string;
  service: string;
  text: string;
}

export function CrossSellBanner({ suggestions, onActionClick }: { suggestions: Suggestion[]; onActionClick: (svc: string) => void }) {
  if (!suggestions.length) return null;
  return (
    <Card>
      <div className="font-extrabold text-xs uppercase tracking-wide text-muted mb-3">Recommended Next</div>
      <div className="space-y-3">
        {suggestions.map((s) => (
          <button key={s.service} onClick={() => onActionClick(s.service)} className="w-full text-left bg-slate-50 rounded-xl p-3 flex items-start gap-3 border border-transparent hover:border-[#0B4DA2] hover:shadow-sm transition-all cursor-pointer">
            <span className="text-base">{s.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-[#0B4DA2] uppercase tracking-wide">{s.service}</span>
                <Pill tone="blue">Add</Pill>
              </div>
              <p className="text-xs text-muted leading-snug">{s.text}</p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

export default CrossSellBanner;

