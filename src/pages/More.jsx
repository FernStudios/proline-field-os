import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { fmtM } from '../lib/utils'
import { TopNav } from '../components/layout/AppShell'

const MENU = [
  { section: 'Operations', items: [
    { icon: '📊', label: 'P&L', path: '/pl', desc: 'Income, costs & profitability' },
    { icon: '🗓', label: 'Schedule', path: '/schedule', desc: 'Calendar & crew assignment' },
    { icon: '👷', label: 'Crew', path: '/crew', desc: 'Roster, assignments & job view' },
  ]},
  { section: 'Finance', items: [
    { icon: '🧾', label: 'Expenses', path: '/expenses', desc: 'Log materials, fuel & field costs' },
    { icon: '💵', label: 'Payroll', path: '/payroll', desc: 'Crew pay runs & roster' },
  ]},
  { section: 'Documents', items: [
    { icon: '📋', label: 'All contracts', path: '/contracts', desc: 'View all signed contracts' },
    { icon: '⚠️', label: 'Change orders', path: '/change-orders', desc: 'All COs across jobs' },
  ]},
  { section: 'Settings', items: [
    { icon: '⚙️', label: 'Admin', path: '/admin', desc: 'Company, payroll & contract settings' },
    { icon: '🤖', label: 'Contract template', path: '/template-setup', desc: 'AI-generated trade-specific language' },
  ]},
]

export default function More() {
  const navigate = useNavigate()
  const { jobs, invoices, expenses, crew } = useStore()
  const { user } = useAuth()

  // Quick P&L numbers
  const revenue = invoices.reduce((s,i) => s+(i.payments||[]).reduce((p,pm)=>p+(pm.amount||0),0), 0)
  const costs = expenses.reduce((s,e) => s+(e.amount||0), 0)
  const profit = revenue - costs

  return (
    <>
      <TopNav title="More" />
      <div className="px-4 pt-4">
        {/* Mini P&L */}
        <div className="bg-navy rounded-2xl p-4 mb-5">
          <p className="text-white/50 text-xs font-medium mb-3">Quick P&L</p>
          <div className="grid grid-cols-3 gap-2">
            <div><p className="text-white/40 text-xs mb-0.5">Revenue</p><p className="text-white font-display font-bold text-base">{fmtM(revenue)}</p></div>
            <div><p className="text-white/40 text-xs mb-0.5">Costs</p><p className="text-white font-display font-bold text-base">{fmtM(costs)}</p></div>
            <div><p className="text-white/40 text-xs mb-0.5">Profit</p><p className={`font-display font-bold text-base ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtM(profit)}</p></div>
          </div>
        </div>

        {/* Menu sections */}
        {MENU.map(section => (
          <div key={section.section} className="mb-5">
            <p className="section-title mb-2">{section.section}</p>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {section.items.map((item, i) => (
                <button key={item.path} onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-navy">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <span className="text-gray-300 text-lg flex-shrink-0">›</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Stats footer */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-400 mb-1">Jobs</p><p className="font-display font-bold text-navy">{jobs.length}</p></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-400 mb-1">Crew</p><p className="font-display font-bold text-navy">{crew.length}</p></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-400 mb-1">Invoices</p><p className="font-display font-bold text-navy">{invoices.length}</p></div>
        </div>

        <p className="text-center text-xs text-gray-300 mb-4">Proline Field OS · {user?.email || 'Demo mode'}</p>
      </div>
    </>
  )
}
