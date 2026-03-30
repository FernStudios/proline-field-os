import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { TopNav } from '../components/layout/AppShell'
import { Card, SectionTitle, FormGroup, Button } from '../components/ui'
import { toast } from '../components/ui'
import { cn } from '../lib/utils'

const DEFAULT_SCOPE = `Contractor agrees to furnish all labor, materials, equipment, and services necessary to complete the following Work at the Project Site in a good and workmanlike manner, in accordance with all applicable building codes and regulations.`

const DEFAULT_WARRANTY_CONDITIONS = `1. Customer shall inspect gutters and downspouts at least twice per year (spring and fall) and remove all debris, leaves, and obstructions.
2. Customer shall ensure all downspouts discharge at least 3 feet away from the foundation.
3. Customer shall promptly notify Contractor of any visible damage, separation, or leaking within 30 days of discovery.
4. Customer shall not hang objects from gutters or apply sealants not approved by Contractor.`

const DEFAULT_WARRANTY_EXCLUSIONS = `• Acts of God including hail, wind, flood, ice dams, or lightning
• Damage caused by Customer's or third party's alterations, negligence, or misuse
• Pre-existing structural or drainage issues not corrected prior to installation
• Normal wear, fading, or weathering of materials over time
• Damage caused by tree limbs, falling debris, or animal activity
• Consequential or incidental damages of any kind`

const DEFAULT_CO_CUSTOMER = `At the specific request of Customer, the scope of Work under the original Contract is hereby modified. Customer acknowledges this change was initiated at Customer's direction and was not required by field conditions, code requirements, or Contractor's professional obligations.`

const DEFAULT_CO_LIFE_SAFETY = `During performance of the Work, Contractor identified a condition affecting life safety, structural integrity, or code compliance that prevents the Work from continuing without correction. Work has been stopped pending Customer's written approval or declination.`

const DEFAULT_CO_WARRANTY = `During performance of the Work, Contractor identified a condition that, if left uncorrected, will void the warranty on the affected Work. Work may continue at Customer's direction but no warranty will be issued on any portion of the Work affected by this condition.`

const SECTIONS = [
  {
    id: 'scope',
    title: 'Default scope of work',
    description: 'Opening paragraph that appears at the top of every contract\'s scope section. Edit this to match your trade.',
    field: 'defaultScope',
    default: DEFAULT_SCOPE,
    rows: 5,
  },
  {
    id: 'warranty_conditions',
    title: 'Warranty maintenance requirements',
    description: 'What customers must do to keep their warranty valid. Listed in Article 5.2 of every contract.',
    field: 'defaultWarrantyConditions',
    default: DEFAULT_WARRANTY_CONDITIONS,
    rows: 6,
  },
  {
    id: 'warranty_exclusions',
    title: 'Warranty exclusions',
    description: 'Conditions that void the warranty. Added to Article 5.3 of every contract.',
    field: 'defaultWarrantyExclusions',
    default: DEFAULT_WARRANTY_EXCLUSIONS,
    rows: 5,
  },
  {
    id: 'co_customer',
    title: 'Customer-requested CO opening language',
    description: 'Opening paragraph for CO-02 (customer-requested change orders).',
    field: 'defaultCOCustomer',
    default: DEFAULT_CO_CUSTOMER,
    rows: 4,
  },
  {
    id: 'co_life_safety',
    title: 'Life/safety CO opening language',
    description: 'Opening paragraph for CO-03A (life safety / code compliance change orders).',
    field: 'defaultCOLifeSafety',
    default: DEFAULT_CO_LIFE_SAFETY,
    rows: 4,
  },
  {
    id: 'co_warranty',
    title: 'Warranty impact CO opening language',
    description: 'Opening paragraph for CO-03B (warranty impact change orders).',
    field: 'defaultCOWarranty',
    default: DEFAULT_CO_WARRANTY,
    rows: 4,
  },
]

export default function DocumentTemplates() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { settings, updateSettings, syncToSupabase } = useStore()
  const templates = settings.documentTemplates || {}
  const [activeSection, setActiveSection] = useState('scope')
  const [values, setValues] = useState(() => {
    const v = {}
    SECTIONS.forEach(s => { v[s.id] = templates[s.field] || s.default })
    return v
  })
  const [dirty, setDirty] = useState({})

  const set = (id, val) => {
    setValues(v => ({ ...v, [id]: val }))
    setDirty(d => ({ ...d, [id]: true }))
  }

  const save = (id) => {
    const section = SECTIONS.find(s => s.id === id)
    if (!section) return
    const updated = { ...templates, [section.field]: values[id] }
    updateSettings({ documentTemplates: updated })
    if (user?.id) syncToSupabase(user.id)
    setDirty(d => ({ ...d, [id]: false }))
    toast('Template saved')
  }

  const reset = (id) => {
    const section = SECTIONS.find(s => s.id === id)
    if (!section) return
    setValues(v => ({ ...v, [id]: section.default }))
    setDirty(d => ({ ...d, [id]: true }))
  }

  const activeS = SECTIONS.find(s => s.id === activeSection)

  return (
    <div className="page">
      <TopNav title="Document Templates" onBack={() => navigate('/admin')} />

      <div className="flex flex-col h-full min-h-0">
        {/* Section tabs */}
        <div className="bg-white border-b border-gray-100 overflow-x-auto">
          <div className="flex px-4 gap-1 py-2">
            {SECTIONS.map(s => (
              <button key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0',
                  activeSection === s.id ? 'bg-navy text-white' : 'text-gray-500 hover:bg-gray-100',
                  dirty[s.id] && activeSection !== s.id && 'ring-1 ring-amber-400'
                )}>
                {s.title.split(' ').slice(0, 2).join(' ')}
                {dirty[s.id] && <span className="ml-1 text-amber-400">•</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeS && (
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-sm text-navy mb-1">{activeS.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{activeS.description}</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Note:</strong> These templates pre-fill the relevant sections in new contracts and change orders.
                  They can be overridden in the wizard for individual jobs. Changes here affect new documents only — existing saved documents are not changed.
                </p>
              </div>

              <textarea
                value={values[activeSection]}
                onChange={e => set(activeSection, e.target.value)}
                rows={activeS.rows + 2}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm leading-relaxed resize-y focus:outline-none focus:border-navy font-mono"
                style={{ fontFamily: "'Times New Roman', serif", fontSize: '11pt' }}
              />

              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1 text-xs" onClick={() => reset(activeSection)}>
                  Reset to default
                </Button>
                <Button variant="primary" className="flex-[2]" onClick={() => save(activeSection)}
                  disabled={!dirty[activeSection]}>
                  {dirty[activeSection] ? 'Save template' : 'Saved ✓'}
                </Button>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview</p>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-serif"
                  style={{ fontFamily: "'Times New Roman', serif" }}>
                  {values[activeSection]}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
