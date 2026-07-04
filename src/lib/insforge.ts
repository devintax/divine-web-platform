import { createClient } from "@insforge/sdk";

const URL = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL || "https://insforge.dfgworld.net";
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "";

export const insforge = createClient({ baseUrl: URL, anonKey: ANON_KEY });

export type InsForgeClient = ReturnType<typeof createClient>;
export { createClient };
