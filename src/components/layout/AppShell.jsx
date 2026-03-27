import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useStore } from '../../store'
import { cn } from '../../lib/utils'

const NAV_ALL = [
  { path: '/dashboard', icon: HomeIcon, label: 'Dashboard', perm: 'dashboard' },
  { path: '/jobs', icon: BriefcaseIcon, label: 'Jobs', perm: 'jobs_view' },
  { path: '/invoices', icon: DollarIcon, label: 'Invoices', perm: 'invoices_view' },
  { path: '/leads', icon: FunnelIcon, label: 'Leads', perm: 'leads' },
  { path: '/more', icon: GridIcon, label: 'More', perm: null }, // always visible
]

export function AppShell({ children }) {
  const { pathname } = useLocation()

  const { user } = useAuth()
  const { settings, viewAsRole, setViewAsRole, rolePermissions } = useStore()

  // Trial banner: show days remaining if within 14-day trial
  const trialBanner = (() => {
    const createdAt = user?.created_at || user?.user_metadata?.planActivatedAt
    if (!createdAt) return null
    const daysSince = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
    const daysLeft = 14 - daysSince
    if (daysLeft <= 0) return { expired: true, daysLeft: 0 }
    if (daysLeft <= 14) return { expired: false, daysLeft }
    return null
  })()

  return (
    <div className="screen">
      <div className="page-content">
        {children}
      </div>
      <nav className="bottomnav">
        {NAV_ALL.filter(n => {
          if (!n.perm) return true  // always show
          if (!viewAsRole || viewAsRole === 'owner') return true
          if (viewAsRole === 'customer') return false
          return !!rolePermissions?.[viewAsRole]?.[n.perm]
        }).map(({ path, icon: Icon, label }) => {
          const active = path === '/' ? pathname === '/' : pathname.startsWith(path)
          return (
            <NavButton key={path} path={path} active={active} icon={<Icon active={active} />} label={label} />
          )
        })}
      </nav>
    </div>
  )
}

function NavButton({ path, active, icon, label }) {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(path)} className={cn('bottomnav-btn', active && 'active')}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}

function RoleSwitcherDropdown() {
  const { viewAsRole, setViewAsRole } = useStore()
  const [open, setOpen] = useState(false)
  const ROLES = [
    { id: 'owner',   label: 'Owner',   icon: '👑' },
    { id: 'office',  label: 'Office',  icon: '💼' },
    { id: 'foreman', label: 'Foreman', icon: '🦺' },
    { id: 'crew',    label: 'Crew',    icon: '👷' },
    { id: 'customer',label: 'Customer',icon: '🏠' },
  ]
  const current = ROLES.find(r => r.id === viewAsRole) || ROLES[0]
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={cn('flex items-center gap-1 text-xs font-semibold rounded-lg px-2 py-1 transition-colors', viewAsRole !== 'owner' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/70 hover:text-white')}>
        <span>{current.icon}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <span className="text-xs opacity-60">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 min-w-[140px]">
          {ROLES.map(role => (
            <button key={role.id} onClick={() => { setViewAsRole(role.id); setOpen(false) }}
              className={cn('w-full text-left px-3 py-2.5 text-xs font-medium flex items-center gap-2 transition-colors hover:bg-gray-50', viewAsRole === role.id ? 'bg-purple-50 text-purple-700' : 'text-gray-700')}>
              <span>{role.icon}</span>{role.label}
              {viewAsRole === role.id && <span className="ml-auto text-purple-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function TopNav({ title, onBack, actions, transparent }) {
  const navigate = useNavigate()
  return (
    <div className={cn('topnav', transparent && 'bg-transparent')}>
      <div className="w-10">
        {onBack && (
          <button
            onClick={typeof onBack === 'function' ? onBack : () => navigate(-1)}
            className="text-white/80 hover:text-white text-sm font-medium flex items-center gap-1"
          >
            ← Back
          </button>
        )}
      </div>
      <span className="font-display font-bold text-white text-sm truncate">{title}</span>
      <div className="w-10 flex justify-end">{actions}</div>
    </div>
  )
}

// ── Nav Icons ─────────────────────────────────────────────────────
function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <path d="M3 9.5L12 3l9 6.5V21H15v-5h-6v5H3V9.5z"
        fill={active ? '#0a3ef8' : 'none'}
        stroke={active ? '#0a3ef8' : '#94a3b8'}
        strokeWidth="1.5" strokeLinejoin="round"
      />
    </svg>
  )
}
function BriefcaseIcon({ active }) {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <rect x="2" y="7" width="20" height="15" rx="2"
        fill={active ? '#0a3ef8' : 'none'}
        stroke={active ? '#0a3ef8' : '#94a3b8'}
        strokeWidth="1.5"
      />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"
        stroke={active ? '#0a3ef8' : '#94a3b8'}
        strokeWidth="1.5"
      />
      <line x1="2" y1="14" x2="22" y2="14" stroke="white" strokeWidth="1.5" opacity={active ? '0.3' : '0'} />
    </svg>
  )
}
function DollarIcon({ active }) {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9"
        fill={active ? '#0a3ef8' : 'none'}
        stroke={active ? '#0a3ef8' : '#94a3b8'}
        strokeWidth="1.5"
      />
      <path d="M12 6v12M9 9h4.5a1.5 1.5 0 0 1 0 3H10.5a1.5 1.5 0 0 0 0 3H15"
        stroke={active ? 'white' : '#94a3b8'}
        strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  )
}
function FunnelIcon({ active }) {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <path d="M3 4h18l-7 8.5V19l-4-2V12.5L3 4z"
        fill={active ? '#0a3ef8' : 'none'}
        stroke={active ? '#0a3ef8' : '#94a3b8'}
        strokeWidth="1.5" strokeLinejoin="round"
      />
    </svg>
  )
}
function GridIcon({ active }) {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1"
        fill={active ? '#0a3ef8' : 'none'}
        stroke={active ? '#0a3ef8' : '#94a3b8'}
        strokeWidth="1.5"
      />
      <rect x="14" y="3" width="7" height="7" rx="1"
        fill={active ? '#0a3ef8' : 'none'}
        stroke={active ? '#0a3ef8' : '#94a3b8'}
        strokeWidth="1.5"
      />
      <rect x="3" y="14" width="7" height="7" rx="1"
        fill={active ? '#0a3ef8' : 'none'}
        stroke={active ? '#0a3ef8' : '#94a3b8'}
        strokeWidth="1.5"
      />
      <rect x="14" y="14" width="7" height="7" rx="1"
        fill={active ? '#0a3ef8' : 'none'}
        stroke={active ? '#0a3ef8' : '#94a3b8'}
        strokeWidth="1.5"
      />
    </svg>
  )
}
