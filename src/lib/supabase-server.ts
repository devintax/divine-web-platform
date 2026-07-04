import { cookies } from "next/headers";
import { getSupabaseAdmin } from "./supabase-admin";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session-token";

export async function createSupabaseServerClient() {
  const store = await cookies();
  const uid = verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value || null)?.authId;
  return {
    auth: {
      getUser: async () => {
        if (!uid) return { data: { user: null }, error: null };
        return { data: { user: { id: uid } }, error: null };
      },
    },
    from: (table: string) => getSupabaseAdmin().from(table),
    storage: getSupabaseAdmin().storage,
  };
}
