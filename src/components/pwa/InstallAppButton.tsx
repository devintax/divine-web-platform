"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setStandalone(installed);
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setStandalone(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (standalone || (!promptEvent && !isIos)) return null;

  async function install() {
    if (!promptEvent) {
      setShowIosHelp((value) => !value);
      return;
    }
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  return (
    <div className="relative">
      <button type="button" onClick={install} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold text-ink hover:bg-slate-50">
        <Download size={18} aria-hidden="true" />
        Install DFG Portal
      </button>
      {showIosHelp && (
        <div className="mx-3 mb-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-[#0B4DA2]">
          <Share size={16} className="mb-1" aria-hidden="true" />
          In Safari, tap Share, then Add to Home Screen.
        </div>
      )}
    </div>
  );
}
