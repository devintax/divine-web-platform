import "server-only";

const PRODUCTION_APP_URL = "https://web.dfgworld.net";
const LOCAL_APP_URL = "http://localhost:3000";

function cleanUrl(value: string | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;
  if (candidate.includes("0.0.0.0")) return null;

  try {
    const url = new URL(candidate.startsWith("http") ? candidate : `https://${candidate}`);
    return url.origin;
  } catch {
    return null;
  }
}

export function getPublicAppUrl() {
  return (
    cleanUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    cleanUrl(process.env.APP_URL) ||
    (process.env.NODE_ENV === "production" ? PRODUCTION_APP_URL : LOCAL_APP_URL)
  );
}

export function publicAppUrl(path: string) {
  return new URL(path, getPublicAppUrl()).toString();
}
