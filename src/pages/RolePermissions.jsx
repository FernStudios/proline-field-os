import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useStore } from '../store'
import { TopNav } from '../components/layout/AppShell'
import { SectionTitle } from '../components/ui'
import { PERMISSION_DEFS, PERMISSION_GROUPS } from '../lib/permissions'
import { cn } from '../lib/utils'
import { toast } from '../components/ui'

const ROLES = [
  { id: 'office',  label: 'Office',  icon: '💼', desc: 'Administrative staff, office managers, or secretary' },
  { id: 'foreman', label: 'Foreman', icon: '🦺', desc: 'Field supervisors and project leads' },
  { id: 'crew',    label: 'Crew',    icon: '👷', desc: 'Field workers and laborers' },
]

export default function RolePermissions() {
  const navigate = useNavigate()
  const { rolePermissions, setRolePermission, updateRolePermissions, syncToSupabase } = useStore()
  const { user } = useAuth()

  const save = async () => {
    if (user?.id && syncToSupabase) {
      await syncToSupabase(user.id)
      toast('Role permissions saved')
    } else {
      toast('Saved locally')
    }
  }

  const toggleAll = (role, value) => {
    const patch = Object.fromEntries(PERMISSION_DEFS.map(p => [p.key, value]))
    updateRolePermissions(role, patch)
  }

  return (
    <div className="page">
      <TopNav title="Role Permissions" onBack={() => navigate('/admin')}
        actions={
          <button onClick={save} className="text-xs font-bold text-white bg-brand rounded-lg px-3 py-1.5">
            Save
          </button>
        }
      />

      <div className="page-content px-4 pt-4 pb-8">
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Control exactly what each role can see and do in your account.
          Owner always has full access and cannot be restricted.
          Customize each role to match how your team actually operates.
        </p>

        {ROLES.map(role => {
          const perms = rolePermissions?.[role.id] || {}
          const allOn = PERMISSION_DEFS.every(p => perms[p.key])
          const allOff = PERMISSION_DEFS.every(p => !perms[p.key])
          const enabledCount = PERMISSION_DEFS.filter(p => perms[p.key]).length

          return (
            <div key={role.id} className="mb-6">
              {/* Role header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{role.icon}</span>
                  <div>
                    <p className="font-bold text-sm text-navy">{role.label}</p>
                    <p className="text-xs text-gray-400">{role.desc} · {enabledCount}/{PERMISSION_DEFS.length} permissions</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleAll(role.id, true)}
                    className="text-xs font-semibold text-emerald-600 border border-emerald-200 rounded-lg px-2 py-1 hover:bg-emerald-50">
                    All on
                  </button>
                  <button onClick={() => toggleAll(role.id, false)}
                    className="text-xs font-semibold text-red-500 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50">
                    All off
                  </button>
                </div>
              </div>

              {/* Permission groups */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {PERMISSION_GROUPS.map((group, gi) => {
                  const groupPerms = PERMISSION_DEFS.filter(p => p.group === group)
                  return (
                    <div key={group} className={cn(gi > 0 && 'border-t border-gray-100')}>
                      <div className="px-4 py-2 bg-gray-50">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{group}</p>
                      </div>
                      {groupPerms.map((perm, pi) => (
                        <label key={perm.key}
                          className={cn('flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors', pi > 0 && 'border-t border-gray-50')}>
                          <span className="text-sm text-gray-700">{perm.label}</span>
                          <div className="relative">
                            <input type="checkbox" className="sr-only"
                              checked={!!perms[perm.key]}
                              onChange={e => setRolePermission(role.id, perm.key, e.target.checked)} />
                            <div className={cn('w-10 h-6 rounded-full transition-colors', perms[perm.key] ? 'bg-brand' : 'bg-gray-200')}>
                              <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform', perms[perm.key] ? 'left-5' : 'left-1')} />
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Owner notice */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-2">
          <p className="text-xs font-semibold text-blue-800 mb-1">👑 Owner — always full access</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            The account owner always has access to everything. Owner permissions cannot be restricted.
          </p>
        </div>
      </div>
    </div>
  )
}
