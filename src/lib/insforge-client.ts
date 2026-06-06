import { createClient } from "@insforge/sdk";

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

// Browser client — for client-side React components
export const insforge = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: ANON_KEY,
});

// Server client — same SDK, used in API routes  
export const insforgeServer = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: ANON_KEY,
});
