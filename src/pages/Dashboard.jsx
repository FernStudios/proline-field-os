import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { fmtM } from '../lib/utils'
import { getStageInfo } from '../lib/lifecycle'
import { SectionTitle, Button } from '../components/ui'

const TILES = [
  { label: 'New Job', icon: '🔨', path: '/jobs?new=1', color: 'bg-brand' },
  { label: 'Jobs', icon: '📋', path: '/jobs', color: 'bg-navy' },
  { label: 'Invoices', icon: '💰', path: '/invoices', color: 'bg-navy' },
  { label: 'Leads', icon: '🎯', path: '/leads', color: 'bg-navy' },
  { label: 'Expenses', icon: '🧾', path: '/expenses', color: 'bg-navy' },
  { label: 'Payroll', icon: '👷', path: '/payroll', color: 'bg-navy' },
  { label: 'Clock In', icon: '⏱', path: '/payroll?clockin=1', color: 'bg-navy' },
  { label: 'Admin', icon: '⚙️', path: '/admin', color: 'bg-navy' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { jobs, invoices, settings, contractTemplate, contractTemplateMeta, loadDemoData } = useStore()

  // KPIs
  const activeJobs = jobs.filter((j) => j.status === 'active').length
  const outstanding = invoices.reduce((sum, inv) => {
    const paid = (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0)
    return sum + Math.max(0, (inv.amount || 0) - paid)
  }, 0)
  const thisMonth = new Date().getMonth()
  const monthRevenue = invoices.reduce((sum, inv) => {
    return sum + (inv.payments || [])
      .filter((p) => new Date(p.date).getMonth() === thisMonth)
      .reduce((s, p) => s + (p.amount || 0), 0)
  }, 0)
  const name = settings.adminSettings?.ownerName?.split(' ')[0] || 'there'

  return (
    <div className="px-4 pt-4 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-gray-400 font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
          <h1 className="font-display font-bold text-navy text-xl mt-0.5">Hey, {name} 👋</h1>
        </div>
        <button
          onClick={() => navigate('/admin')}
          className="w-9 h-9 rounded-full bg-navy flex items-center justify-center text-white font-display font-bold text-sm"
        >
          {name[0]}
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <KPICard label="Active jobs" value={activeJobs} />
        <KPICard label="Outstanding" value={fmtM(outstanding)} />
        <KPICard label="This month" value={fmtM(monthRevenue)} />
      </div>

      {/* Template onboarding banner */}
      {!contractTemplate && (
        <div className="bg-navy rounded-2xl p-4 mb-5 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">🤖</span>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-white text-sm">Set up your contract template</p>
            <p className="text-white/50 text-xs mt-0.5">Generate AI-powered language for your trade — scope, warranty, CO scenarios</p>
          </div>
          <button
            onClick={() => navigate('/template-setup')}
            className="flex-shrink-0 text-xs font-bold text-white bg-brand rounded-lg px-3 py-1.5"
          >
            Set up
          </button>
        </div>
      )}

      {/* Kiosk grid */}
      <SectionTitle>Quick actions</SectionTitle>
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {TILES.map((t) => (
          <button
            key={t.label}
            onClick={() => navigate(t.path)}
            className="kiosk-tile"
          >
            <span className="text-2xl">{t.icon}</span>
            <span className="text-[10px] font-semibold text-gray-500 text-center leading-tight">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Recent jobs */}
      {jobs.length > 0 && (
        <>
          <SectionTitle>Recent jobs</SectionTitle>
          <div className="space-y-2.5 mb-4">
            {jobs.slice(0, 3).map((job) => (
              <button
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="w-full text-left card active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy text-sm truncate">{job.client}</p>
                    <p className="text-xs text-gray-400 truncate">{job.type} · {job.address?.split(',')[1]?.trim()}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="font-semibold text-navy text-sm">{fmtM(job.contractValue)}</p>
                    <span className={`badge text-xs ${getStageInfo(job.kbStatus).badge || 'badge-amber'}`}>
                      {getStageInfo(job.kbStatus).label || job.kbStatus}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <Button variant="ghost" className="w-full" onClick={() => navigate('/jobs')}>
            View all jobs →
          </Button>
        </>
      )}

      {/* No data state */}
      {jobs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm mb-3">No jobs yet</p>
          <div className="flex gap-2 justify-center">
            <Button variant="primary" onClick={() => navigate('/jobs?new=1')}>+ Add first job</Button>
            <Button variant="ghost" onClick={loadDemoData}>Load demo data</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function KPICard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
      <p className="font-display font-bold text-navy text-base leading-tight">{value}</p>
    </div>
  )
}
