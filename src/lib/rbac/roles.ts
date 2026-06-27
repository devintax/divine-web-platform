export type UserRole =
  | 'super_admin'
  | 'manager'
  | 'accountant'
  | 'specialist'
  | 'broker'
  | 'notary'
  | 'tax_intern'
  | 'support'
  | 'client'

export const ROLES: UserRole[] = [
  'super_admin',
  'manager',
  'accountant',
  'specialist',
  'broker',
  'notary',
  'tax_intern',
  'support',
  'client',
]

export const ROLE_LEVEL: Record<UserRole, number> = {
  super_admin: 100,
  manager: 90,
  accountant: 70,
  specialist: 60,
  broker: 60,
  notary: 60,
  tax_intern: 40,
  support: 30,
  client: 10,
}

export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: 'Super Administrator',
  manager: 'General Manager',
  accountant: 'Senior Accountant',
  specialist: 'Business Specialist',
  broker: 'Insurance Broker',
  notary: 'Notary Officer',
  tax_intern: 'Tax Intern',
  support: 'Client Support',
  client: 'Client',
}

export const ROLE_COLOR: Record<UserRole, string> = {
  super_admin: '#7C3AED',
  manager: '#C8102E',
  accountant: '#0B4DA2',
  specialist: '#0891b2',
  broker: '#D97706',
  notary: '#16A34A',
  tax_intern: '#64748B',
  support: '#6366f1',
  client: '#94A3B8',
}

export const ROLE_BADGE_ICON: Record<UserRole, string> = {
  super_admin: '👑',
  manager: '🏛',
  accountant: '📊',
  specialist: '🧠',
  broker: '🧾',
  notary: '✒️',
  tax_intern: '🧾',
  support: '💬',
  client: '👤',
}

export function isStaff(role: UserRole): boolean {
  return role !== 'client'
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === 'super_admin'
}

export function hasMinLevel(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole]
}
