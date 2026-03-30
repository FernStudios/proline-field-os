import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { TopNav } from '../components/layout/AppShell'
import { Card, Empty } from '../components/ui'
import { cn, fmtDShort } from '../lib/utils'

const TEMPLATE_TYPES = [
  { value: 'contract_a',   label: 'Contract — Version A',      icon: '📋', desc: 'Materials deposit + balance at completion' },
  { value: 'contract_b',   label: 'Contract — Version B',      icon: '📋', desc: 'Materials deposit + weekly labor draws' },
  { value: 'contract_c',   label: 'Contract — Version C',      icon: '📋', desc: 'Materials deposit + milestone draws' },
  { value: 'estimate',     label: 'Estimate / Proposal',       icon: '📄', desc: 'Pre-contract pricing document' },
  { value: 'co_02',        label: 'Change Order CO-02',        icon: '⚠️', desc: 'Customer-requested scope change' },
  { value: 'co_03a',       label: 'Change Order CO-03A',       icon: '🚫', desc: 'Required — Life/safety/code' },
  { value: 'co_03b',       label: 'Change Order CO-03B',       icon: '⚠️', desc: 'Required — Warranty impact' },
  { value: 'lien_waiver',  label: 'Final Lien Waiver',         icon: '🔒', desc: 'Issued after full payment' },
]

export default function DocumentTemplates() {
  const navigate = useNavigate()
  const { customTemplates } = useStore()

  const hasAny = Object.keys(customTemplates || {}).length > 0

  return (
    <div className="flex flex-col h-full min-h-0">
      <TopNav title="Document Templates" onBack={() => navigate('/admin')}
        actions={
          <button onClick={() => navigate('/template-editor')}
            className="text-xs font-bold text-white bg-brand rounded-lg px-3 py-1.5">
            + New
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-blue-800 mb-1">How custom templates work</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Upload your attorney-approved contracts and insert merge fields where variable data goes (customer name, price, dates, etc.).
            When activated, your template is used instead of the system-generated document.
            Tap <strong>+ New</strong> to create a template, or tap any document type below to start.
          </p>
        </div>

        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Document types</p>

        <div className="space-y-2">
          {TEMPLATE_TYPES.map(t => {
            const tpl = customTemplates?.[t.value]
            const active = !!tpl
            return (
              <button key={t.value}
                onClick={() => navigate(active ? `/template-editor/${t.value}` : `/template-editor?type=${t.value}`)}
                className={cn(
                  'w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-colors',
                  active ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'
                )}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{t.icon}</span>
                  <div>
                    <p className="font-semibold text-sm text-navy">{t.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                    {active && (
                      <p className="text-xs text-emerald-600 mt-1 font-semibold">
                        ✓ Custom template active — {tpl.name}
                      </p>
                    )}
                    {!active && (
                      <p className="text-xs text-gray-400 mt-1">Using default generated document</p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 ml-3">
                  {active ? (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">Active</span>
                  ) : (
                    <span className="text-xs text-gray-400">Set up →</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {hasAny && (
          <div className="mt-6 bg-gray-50 rounded-xl p-4 text-xs text-gray-500">
            <p className="font-semibold text-gray-600 mb-1">Active templates override the default</p>
            <p className="leading-relaxed">
              When a custom template is active, it is used for all new documents of that type.
              Existing saved documents are not changed. You can deactivate a template at any time by deleting it — the system will fall back to the default generated document.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
