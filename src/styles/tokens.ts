export const brand = {
  blue: '#0B4DA2',
  blueDark: '#083a7a',
  red: '#C8102E',
  green: '#16A34A',
  gold: '#D97706',
  ink: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  soft: '#F8FAFC',
  white: '#FFFFFF',
} as const;

export const SERVICE_COLORS: Record<string, string> = {
  formation: brand.blue,
  tax: brand.green,
  insurance: brand.gold,
  notary: brand.red,
  bookkeeping: '#7C3AED',
};

export const SERVICE_WEIGHTS: Record<string, number> = {
  formation: 25, tax: 25, insurance: 20, bookkeeping: 20, notary: 10,
};

export const STATUS_MULTIPLIER: Record<string, number> = {
  completed: 1.0, active: 0.7, pending: 0.3, draft: 0.1, cancelled: 0,
};
