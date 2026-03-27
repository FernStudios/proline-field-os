// ── Permission system ─────────────────────────────────────────────
// Owner always has full access.
// Office/Foreman/Crew permissions are configurable per-account by the Owner in Admin.
// This file provides helpers to check permissions throughout the app.

import { useStore } from '../store'

// All available permissions with human-readable labels + grouping
export const PERMISSION_DEFS = [
  { key: 'dashboard',         label: 'Dashboard',                group: 'General' },
  { key: 'kanban',            label: 'Kanban board',             group: 'General' },
  { key: 'schedule',          label: 'Schedule',                 group: 'General' },
  { key: 'jobs_view',         label: 'View jobs',                group: 'Jobs' },
  { key: 'jobs_edit',         label: 'Create & edit jobs',       group: 'Jobs' },
  { key: 'estimates',         label: 'Estimates',                group: 'Jobs' },
  { key: 'contracts',         label: 'Contracts',                group: 'Jobs' },
  { key: 'change_orders',     label: 'Change orders',            group: 'Jobs' },
  { key: 'materials_view',    label: 'View materials',           group: 'Materials' },
  { key: 'materials_storage', label: 'Storage locations',        group: 'Materials' },
  { key: 'comms_log',         label: 'Communication log',        group: 'Communications' },
  { key: 'invoices_view',     label: 'View invoices',            group: 'Financial' },
  { key: 'invoices_edit',     label: 'Create invoices',          group: 'Financial' },
  { key: 'payments',          label: 'Record payments',          group: 'Financial' },
  { key: 'leads',             label: 'Leads pipeline',           group: 'Financial' },
  { key: 'expenses_view',     label: 'View expenses',            group: 'Financial' },
  { key: 'expenses_edit',     label: 'Add/edit expenses',        group: 'Financial' },
  { key: 'pl',                label: 'P&L reports',              group: 'Financial' },
  { key: 'payroll',           label: 'Payroll',                  group: 'Financial' },
  { key: 'crew_view',         label: 'View crew roster',         group: 'Team' },
  { key: 'admin',             label: 'Admin settings',           group: 'Admin' },
  { key: 'template_setup',    label: 'AI template setup',        group: 'Admin' },
]

export const PERMISSION_GROUPS = [...new Set(PERMISSION_DEFS.map(p => p.group))]

// Check if current viewAsRole has a given permission
// Owner always returns true
export function usePermission(key) {
  const viewAsRole = useStore(s => s.viewAsRole)
  const rolePermissions = useStore(s => s.rolePermissions)
  if (!viewAsRole || viewAsRole === 'owner') return true
  if (viewAsRole === 'customer') return false
  const perms = rolePermissions?.[viewAsRole]
  if (!perms) return false
  return !!perms[key]
}

// Get all permissions for a role
export function getRolePermissions(rolePermissions, role) {
  if (role === 'owner') return Object.fromEntries(PERMISSION_DEFS.map(p => [p.key, true]))
  return rolePermissions?.[role] || {}
}
