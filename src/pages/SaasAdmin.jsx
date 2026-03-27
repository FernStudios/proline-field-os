import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useStore } from '../store'
import { fmtM } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'

const OWNER_EMAIL = 'brandyturner815@gmail.com'

const Stat = ({ label, value, sub, color = 'text-gray-900' }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4">
    <p className="text-xs text-gray-400 mb-1">{label}</p>
    <p className={`font-bold text-xl ${color}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
)

export default function SaasAdmin() {
  // ── ALL hooks first — no early returns before this block ──────
  const navigate = useNavigate()
  const { user } = useAuth()
  const { viewAsRole, setViewAsRole, jobs } = useStore()
  const [tab, setTab] = useState('dashboard')
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // fetchAccounts defined with useCallback so it's stable before useEffect runs
  const fetchAccounts = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Supabase not configured'); return }
    try {
      const { data, error: err } = await supabase.from('user_data').select('user_id, db')
      if (err) throw err
      const parsed = (data || []).map(row => {
        const db = row.db || {}
        const rowJobs = db.jobs || []
        const invoices = db.invoices || []
        const totalInvoiced = invoices.reduce((s, i) => s + (i.amount || 0), 0)
        const totalPaid = invoices.reduce((s, i) =>
          s + (i.payments || []).reduce((p, pm) => p + (pm.amount || 0), 0), 0)
        const signupDate = db.settings?.signupDate || null
        const daysSince = signupDate
          ? Math.floor((Date.now() - new Date(signupDate)) / 86400000)
          : null
        const trialDaysLeft = daysSince !== null ? Math.max(0, 14 - daysSince) : null
        return {
          userId: row.user_id,
          coName: db.settings?.coName || '(unnamed)',
          coEmail: db.settings?.coEmail || '',
          coPhone: db.settings?.coPhone || '',
          plan: db.plan || 'trial',
          jobCount: rowJobs.length,
          totalInvoiced,
          totalPaid,
          hasTemplate: !!db.contractTemplate,
          templateTrade: db.contractTemplateMeta?.trade || null,
          templateGenerations: db.templateGenerationCount || 0,
          crewCount: (db.crew || []).length,
          schemaVersion: db.schemaVersion || 1,
          trialDaysLeft,
          isOwner: db.settings?.coEmail?.toLowerCase() === OWNER_EMAIL.toLowerCase(),
        }
      })
      setAccounts(parsed)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, []) // no deps — supabase and setters are stable refs

  const isOwner = !!user && user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()

  useEffect(() => {
    if (isOwner) fetchAccounts()
    else setLoading(false)
  }, [isOwner, fetchAccounts])
  // ── End hooks block ───────────────────────────────────────────

  // Auth gates (after all hooks)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Not signed in</p>
      </div>
    )
  }
  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center bg-gray-50">
        <div>
          <p className="text-4xl mb-3">🔒</p>
          <p className="font-bold text-lg text-gray-900 mb-2">Access denied</p>
          <p className="text-gray-400 text-sm mb-4">This portal is only accessible to the platform owner.</p>
          <button onClick={() => navigate('/dashboard')} className="text-blue-600 text-sm underline">
            Back to app
          </button>
        </div>
      </div>
    )
  }

  // ── Computed values ───────────────────────────────────────────
  const totalAccounts = accounts.length
  const paidAccounts  = accounts.filter(a => a.plan && a.plan !== 'trial' && a.plan !== 'beta_free').length
  const withTemplate  = accounts.filter(a => a.hasTemplate).length
  const totalJobs     = accounts.reduce((s, a) => s + a.jobCount, 0)
  const totalInvoiced = accounts.reduce((s, a) => s + a.totalInvoiced, 0)
  const expiringTrial = accounts.filter(a => a.trialDaysLeft !== null && a.trialDaysLeft > 0 && a.trialDaysLeft <= 3)
  const expiredTrial  = accounts.filter(a => a.trialDaysLeft === 0)

  const TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'accounts',  label: `Accounts (${totalAccounts})` },
    { id: 'health',    label: 'Health' },
    { id: 'viewas',    label: 'View as' },
  ]

  const ROLES = [
    { id: 'owner',    icon: '👑', label: 'Owner',    desc: 'Full access — all modules' },
    { id: 'foreman',  icon: '🦺', label: 'Foreman',  desc: 'Jobs, docs, schedule, comms — no financials' },
    { id: 'crew',     icon: '👷', label: 'Crew',     desc: 'View-only on assigned jobs' },
    { id: 'customer', icon: '🏠', label: 'Customer', desc: 'Portal only — estimate, contract, balance' },
  ]

  return (
    <div className="min-h-screen bg-gray-50" style={{fontFamily:'system-ui,sans-serif'}}>

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
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0',
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 pb-16">

        {/* ── Dashboard ── */}
        {tab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Total accounts" value={totalAccounts} />
              <Stat label="Paid" value={paidAccounts} color="text-emerald-600"
                sub={`${totalAccounts - paidAccounts} on trial`} />
              <Stat label="Total jobs" value={totalJobs} />
              <Stat label="Platform invoiced" value={fmtM(totalInvoiced)} color="text-blue-600" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Stat label="With template" value={withTemplate}
                sub={`${totalAccounts - withTemplate} not set up`} />
              <Stat label="Trial expiring ≤3d" value={expiringTrial.length}
                color={expiringTrial.length > 0 ? 'text-amber-600' : 'text-gray-900'} />
              <Stat label="Trial expired" value={expiredTrial.length}
                color={expiredTrial.length > 0 ? 'text-red-600' : 'text-gray-900'} />
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="font-semibold text-sm text-gray-900 mb-3">Platform health</p>
              <div className="space-y-2 text-xs">
                {[
                  ['Supabase',      supabase ? '✓ Connected' : '✗ Not configured', supabase ? 'text-emerald-600' : 'text-red-500'],
                  ['Gemini API',    'GEMINI_API_KEY in Vercel env vars',             'text-gray-400'],
                  ['PWA manifest',  '✓ Configured (vite-plugin-pwa)',                'text-emerald-600'],
                  ['Schema',        'v2 current',                                    'text-emerald-600'],
                  ['Domain',        'prolinefieldos.com → Vercel',                   'text-emerald-600'],
                ].map(([label, val, color]) => (
                  <div key={label} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500">{label}</span>
                    <span className={`font-medium ${color}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="font-semibold text-sm text-gray-900 mb-3">
                Your account · Proline Gutter & Exteriors
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-bold text-gray-900">{jobs.length}</p>
                  <p className="text-xs text-gray-400">Total jobs</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {jobs.filter(j => j.status === 'active').length}
                  </p>
                  <p className="text-xs text-gray-400">Active</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {jobs.filter(j => j.status === 'complete').length}
                  </p>
                  <p className="text-xs text-gray-400">Complete</p>
                </div>
              </div>
            </div>

            <button onClick={fetchAccounts}
              className="w-full py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
              {loading ? 'Loading…' : '↻ Refresh data'}
            </button>
          </div>
        )}

        {/* ── Accounts ── */}
        {tab === 'accounts' && (
          <div>
            {loading && (
              <p className="text-xs text-gray-400 text-center py-10">Loading accounts…</p>
            )}
            {!loading && error && (
              <p className="text-xs text-red-500 text-center py-4">Error: {error}</p>
            )}
            {!loading && !error && accounts.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-10">No accounts found</p>
            )}
            <div className="space-y-2.5 mt-1">
              {accounts.map(a => (
                <div key={a.userId}
                  className={cn('bg-white rounded-xl border p-4', a.isOwner ? 'border-blue-200' : 'border-gray-100')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900">{a.coName}</p>
                        {a.isOwner && (
                          <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {a.coEmail}{a.coPhone ? ` · ${a.coPhone}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                        <span>{a.jobCount} jobs</span>
                        <span>{fmtM(a.totalInvoiced)} invoiced</span>
                        <span className={a.hasTemplate ? 'text-emerald-600' : 'text-amber-500'}>
                          {a.hasTemplate ? `✓ Template (${a.templateTrade})` : 'No template'}
                        </span>
                        {a.crewCount > 0 && <span>{a.crewCount} crew</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        a.plan === 'trial' || !a.plan
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-emerald-100 text-emerald-700'
                      )}>
                        {a.plan || 'trial'}
                      </span>
                      {a.trialDaysLeft !== null && a.trialDaysLeft <= 14 && (
                        <p className={cn('text-xs mt-1',
                          a.trialDaysLeft === 0 ? 'text-red-500'
                          : a.trialDaysLeft <= 3 ? 'text-amber-500'
                          : 'text-gray-400')}>
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

        {/* ── Health ── */}
        {tab === 'health' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="font-semibold text-sm text-gray-900 mb-3">Schema versions</p>
              {loading
                ? <p className="text-xs text-gray-400">Loading…</p>
                : <div className="space-y-1.5">
                    {accounts.map(a => (
                      <div key={a.userId}
                        className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                        <span className="text-gray-600">{a.coName}</span>
                        <span className={a.schemaVersion >= 2 ? 'text-emerald-600 font-medium' : 'text-amber-500 font-medium'}>
                          {a.schemaVersion >= 2 ? `✓ v${a.schemaVersion}` : `⚠ v${a.schemaVersion} — stale`}
                        </span>
                      </div>
                    ))}
                  </div>
              }
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="font-semibold text-sm text-gray-900 mb-3">Template usage</p>
              {loading
                ? <p className="text-xs text-gray-400">Loading…</p>
                : <div className="space-y-1.5">
                    {accounts.map(a => (
                      <div key={a.userId}
                        className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                        <span className="text-gray-600">{a.coName}</span>
                        <span className="text-gray-500">
                          {a.templateGenerations} gen{a.templateGenerations !== 1 ? 's' : ''}
                          {a.templateTrade ? ` · ${a.templateTrade}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
              }
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="font-semibold text-sm text-gray-900 mb-3">Trial alerts</p>
              {loading
                ? <p className="text-xs text-gray-400">Loading…</p>
                : expiringTrial.length === 0 && expiredTrial.length === 0
                  ? <p className="text-xs text-gray-400">No urgent trial issues</p>
                  : <div className="space-y-1.5">
                      {[...expiredTrial, ...expiringTrial].map(a => (
                        <div key={a.userId}
                          className={cn(
                            'flex items-center justify-between text-xs py-1.5 px-2 rounded-lg',
                            a.trialDaysLeft === 0 ? 'bg-red-50' : 'bg-amber-50'
                          )}>
                          <span className="font-medium text-gray-700">{a.coName}</span>
                          <span className={a.trialDaysLeft === 0 ? 'text-red-600 font-bold' : 'text-amber-600 font-semibold'}>
                            {a.trialDaysLeft === 0 ? 'Expired' : `${a.trialDaysLeft}d left`}
                          </span>
                        </div>
                      ))}
                    </div>
              }
            </div>
          </div>
        )}

        {/* ── View As ── */}
        {tab === 'viewas' && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Switch to any role to test what that person sees in the app.
              A purple banner appears at the top while a non-owner role is active.
            </p>
            <div className="space-y-3 mb-6">
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
                  className={cn(
                    'w-full text-left p-4 rounded-2xl border-2 transition-colors bg-white',
                    viewAsRole === role.id ? 'border-blue-600' : 'border-gray-200 hover:border-gray-300'
                  )}>
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
            {viewAsRole !== 'owner' && (
              <button onClick={() => { setViewAsRole('owner'); navigate('/dashboard') }}
                className="w-full mb-5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:border-gray-300">
                Exit role view → back to Owner
              </button>
            )}

            <p className="font-semibold text-sm text-gray-900 mb-3">Customer portal preview</p>
            {jobs.length === 0
              ? <p className="text-xs text-gray-400">Create a job to preview its customer portal</p>
              : <div className="space-y-2">
                  {jobs.slice(0, 10).map(job => (
                    <div key={job.id}
                      className="bg-white rounded-xl border border-gray-100 p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{job.client}</p>
                        <p className="text-xs text-gray-400">{job.kbStatus} · {job.type}</p>
                      </div>
                      {job.portalToken
                        ? <div className="flex gap-2 flex-shrink-0">
                            <a href={`/portal/${job.portalToken}`} target="_blank" rel="noreferrer"
                              className="text-xs font-bold text-white bg-gray-900 rounded-lg px-3 py-1.5">
                              Open →
                            </a>
                            <button
                              onClick={() => navigator.clipboard?.writeText(
                                window.location.origin + '/portal/' + job.portalToken
                              )}
                              className="text-xs text-gray-400 border border-gray-200 rounded-lg px-2 py-1.5 hover:border-gray-300">
                              Copy
                            </button>
                          </div>
                        : <span className="text-xs text-gray-300 flex-shrink-0">No token</span>
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
