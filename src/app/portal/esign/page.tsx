import { ExternalLink, FileSignature, LockKeyhole, ShieldCheck } from "lucide-react";

export default function ESignPage() {
  const docusealUrl = process.env.NEXT_PUBLIC_DOCUSEAL_URL || "";
  const docusealConfigured = Boolean(docusealUrl && (process.env.DOCUSEAL_URL || process.env.DOCUSEAL_API_URL) && process.env.DOCUSEAL_API_KEY);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-ink">E-Signature</h1>
        <p className="mt-1 text-xs text-muted">Self-hosted Docuseal signing for notary documents, built gradually.</p>
      </div>
      <div className="rounded-2xl border border-border bg-white p-6">
        {docusealConfigured ? (
          <div className="grid gap-5 md:grid-cols-[1fr_280px] md:items-center">
            <div>
              <ShieldCheck className="text-primary" size={34} />
              <h2 className="mt-4 text-xl font-black text-ink">DocuSeal is connected</h2>
              <p className="mt-2 text-sm leading-7 text-muted">
                Signing requests are created from staff deliverables and sent to clients through DocuSeal.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {["Templates ready", "Client signing links", "Webhook tracking"].map((item) => (
                  <div key={item} className="rounded-xl border border-border bg-soft p-4 text-sm font-bold text-ink">{item}</div>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-blue-50 p-5">
              <LockKeyhole className="text-primary" size={24} />
              <div className="mt-3 text-sm font-black text-ink">Secure signing</div>
              <p className="mt-2 text-xs leading-6 text-muted">DocuSeal opens in its own protected workspace.</p>
              <a
                href={docusealUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0B4DA2] px-4 py-2 text-sm font-bold text-white"
              >
                Open DocuSeal <ExternalLink size={15} />
              </a>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-[1fr_260px] md:items-center">
            <div>
              <FileSignature className="text-primary" size={34} />
              <h2 className="mt-4 text-xl font-black text-ink">Docuseal is ready to connect</h2>
              <p className="mt-2 text-sm leading-7 text-muted">
                Set DOCUSEAL_API_URL, DOCUSEAL_API_KEY, and NEXT_PUBLIC_DOCUSEAL_URL after the Coolify Docuseal instance is live. Staff can then route notary PDFs for signature from this page.
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 p-5">
              <LockKeyhole className="text-primary" size={24} />
              <div className="mt-3 text-sm font-black text-ink">Manual-first rollout</div>
              <p className="mt-2 text-xs leading-6 text-muted">No document generation is included. Staff uploads and sends final PDFs when templates are approved.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
