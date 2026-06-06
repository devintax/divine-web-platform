import { insforgeServer } from "./insforge-client";

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
          createSignedUrl: async () => ({ data: { signedUrl: "" }, error: null }),
        };
      },
    },
  };
}
