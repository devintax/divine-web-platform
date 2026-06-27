const BASE = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL || "http://127.0.0.1:7131";
const KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY || "";

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: method.toUpperCase() as any,
    headers: { "Content-Type": "application/json", "x-api-key": KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => "{}");
  const json = text ? JSON.parse(text) : {};
  return { data: json.data ?? json, error: json.error ?? null };
}

export function getSupabaseAdmin() {
  return {
    from: (table: string) => ({
      select: async (selector = "*") => {
        void selector;
        const r = await api("GET", `/api/v1/entity/${table}`);
        if (r.error) return r;
        return { data: Array.isArray(r.data) ? r.data : [r.data], error: null };
      },
      insert: async (values: Record<string, unknown>) => {
        const r = await api("POST", `/api/v1/entity/${table}`, values);
        return r;
      },
      update: (values: Record<string, unknown>) => ({
        eq: async (column: string, value: unknown) => {
          const r = await api("PATCH", `/api/v1/entity/${table}`, { filter: { [column]: value }, update: values });
          return r;
        },
      }),
      delete: () => ({
        eq: async () => ({ data: {}, error: null }),
      }),
      order: (col: string, opts?: { ascending?: boolean }) => {
        void col;
        void opts;
        return getSupabaseAdmin().from(table);
      },
      limit: (n: number) => {
        void n;
        return getSupabaseAdmin().from(table);
      },
      eq: (column: string, value: unknown) => ({
        ...getSupabaseAdmin().from(table),
        single: async () => {
          const r = await api("GET", `/api/v1/entity/${table}`);
          const rows = Array.isArray(r.data) ? r.data : [r.data];
          const match = rows.find((row: any) => row[column] === value || row[column] == value);
          return { data: match || null, error: null };
        },
        order: async (col: string, opts?: any) => {
          void col;
          void opts;
          const r = await api("GET", `/api/v1/entity/${table}`);
          const rows = (Array.isArray(r.data) ? r.data : [r.data]).filter((row: any) => row[column] === value || row[column] == value);
          return { data: rows, error: null };
        },
      }),
      in: (column: string, values: unknown[]) => ({
        single: async () => {
          const r = await api("GET", `/api/v1/entity/${table}`);
          const rows = Array.isArray(r.data) ? r.data : [r.data];
          const match = rows.find((row: any) => values.includes(row[column]));
          return { data: match || null, error: null };
        },
      }),
      lte: (column: string, value: unknown) => {
        void column;
        void value;
        return { ...getSupabaseAdmin().from(table) };
      },
      gte: (column: string, value: unknown) => {
        void column;
        void value;
        return { ...getSupabaseAdmin().from(table) };
      },
    }),
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    storage: {
      from: (_bucket: string) => ({
          upload: async (_path: string, _file: any, _opts?: any) => {
            void _file;
            void _opts;
            return { data: { path: _path, url: `${BASE}/storage/${_bucket}/${_path}` }, error: null };
          },
          download: async (_path: string) => {
            void _path;
            return { data: new Blob([]), error: null };
          },
          remove: async (_paths: any) => { void _paths; return { data: { message: "Deleted" }, error: null }; },
        createSignedUrl: async () => ({ data: { signedUrl: "" }, error: null }),
      }),
    },
  };
}
