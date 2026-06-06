"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

type ToastKind = "success" | "error" | "info" | "warning";
interface Toast { id: number; kind: ToastKind; message: string; }

interface ToastContextValue {
  push: (kind: ToastKind, message: string) => void;
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
  warning: (m: string) => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const remove = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { id, kind, message }]);
    if (kind !== "error") {
      const timeout = kind === "warning" ? 6000 : kind === "info" ? 5000 : 4000;
      setTimeout(() => remove(id), timeout);
    }
  }, [remove]);

  const value: ToastContextValue = {
    push,
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
    warning: (m) => push("warning", m),
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm sm:max-w-md w-[calc(100%-32px)] sm:w-auto pointer-events-none">
        {toasts.map(t => <ToastItem key={t.id} t={t} onClose={() => remove(t.id)} />)}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastItem({ t, onClose }: { t: Toast; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const id = setTimeout(() => setVisible(true), 10); return () => clearTimeout(id); }, []);
  const styles: Record<ToastKind, string> = {
    success: "bg-green-50 border-green-300 text-green-900",
    error: "bg-red-50 border-red-300 text-red-900",
    info: "bg-blue-50 border-blue-300 text-[#0B4DA2]",
    warning: "bg-amber-50 border-amber-300 text-amber-900",
  };
  const icons: Record<ToastKind, string> = { success: "✓", error: "⚠", info: "ℹ", warning: "⚠" };
  return (
    <div className={`pointer-events-auto border rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 transition-all duration-200 ${styles[t.kind]} ${visible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"}`}>
      <span className="text-base font-bold leading-none mt-0.5">{icons[t.kind]}</span>
      <span className="flex-1 text-sm font-semibold leading-snug">{t.message}</span>
      <button onClick={onClose} className="text-lg leading-none opacity-50 hover:opacity-100" aria-label="Dismiss">×</button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
