import { cookies } from "next/headers";
import { getSupabaseAdmin } from "./supabase-admin";

export async function createSupabaseServerClient() {
  const store = await cookies();
  const uid = store.get("d_user_id")?.value;
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
