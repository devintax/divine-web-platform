"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Phone } from "lucide-react";
import { BRAND } from "@/lib/constants";

const calUrl = process.env.NEXT_PUBLIC_CAL_COM_URL || "";
const calEmbedLibUrl = process.env.NEXT_PUBLIC_EMBED_LIB_URL || "https://cal.dfgworld.net/embed/embed.js";

type CalInstruction = unknown[];
type CalFunction = ((method: string, ...args: unknown[]) => void) & {
  loaded?: boolean;
  ns: Record<string, CalFunction>;
  q: CalInstruction[];
};

declare global {
  interface Window {
    Cal?: CalFunction;
  }
}

export default function AppointmentsPage() {
  const [embedReady, setEmbedReady] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const calConfig = useMemo(() => {
    if (!calUrl) return null;

    try {
      const url = new URL(calUrl);
      return {
        origin: url.origin,
        calLink: url.pathname.replace(/^\/+/, ""),
      };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!calConfig) return;

    const container = document.getElementById("dfg-cal-inline");
    if (!container) return;

    container.innerHTML = "";
    setEmbedReady(false);
    setEmbedError(null);

    const observer = new MutationObserver(() => {
      if (container.querySelector("iframe")) {
        setEmbedReady(true);
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    if (!window.Cal) {
      const cal = ((...args: CalInstruction) => {
        cal.q.push(args);
      }) as CalFunction;
      cal.q = [];
      cal.ns = {};
      window.Cal = cal;
    }

    const cal = window.Cal;
    cal.q = cal.q || [];
    cal.ns = cal.ns || {};

    cal("init", { origin: calConfig.origin });
    cal("on", {
      action: "linkReady",
      callback: () => setEmbedReady(true),
    });
    cal("on", {
      action: "linkFailed",
      callback: (event: { detail?: { data?: { code?: string; msg?: string; message?: string } } }) => {
        const data = event.detail?.data;
        setEmbedError(data?.message || data?.msg || data?.code || "Cal.com could not load this booking page.");
      },
    });
    cal("inline", {
      elementOrSelector: "#dfg-cal-inline",
      calLink: calConfig.calLink,
      config: {
        layout: "month_view",
        theme: "light",
      },
    });
    cal("ui", {
      styles: {
        branding: {
          brandColor: "#0B4DA2",
        },
      },
    });

    if (!cal.loaded) {
      const script = document.createElement("script");
      script.src = calEmbedLibUrl;
      script.async = true;
      script.dataset.dfgCalEmbed = "true";
      script.onerror = () => setEmbedError("Cal.com embed script failed to load.");
      document.head.appendChild(script);
      cal.loaded = true;
    }

    return () => observer.disconnect();
  }, [calConfig]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-ink">Appointments</h1>
        <p className="mt-1 text-xs text-muted">Schedule notary sessions, general consultations, and staff follow-ups.</p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-5">
        {calConfig ? (
          <div className="relative min-h-[720px] overflow-hidden rounded-xl border border-border bg-white">
            {!embedReady && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-soft text-center text-sm font-bold text-muted">
                {embedError ? (
                  <div className="max-w-md rounded-xl border border-red-100 bg-white p-5 text-left shadow-sm">
                    <div className="text-sm font-black text-red-700">Scheduler could not load</div>
                    <p className="mt-2 text-sm leading-6 text-muted">{embedError}</p>
                    <a
                      href={calUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex rounded-xl bg-[#0B4DA2] px-4 py-2 text-sm font-bold text-white"
                    >
                      Open scheduler
                    </a>
                  </div>
                ) : (
                  "Loading scheduler..."
                )}
              </div>
            )}
            <div id="dfg-cal-inline" className="min-h-[720px] w-full" />
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-[1fr_280px] md:items-center">
            <div>
              <CalendarDays className="text-primary" size={32} />
              <h2 className="mt-4 text-xl font-black text-ink">Cal.com scheduling is ready to configure</h2>
              <p className="mt-2 text-sm leading-7 text-muted">
                Set NEXT_PUBLIC_CAL_COM_URL to the DFG Cal.com booking page and this panel will render the live scheduler.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {["General consultation", "Notary appointment", "Document follow-up"].map((item) => (
                  <div key={item} className="rounded-xl border border-border bg-soft p-4 text-sm font-bold text-ink">{item}</div>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-blue-50 p-5">
              <div className="text-xs font-black uppercase text-[#0B4DA2]">Need help now?</div>
              <p className="mt-2 text-sm leading-7 text-muted">Call the office and staff can schedule manually.</p>
              <a href={`tel:${BRAND.phone.replace(/[^\d+]/g, "")}`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0B4DA2] px-4 py-2 text-sm font-bold text-white">
                <Phone size={16} /> {BRAND.phone}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
