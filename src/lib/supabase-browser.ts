import { insforge } from "./insforge-client";

const client = {
  from: (table: string) => insforge.database.from(table),
  auth: {
    signInWithPassword: (p: { email: string; password: string }) =>
      insforge.auth.signInWithPassword(p),
    signUp: async (p: { email: string; password: string; options?: { data?: Record<string, unknown> } }) => {
      // Map Supabase-style signUp to InsForge
      return insforge.auth.signUp({
        email: p.email,
        password: p.password,
        name: (p.options?.data?.legal_name as string) || p.email,
      });
    },
    signOut: () => insforge.auth.signOut(),
    getUser: () => insforge.auth.getCurrentUser(),
    getSession: async () => {
      const { data, error } = await insforge.auth.getCurrentUser();
      return { data: { session: data?.user ? { user: data.user } : null }, error };
    },
  },
  storage: {
    from: (bucket: string) => insforge.storage.from(bucket),
  },
};

export function createSupabaseBrowserClient() {
  return client;
}
