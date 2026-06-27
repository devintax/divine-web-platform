import { PERMISSIONS } from '@/lib/rbac/permissions'
import { ROLE_LABEL, ROLE_COLOR, ROLES } from '@/lib/rbac/roles'

function formatPermissionLabel(permission: string) {
  return permission
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function RolesMatrixPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black">🔐 Role Permissions Matrix</h1>
        <p className="max-w-2xl text-sm text-muted">
          This table is generated from the RBAC permission constants used by middleware and API route guards.
        </p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Permission</th>
              {ROLES.map((role) => (
                <th key={role} className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ROLE_COLOR[role] }} />
                    {ROLE_LABEL[role]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(PERMISSIONS).map((permission) => (
              <tr key={permission} className="border-t border-slate-100 even:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">{formatPermissionLabel(permission)}</td>
                {ROLES.map((role) => (
                  <td key={`${permission}-${role}`} className="px-4 py-3 text-center text-xs font-bold">
                    {PERMISSIONS[permission as keyof typeof PERMISSIONS][role] ? '✅' : '✗'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
