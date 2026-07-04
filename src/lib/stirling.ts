import "server-only";

const STIRLING_URL = (process.env.STIRLING_PDF_URL || "").replace(/\/$/, "");
const STIRLING_KEY = process.env.STIRLING_PDF_API_KEY || "";

function ensureConfigured() {
  if (!STIRLING_URL || !STIRLING_KEY) throw new Error("Stirling-PDF is not configured");
}

function authHeaders() {
  ensureConfigured();
  return { "X-API-KEY": STIRLING_KEY };
}

async function readPdf(res: Response, action: string) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Stirling ${action} failed: HTTP ${res.status}${text ? ` - ${text.slice(0, 180)}` : ""}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function compressPdf(buffer: Buffer, filename = "document.pdf", level: "low" | "medium" | "high" | "extreme" = "medium") {
  const form = new FormData();
  form.append("fileInput", new Blob([buffer as any], { type: "application/pdf" }), filename);
  form.append("optimizeLevel", level);
  const res = await fetch(`${STIRLING_URL}/api/v1/general/compress-pdf`, { method: "POST", headers: authHeaders(), body: form });
  return readPdf(res, "compress");
}

export async function mergePdfs(files: Array<{ buffer: Buffer; filename: string }>) {
  const form = new FormData();
  for (const file of files) form.append("fileInput", new Blob([file.buffer as any], { type: "application/pdf" }), file.filename);
  form.append("sortType", "byFileName");
  const res = await fetch(`${STIRLING_URL}/api/v1/general/merge-pdfs`, { method: "POST", headers: authHeaders(), body: form });
  return readPdf(res, "merge");
}

export async function convertToPdf(buffer: Buffer, filename: string, mimeType: string) {
  const form = new FormData();
  form.append("fileInput", new Blob([buffer as any], { type: mimeType }), filename);
  const res = await fetch(`${STIRLING_URL}/api/v1/convert/file/pdf`, { method: "POST", headers: authHeaders(), body: form });
  return readPdf(res, "convert");
}

export async function watermarkPdf(buffer: Buffer, filename = "document.pdf", text = "DIVINE FINANCIAL GROUP - CONFIDENTIAL") {
  const form = new FormData();
  form.append("fileInput", new Blob([buffer as any], { type: "application/pdf" }), filename);
  form.append("watermarkText", text);
  form.append("fontSize", "30");
  form.append("rotation", "45");
  form.append("opacity", "0.2");
  const res = await fetch(`${STIRLING_URL}/api/v1/stamp/add-watermark`, { method: "POST", headers: authHeaders(), body: form });
  return readPdf(res, "watermark");
}

export async function ocrPdf(buffer: Buffer, filename = "document.pdf", language = "eng") {
  const form = new FormData();
  form.append("fileInput", new Blob([buffer as any], { type: "application/pdf" }), filename);
  form.append("languages", language);
  const res = await fetch(`${STIRLING_URL}/api/v1/misc/ocr-pdf`, { method: "POST", headers: authHeaders(), body: form });
  return readPdf(res, "ocr");
}

export async function checkStirlingHealth() {
  try {
    if (!STIRLING_URL || !STIRLING_KEY) return { configured: false, online: false, detail: "not configured" };
    const res = await fetch(`${STIRLING_URL}/api/v1/info/health`, { headers: authHeaders(), cache: "no-store" });
    return { configured: true, online: res.ok, detail: res.ok ? "health reachable" : `HTTP ${res.status}` };
  } catch (error) {
    return { configured: Boolean(STIRLING_URL && STIRLING_KEY), online: false, detail: error instanceof Error ? error.message : "offline" };
  }
}
