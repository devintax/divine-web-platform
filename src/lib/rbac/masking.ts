import type { UserRole } from './roles'

const FULL_ACCESS_ROLES: UserRole[] = [
  'super_admin',
  'manager',
  'accountant',
  'specialist',
  'broker',
  'notary',
]

export function maskSSN(ssn: string, role: UserRole): string {
  if (!ssn) return ''
  if (FULL_ACCESS_ROLES.includes(role)) return ssn
  const digits = ssn.replace(/\D/g, '')
  return digits.length === 9 ? `***-**-${digits.slice(-4)}` : `***-**-${digits.slice(-4)}`
}

export function maskEIN(ein: string, role: UserRole): string {
  if (!ein) return ''
  if (FULL_ACCESS_ROLES.includes(role)) return ein
  const digits = ein.replace(/\D/g, '')
  return digits.length === 9 ? `**-${digits.slice(-6)}` : `**-${digits.slice(-6)}`
}

export function maskPhone(phone: string, role: UserRole): string {
  if (!phone) return ''
  if (FULL_ACCESS_ROLES.includes(role) || role === 'support') return phone
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 ? `(${digits.slice(0, 3)}) ***-${digits.slice(-4)}` : phone
}

export function maskEmail(email: string, role: UserRole): string {
  if (!email) return ''
  if (role === 'super_admin' || role === 'manager' || role === 'support') return email
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  if (local.length <= 2) return `*${local.slice(-1)}@${domain}`
  return `${local[0]}${'*'.repeat(local.length - 2)}${local.slice(-1)}@${domain}`
}

export function maskAddress(address: string, role: UserRole): string {
  if (!address) return ''
  if (FULL_ACCESS_ROLES.includes(role)) return address
  const parts = address.split(',').map((part) => part.trim())
  if (!parts.length) return address
  const firstSegment = parts[0].split(' ').slice(0, -1).join(' ')
  const lastSegment = parts.length > 1 ? parts[parts.length - 1] : ''
  return `${firstSegment || '***'} ***, ${lastSegment}`.trim().replace(/^, /, '')
}
