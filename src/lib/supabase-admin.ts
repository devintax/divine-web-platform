import { createClient } from "@insforge/sdk";

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;
const SERVER_KEY = process.env.INSFORGE_SERVICE_KEY || ANON_KEY;

const insforgeServer = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: SERVER_KEY,
  isServerMode: true,
});

/**
 * Admin server-side InsForge client with full DB access.
 * Provides a Supabase-compatible `from()` query builder on `insforgeServer.database`.
 */
export function getSupabaseAdmin() {
  return {
    from: (table: string) => insforgeServer.database.from(table),
    auth: insforgeServer.auth,
    storage: {
      from: (bucket: string) => {
        const b = insforgeServer.storage.from(bucket);
        return {
          upload: async (path: string, data: File | Blob | Buffer, opts?: { contentType?: string; upsert?: boolean }) => {
            let blob: Blob;
            if (Buffer.isBuffer(data)) {
              blob = new Blob([data as any], { type: opts?.contentType || "application/octet-stream" });
            } else {
              blob = data as File | Blob;
            }
            return b.upload(path, blob);
          },
          download: (path: string) => b.download(path),
          remove: async (paths: string[] | string) => {
            const arr = Array.isArray(paths) ? paths : [paths];
            for (const p of arr) await b.remove(p);
            return { data: { message: "Deleted" }, error: null };
          },
          createSignedUrl: async (path: string) => {
            const publicUrl = typeof (b as any).getPublicUrl === "function" ? (b as any).getPublicUrl(path) : null;
            return { data: { signedUrl: publicUrl?.data?.publicUrl || publicUrl?.publicUrl || "" }, error: null };
          },
        };
      },
    },
  };
}
