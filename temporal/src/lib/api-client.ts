const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_URL || 'http://127.0.0.1:7131';
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY || '';

async function fetchInsForge(path: string, options?: RequestInit) {
  const res = await fetch(`${INSFORGE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANON_KEY,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`InsForge API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function dbFrom(table: string) {
  return {
    select: async (selector: string) => {
      const data = await fetchInsForge(`/api/v1/entity/${table}`);
      return { data: data || [], error: null };
    },
    insert: async (values: Record<string, unknown>) => {
      const data = await fetchInsForge(`/api/v1/entity/${table}`, { method: 'POST', body: JSON.stringify(values) });
      return { data: data || [], error: null };
    },
    update: async (values: Record<string, unknown>) => {
      return {
        eq: async (column: string, value: unknown) => {
          const data = await fetchInsForge(`/api/v1/entity/${table}`, { method: 'PATCH', body: JSON.stringify({ filter: { [column]: value }, update: values }) });
          return { data, error: null };
        }
      };
    },
    delete: async () => ({ eq: async () => ({}) }),
    order: async () => dbFrom(table),
    limit: async (n: number) => dbFrom(table), // simplified
    eq: (column: string, value: unknown) => {
      const self = dbFrom(table);
      return { ...self,
        single: async () => {
          const { data } = await self;
          const rows = data || [];
          const matches = rows.filter((r: any) => r[column] === value || r[column] == value);
          return { data: matches[0] || null, error: null };
        }
      } as any;
    },
    in: (column: string, values: unknown[]) => {
      const self = dbFrom(table);
      return { ...self,
        single: async () => {
          const { data } = await self;
          const rows = data || [];
          const matches = rows.filter((r: any) => values.includes(r[column]));
          return { data: matches[0] || null, error: null };
        }
      } as any;
    },
    lte: () => dbFrom(table),
    gte: () => dbFrom(table),
  };
}
