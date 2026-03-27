import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useStore } from '../store'
import { fmtM, fmtDShort } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'

const OWNER_EMAIL = 'brandyturner815@gmail.com'

// ── Mini UI components (no AppShell dependency) ────────────────
const Stat = ({ label, value, sub, color = 'text-gray-900' }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4">
    <p className="text-xs text-gray-400 mb-1">{label}</p>
    <p className={`font-bold text-xl ${color}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
)

export default function SaasAdmin() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { viewAsRole, setViewAsRole, jobs } = useStore()
  const [tab, setTab] = useState('dashboard')
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // All hooks must come before any conditional returns
  const isOwner = !!user && user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()

  useEffect(() => {
    if (isOwner) fetchAccounts()
  }, [isOwner])

  // Hard gate — only platform owner
  if (!user) return <div className="p-8 text-center text-gray-400">Not signed in</div>
  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center bg-gray-50">
        <div>
          <p className="text-4xl mb-3">🔒</p>
          <p className="font-bold text-lg text-gray-900 mb-2">Access denied</p>
          <p className="text-gray-400 text-sm mb-4">This dashboard is only accessible to the platform owner.</p>
          <button onClick={() => navigate('/dashboard')} className="text-blue-600 text-sm underline">Back to app</button>
        </div>
      </div>
    )
  }

  const fetchAccounts = async () => {
    if (!supabase) { setLoading(false); setError('Supabase not configured'); return }
    try {
      const { data, error: err } = await supabase.from('user_data').select('user_id, db')
      if (err) throw err
      const parsed = (data || []).map(row => {
        const db = row.db || {}
        const jobs = db.jobs || []
        const invoices = db.invoices || []
        const totalInvoiced = invoices.reduce((s, i) => s + (i.amount || 0), 0)
        const totalPaid = invoices.reduce((s, i) => s + (i.payments || []).reduce((p, pm) => p + (pm.amount || 0), 0), 0)
        const signupDate = db.settings?.signupDate || null
        const daysSinceSignup = signupDate ? Math.floor((Date.now() - new Date(signupDate)) / 86400000) : null
        const trialDaysLeft = daysSinceSignup !== null ? Math.max(0, 14 - daysSinceSignup) : null
        return {
          userId: row.user_id,
          coName: db.settings?.coName || '(unnamed)',
          coEmail: db.settings?.coEmail || '',
          coPhone: db.settings?.coPhone || '',
          primaryState: db.settings?.primaryState || '',
          plan: db.plan || 'trial',
          jobCount: jobs.length,
          activeJobs: jobs.filter(j => j.status === 'active').length,
          totalInvoiced,
          totalPaid,
          hasTemplate: !!db.contractTemplate,
          templateTrade: db.contractTemplateMeta?.trade || null,
          templateGenerations: db.templateGenerationCount || 0,
          jobTypeCount: (db.settings?.jobTypes || []).length,
          crewCount: (db.crew || []).length,
          schemaVersion: db.schemaVersion || 1,
          signupDate,
          trialDaysLeft,
          lastSync: db.lastSync || null,
          isOwner: db.settings?.coEmail?.toLowerCase() === OWNER_EMAIL.toLowerCase(),
        }
      })
      setAccounts(parsed)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  // ── Aggregate stats ──────────────────────────────────────────
  const totalAccounts = accounts.length
  const trialAccounts = accounts.filter(a => a.plan === 'trial' || !a.plan).length
  const paidAccounts = accounts.filter(a => a.plan && a.plan !== 'trial' && a.plan !== 'beta_free').length
  const withTemplate = accounts.filter(a => a.hasTemplate).length
  const totalJobs = accounts.reduce((s, a) => s + a.jobCount, 0)
  const totalInvoiced = accounts.reduce((s, a) => s + a.totalInvoiced, 0)
  const expiringTrial = accounts.filter(a => a.trialDaysLeft !== null && a.trialDaysLeft <= 3 && a.trialDaysLeft > 0)
  const expiredTrial = accounts.filter(a => a.trialDaysLeft === 0)

  const TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'accounts', label: `Accounts (${totalAccounts})` },
    { id: 'health', label: 'Health' },
    { id: 'viewas', label: 'View as' },
  ]

  const ROLES = [
    { id: 'owner', icon: '👑', label: 'Owner', desc: 'Full access to all features' },
    { id: 'foreman', icon: '🦺', label: 'Foreman', desc: 'Jobs, docs, schedule, comms — no financials' },
    { id: 'crew', icon: '👷', label: 'Crew', desc: 'View-only on assigned jobs' },
    { id: 'customer', icon: '🏠', label: 'Customer', desc: 'Portal only — estimate, contract, balance' },
  ]

  return (
    <div className="min-h-screen bg-gray-50" style={{fontFamily:"system-ui,sans-serif"}}>

      {/* Header */}
      <div style={{background:'#050d1f'}} className="px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="font-bold text-white text-sm">Proline Field OS · Platform Admin</p>
            <p className="text-white/40 text-xs">{user.email}</p>
          </div>
          <button onClick={() => navigate('/dashboard')}
            className="text-white/60 text-xs hover:text-white border border-white/20 rounded-lg px-3 py-1.5">
            ← App
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto flex">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap',
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5">

        {/* ── Dashboard tab ── */}
        {tab === 'dashboard' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Total accounts" value={totalAccounts} />
              <Stat label="Paid" value={paidAccounts} color="text-emerald-600" sub={`${totalAccounts - paidAccounts} on trial`} />
              <Stat label="Total jobs" value={totalJobs} />
              <Stat label="Platform invoiced" value={fmtM(totalInvoiced)} color="text-blue-600" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat label="Template setup" value={withTemplate} sub={`${totalAccounts - withTemplate} not configured`} />
              <Stat label="Trial expiring ≤3 days" value={expiringTrial.length} color={expiringTrial.length > 0 ? 'text-amber-600' : 'text-gray-900'} />
              <Stat label="Trial expired" value={expiredTrial.length} color={expiredTrial.length > 0 ? 'text-red-600' : 'text-gray-900'} />
            </div>

            {/* App health */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="font-semibold text-gray-900 text-sm mb-3">Platform health</p>
              <div className="space-y-2 text-xs">
                {[
                  ['Supabase connection', supabase ? '✓ Connected' : '✗ Not configured', supabase ? 'text-emerald-600' : 'text-red-500'],
                  ['Gemini API', 'Check Vercel env: GEMINI_API_KEY', 'text-gray-500'],
                  ['PWA manifest', '✓ Configured', 'text-emerald-600'],
                  ['Schema version', '2 (current)', 'text-emerald-600'],
                ].map(([label, val, color]) => (
                  <div key={label} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500">{label}</span>
                    <span className={`font-medium ${color}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Your own account quick stats */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="font-semibold text-gray-900 text-sm mb-3">Your account (Proline Gutter & Exteriors)</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><p className="text-xl font-bold text-gray-900">{jobs.length}</p><p className="text-xs text-gray-400">Jobs</p></div>
                <div><p className="text-xl font-bold text-gray-900">{jobs.filter(j=>j.status==='active').length}</p><p className="text-xs text-gray-400">Active</p></div>
                <div><p className="text-xl font-bold text-gray-900">{jobs.filter(j=>j.status==='complete').length}</p><p className="text-xs text-gray-400">Complete</p></div>
              </div>
            </div>
          </div>
        )}

        {/* ── Accounts tab ── */}
        {tab === 'accounts' && (
          <div>
            {loading && <p className="text-xs text-gray-400 text-center py-8">Loading accounts…</p>}
            {error && <p className="text-xs text-red-500 text-center py-4">Error: {error}</p>}
            {!loading && accounts.length === 0 && <p className="text-xs text-gray-400 text-center py-8">No accounts found</p>}
            <div className="space-y-2.5">
              {accounts.map(a => (
                <div key={a.userId} className={cn('bg-white rounded-xl border p-4', a.isOwner ? 'border-blue-200' : 'border-gray-100')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-gray-900">{a.coName}</p>
                        {a.isOwner && <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded">You</span>}
                      </div>
                      <p className="text-xs text-gray-400">{a.coEmail}{a.coPhone ? ` · ${a.coPhone}` : ''}</p>
                      <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
                        <span>{a.jobCount} jobs</span>
                        <span>{fmtM(a.totalInvoiced)} invoiced</span>
                        {a.hasTemplate && <span className="text-emerald-600">✓ Template ({a.templateTrade})</span>}
                        {!a.hasTemplate && <span className="text-amber-500">No template</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', a.plan === 'trial' || !a.plan ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-700')}>
                        {a.plan || 'trial'}
                      </span>
                      {a.trialDaysLeft !== null && a.trialDaysLeft <= 14 && (
                        <p className={cn('text-xs mt-1', a.trialDaysLeft === 0 ? 'text-red-500' : a.trialDaysLeft <= 3 ? 'text-amber-500' : 'text-gray-400')}>
                          {a.trialDaysLeft === 0 ? 'Expired' : `${a.trialDaysLeft}d left`}
                        </p>
                      )}
                      <p className="text-xs text-gray-300 mt-1">v{a.schemaVersion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Health tab ── */}
        {tab === 'health' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="font-semibold text-sm text-gray-900 mb-3">Schema health</p>
              <div className="space-y-1.5">
                {accounts.map(a => (
                  <div key={a.userId} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-600">{a.coName}</span>
                    <span className={a.schemaVersion >= 2 ? 'text-emerald-600 font-medium' : 'text-amber-500 font-medium'}>
                      {a.schemaVersion >= 2 ? `✓ v${a.schemaVersion}` : `⚠ v${a.schemaVersion} — stale`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="font-semibold text-sm text-gray-900 mb-3">Template usage</p>
              <div className="space-y-1.5">
                {accounts.map(a => (
                  <div key={a.userId} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-600">{a.coName}</span>
                    <span className="text-gray-500">{a.templateGenerations} generation{a.templateGenerations !== 1 ? 's' : ''}{a.templateTrade ? ` · ${a.templateTrade}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="font-semibold text-sm text-gray-900 mb-3">Trial status</p>
              {expiringTrial.length === 0 && expiredTrial.length === 0
                ? <p className="text-xs text-gray-400">No urgent trial issues</p>
                : <div className="space-y-1.5">
                    {[...expiredTrial, ...expiringTrial].map(a => (
                      <div key={a.userId} className={cn('flex items-center justify-between text-xs py-1.5 px-2 rounded-lg', a.trialDaysLeft === 0 ? 'bg-red-50' : 'bg-amber-50')}>
                        <span className="font-medium text-gray-700">{a.coName}</span>
                        <span className={a.trialDaysLeft === 0 ? 'text-red-600 font-bold' : 'text-amber-600 font-semibold'}>
                          {a.trialDaysLeft === 0 ? 'Expired' : `${a.trialDaysLeft} days left`}
                        </span>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {/* ── View As tab ── */}
        {tab === 'viewas' && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Switch to any role to test the app from that perspective. A banner will appear at the top of every screen while a non-owner role is active.</p>
            <div className="space-y-3 mb-5">
              {ROLES.map(role => (
                <button key={role.id}
                  onClick={() => {
                    setViewAsRole(role.id)
                    if (role.id === 'customer') {
                      const firstJob = jobs[0]
                      if (firstJob?.portalToken) navigate(`/portal/${firstJob.portalToken}`)
                      else navigate('/jobs')
                    } else {
                      navigate('/dashboard')
                    }
                  }}
                  className={cn('w-full text-left p-4 rounded-2xl border-2 transition-colors bg-white',
                    viewAsRole === role.id ? 'border-blue-600' : 'border-gray-200 hover:border-gray-300')}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{role.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900">{role.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{role.desc}</p>
                    </div>
                    {viewAsRole === role.id
                      ? <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Active</span>
                      : <span className="text-xs text-gray-300">Switch →</span>
                    }
                  </div>
                </button>
              ))}
            </div>

            {/* Customer portal links */}
            <p className="font-semibold text-sm text-gray-900 mb-3">Customer portal preview</p>
            {jobs.length === 0
              ? <p className="text-xs text-gray-400">No jobs — create one first to preview its portal</p>
              : <div className="space-y-2">
                  {jobs.slice(0,8).map(job => (
                    <div key={job.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{job.client}</p>
                        <p className="text-xs text-gray-400">{job.kbStatus} · {job.type}</p>
                      </div>
                      {job.portalToken
                        ? <a href={`/portal/${job.portalToken}`} target="_blank" rel="noreferrer"
                            className="text-xs font-bold text-white bg-gray-900 rounded-lg px-3 py-1.5 whitespace-nowrap">
                            Open portal →
                          </a>
                        : <span className="text-xs text-gray-300">No token</span>
                      }
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
      </div>
    </div>
  )
}
