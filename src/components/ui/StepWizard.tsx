"use client";

import { ReactNode } from "react";
import { Btn } from "./Btn";

interface Step {
  label: string;
}

export function StepWizard({
  steps,
  currentStep,
  serviceColor,
  title,
  onBack,
  onContinue,
  canContinue,
  isLastStep,
  children,
}: {
  steps: Step[];
  currentStep: number;
  serviceColor: string;
  title: string;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
  isLastStep: boolean;
  children: ReactNode;
}) {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] text-muted font-bold uppercase tracking-[0.5px]">Step {currentStep + 1} of {steps.length}</div>
          <div className="text-[11px] text-muted font-bold">{Math.round(((currentStep + 1) / steps.length) * 100)}% complete</div>
        </div>
        <div className="h-[3px] bg-slate-100 rounded mb-4">
          <div className="h-full rounded transition-all" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: serviceColor }} />
        </div>
        <h2 className="text-base font-black text-ink mb-1">{title}</h2>
      </div>
      <div className="p-5 pt-2">{children}</div>
      <div className="p-5 md:p-5 border-t border-border flex gap-3 bg-white md:static fixed bottom-[64px] left-0 right-0 z-40 px-4 py-3 md:bottom-auto shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        {currentStep > 0 ? (
          <Btn variant="secondary" className="flex-1" onClick={onBack}>Back</Btn>
        ) : <div className="flex-1" />}
        <Btn
          variant="primary"
          className="flex-[2] text-sm font-black"
          style={{ background: serviceColor }}
          disabled={!canContinue}
          onClick={onContinue}
        >
          {isLastStep ? "Submit Application" : "Continue"}
        </Btn>
      </div>
    </div>
  );
}

export default StepWizard;
