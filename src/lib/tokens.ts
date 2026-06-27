export const BRAND = {
  blue: "#0B4DA2",
  blueDark: "#083a7a",
  red: "#C8102E",
  gold: "#D97706",
  green: "#16A34A",
  ink: "#0F172A",
  muted: "#475569",
  border: "#E2E8F0",
  soft: "#F8FAFC",
} as const;

export const SERVICE_COLORS = {
  formation: BRAND.blue,
  tax: BRAND.green,
  insurance: BRAND.gold,
  notary: BRAND.red,
  bookkeeping: "#7C3AED",
} as const;
