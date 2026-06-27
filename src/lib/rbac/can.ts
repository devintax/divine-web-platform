import { PERMISSIONS, type Permission } from './permissions'
import type { UserRole } from './roles'

export function can(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS[permission]?.[role] ?? false
}

export function canAll(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => can(role, permission))
}

export function canAny(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => can(role, permission))
}

export function requirePermission(
  role: UserRole,
  permission: Permission
): Response | null {
  if (!can(role, permission)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}
