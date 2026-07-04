import "server-only";

const DOCUSEAL_URL = (process.env.DOCUSEAL_URL || process.env.DOCUSEAL_API_URL || "").replace(/\/$/, "");
const DOCUSEAL_KEY = process.env.DOCUSEAL_API_KEY || "";

export type DocusealSubmitter = {
  role: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  values?: Record<string, string>;
};

export type DocusealSubmission = {
  id?: number | string;
  status?: string;
  submitters?: Array<{
    id?: number | string;
    email?: string;
    name?: string;
    status?: string;
    embed_src?: string;
    slug?: string;
  }>;
  [key: string]: unknown;
};

function ensureConfigured() {
  if (!DOCUSEAL_URL || !DOCUSEAL_KEY) throw new Error("DocuSeal is not configured");
}

function headers() {
  ensureConfigured();
  return {
    "Content-Type": "application/json",
    "X-Auth-Token": DOCUSEAL_KEY,
  };
}

async function readJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error || data.message || `HTTP ${res.status}`;
    throw new Error(`DocuSeal request failed: ${message}`);
  }
  return data;
}

export async function listDocusealTemplates() {
  const res = await fetch(`${DOCUSEAL_URL}/api/templates`, { headers: headers(), cache: "no-store" });
  const data = await readJson(res);
  return data.data || data.templates || data;
}

export async function getDocusealTemplate(templateId: string | number) {
  const res = await fetch(`${DOCUSEAL_URL}/api/templates/${templateId}`, { headers: headers(), cache: "no-store" });
  return readJson(res);
}

export async function createDocusealSubmission(params: {
  templateId?: string | number;
  title?: string;
  documentUrl?: string;
  submitters: DocusealSubmitter[];
  sendEmail?: boolean;
  metadata?: Record<string, unknown>;
}) {
  const payload: Record<string, unknown> = {
    send_email: params.sendEmail ?? true,
    submitters: params.submitters.map((submitter) => ({
      role: submitter.role,
      email: submitter.email,
      name: submitter.name || submitter.email,
      phone: submitter.phone || undefined,
      values: submitter.values || {},
    })),
    metadata: params.metadata || {},
  };

  if (params.templateId) payload.template_id = params.templateId;
  if (params.documentUrl) payload.documents = [{ name: params.title || "Document", url: params.documentUrl }];
  if (params.title) payload.name = params.title;

  const res = await fetch(`${DOCUSEAL_URL}/api/submissions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  return readJson(res) as Promise<DocusealSubmission>;
}

export async function getDocusealSubmission(submissionId: string | number) {
  const res = await fetch(`${DOCUSEAL_URL}/api/submissions/${submissionId}`, { headers: headers(), cache: "no-store" });
  return readJson(res) as Promise<DocusealSubmission>;
}

export function getDocusealSigningUrl(submission: DocusealSubmission, email?: string | null) {
  const submitter = submission.submitters?.find((item) => !email || item.email?.toLowerCase() === email.toLowerCase()) || submission.submitters?.[0];
  if (submitter?.embed_src) return submitter.embed_src;
  if (submitter?.slug) return `${DOCUSEAL_URL}/s/${submitter.slug}`;
  return null;
}

export async function checkDocusealHealth() {
  try {
    if (!DOCUSEAL_URL || !DOCUSEAL_KEY) return { configured: false, online: false, detail: "not configured" };
    const res = await fetch(`${DOCUSEAL_URL}/api/templates`, { headers: headers(), cache: "no-store" });
    return { configured: true, online: res.ok, detail: res.ok ? "templates reachable" : `HTTP ${res.status}` };
  } catch (error) {
    return { configured: Boolean(DOCUSEAL_URL && DOCUSEAL_KEY), online: false, detail: error instanceof Error ? error.message : "offline" };
  }
}
