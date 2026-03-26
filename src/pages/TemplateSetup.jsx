import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { TopNav } from '../components/layout/AppShell'
import { ProgressBar, FormGroup, Input, Select, Button } from '../components/ui'
import { toast } from '../components/ui'
import { cn } from '../lib/utils'

const TRADE_SERVICES = {
  gutters: ['Seamless gutter installation','Gutter repair','Gutter cleaning','Fascia & soffit','Downspout installation','Gutter guards'],
  roofing: ['Shingle replacement','Metal roofing','Flat/TPO roofing','Roof repair','Skylight installation'],
  hvac: ['AC installation','Furnace installation','Heat pump','HVAC repair','Mini-split','Maintenance'],
  plumbing: ['Water heater','Drain cleaning','Pipe repair','Fixture installation','Repiping'],
  painting: ['Exterior painting','Interior painting','Cabinet painting','Deck staining','Pressure washing'],
  siding: ['Vinyl siding','Fiber cement','Siding repair','Soffit & fascia','Trim installation'],
  general: ['Kitchen remodel','Bathroom remodel','Additions','Basement finishing'],
}

export default function TemplateSetup() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { settings, setContractTemplate } = useStore()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(null)
  const [form, setForm] = useState({
    trade: 'gutters',
    customTrade: '',
    coName: settings.coName || '',
    primaryState: settings.primaryState || 'SC',
    otherStates: '',
    services: TRADE_SERVICES['gutters'] || [],
    warrantyYears: 5,
    adminFee: 75,
    lateFee: 1.5,
    defaultPayment: 'A',
    payMethods: ['Check','Zelle'],
  })

  const set = k => v => setForm(f => ({...f, [k]: v}))
  const setInput = k => e => setForm(f => ({...f, [k]: e.target.value}))

  const toggleService = (s) => {
    setForm(f => ({
      ...f,
      services: f.services.includes(s) ? f.services.filter(x=>x!==s) : [...f.services, s]
    }))
  }

  const togglePayMethod = (m) => {
    setForm(f => ({
      ...f,
      payMethods: f.payMethods.includes(m) ? f.payMethods.filter(x=>x!==m) : [...f.payMethods, m]
    }))
  }

  const generate = async () => {
    setLoading(true)
    const trade = form.trade === 'custom' ? form.customTrade : form.trade
    const prompt = `You are a legal document specialist for residential construction contracts. Generate trade-specific contract language for this contractor:

Trade: ${trade}
Company: ${form.coName || 'Contractor'}
Primary state: ${form.primaryState}${form.otherStates ? ', also: '+form.otherStates : ''}
Services: ${form.services.join(', ')}

Return ONLY valid JSON, no markdown:
{
  "trade": "${trade}",
  "tradeLabel": "${form.trade}",
  "scopeBoilerplate": "Opening scope language for this trade (2-3 sentences)",
  "scopeTemplates": [
    {"jobType": "most common job", "scope": "detailed scope template with material specs and quantity placeholders"},
    {"jobType": "second common", "scope": "..."},
    {"jobType": "third common", "scope": "..."}
  ],
  "warrantyBoilerplate": "Trade-specific warranty language covering what is warranted",
  "maintenanceTemplates": [
    {"jobType": "job type", "requirements": "specific maintenance requirements that are warranty conditions"}
  ],
  "warrantyExclusions": ["exclusion 1", "exclusion 2", "exclusion 3", "exclusion 4"],
  "commonChangeOrders": [
    {"type": "customer", "scenario": "most common CO scenario", "descriptionTemplate": "pre-filled description"},
    {"type": "required_a", "scenario": "life/safety scenario for this trade", "conditionTemplate": "condition text", "correctiveTemplate": "corrective text", "consequenceTemplate": "consequences"},
    {"type": "required_b", "scenario": "warranty-impact scenario", "conditionTemplate": "...", "correctiveTemplate": "...", "warrantyImpactTemplate": "..."}
  ],
  "insuranceRecommendation": "Recommended CGL minimum for this trade",
  "defaultSettings": {
    "warrantyYears": ${form.warrantyYears},
    "adminFee": ${form.adminFee},
    "defaultPaymentVersion": "${form.defaultPayment}",
    "lateFee": ${form.lateFee},
    "curePeriodDays": 10,
    "coResponseDays": 5,
    "paymentMethods": ${JSON.stringify(form.payMethods)}
  },
  "generatedAt": "${new Date().toISOString()}",
  "generatedFor": "${form.coName || 'Contractor'}"
}`

    try {
      const resp = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 3000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await resp.json()
      const text = data.content?.[0]?.text || ''
      const clean = text.replace(/```json\n?/g,'').replace(/\n?```/g,'').trim()
      const parsed = JSON.parse(clean)
      setGenerated(parsed)
      setStep(3)
    } catch(e) {
      toast('Generation failed: ' + e.message, 'error')
    }
    setLoading(false)
  }

  const saveTemplate = async () => {
    if (!generated) return
    setContractTemplate(generated, { trade: form.trade, generatedAt: new Date().toISOString() })

    // Save to Supabase if signed in
    if (supabase && user?.id) {
      try {
        await supabase.from('contract_templates').upsert({
          user_id: user.id,
          trade: form.trade,
          company_name: form.coName,
          primary_state: form.primaryState,
          template_data: generated,
          generated_at: new Date().toISOString(),
        })
      } catch(e) { console.warn('Template save to Supabase:', e.message) }
    }

    toast('Template saved — contract wizard updated')
    navigate('/admin?tab=Contracts')
  }

  const services = TRADE_SERVICES[form.trade] || []
  const PAY_METHODS = ['Check','Zelle','Cash App','Venmo','ACH','Cash','Credit Card']

  return (
    <div className="screen">
      <TopNav title="Contract template setup" onBack={() => navigate('/admin?tab=Contracts')} />
      <div className="px-4 pt-3 pb-2 bg-white border-b border-gray-100">
        <ProgressBar current={step} total={3} />
        <p className="text-xs text-gray-400 mt-2">Step {step} of 3</p>
        <p className="font-display font-bold text-navy text-base mt-0.5">
          {['Your trade & services','Defaults','Your AI template'][step-1]}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
              This generates contract language specific to your trade — scope templates, maintenance requirements, and pre-written change order scenarios. It runs once and lives in your account.
            </div>
            <FormGroup label="Your primary trade">
              <Select value={form.trade} onChange={e => { setInput('trade')(e); setForm(f => ({...f, services: TRADE_SERVICES[e.target.value] || []})) }}>
                <option value="gutters">Gutters & Exteriors</option>
                <option value="roofing">Roofing</option>
                <option value="hvac">HVAC</option>
                <option value="plumbing">Plumbing</option>
                <option value="painting">Painting & Coatings</option>
                <option value="siding">Siding & Cladding</option>
                <option value="general">General Contractor</option>
                <option value="custom">Other (describe below)</option>
              </Select>
            </FormGroup>
            {form.trade === 'custom' && (
              <FormGroup label="Describe your trade">
                <Input value={form.customTrade} onChange={setInput('customTrade')} placeholder="e.g. Pool installation and maintenance" />
              </FormGroup>
            )}
            <FormGroup label="Company name">
              <Input value={form.coName} onChange={setInput('coName')} placeholder="Proline Residential LLC" />
            </FormGroup>
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Primary state">
                <Select value={form.primaryState} onChange={setInput('primaryState')}>
                  {['SC','NC','GA','TN','VA','FL','TX','Other'].map(s=><option key={s} value={s}>{s}</option>)}
                </Select>
              </FormGroup>
              <FormGroup label="Other states">
                <Input value={form.otherStates} onChange={setInput('otherStates')} placeholder="NC, GA…" />
              </FormGroup>
            </div>
            {services.length > 0 && (
              <FormGroup label="Services you offer">
                <div className="flex flex-wrap gap-2">
                  {services.map(s => (
                    <button key={s} onClick={() => toggleService(s)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors', form.services.includes(s)?'bg-navy text-white border-navy':'bg-white text-gray-500 border-gray-200')}>
                      {s}
                    </button>
                  ))}
                </div>
              </FormGroup>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Standard warranty (years)">
                <Select value={form.warrantyYears} onChange={e=>set('warrantyYears')(parseInt(e.target.value))}>
                  {[1,2,3,5,7,10].map(y=><option key={y} value={y}>{y} years</option>)}
                </Select>
              </FormGroup>
              <FormGroup label="Admin fee per CO ($)">
                <Input type="number" value={form.adminFee} onChange={e=>set('adminFee')(parseFloat(e.target.value)||75)} />
              </FormGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Late fee (% per month)">
                <Input type="number" step="0.1" value={form.lateFee} onChange={e=>set('lateFee')(parseFloat(e.target.value)||1.5)} />
              </FormGroup>
              <FormGroup label="Default payment version">
                <Select value={form.defaultPayment} onChange={setInput('defaultPayment')}>
                  <option value="A">A — Balance at completion</option>
                  <option value="B">B — Weekly draws</option>
                  <option value="C">C — Milestone draws</option>
                </Select>
              </FormGroup>
            </div>
            <FormGroup label="Accepted payment methods">
              <div className="flex flex-wrap gap-2">
                {PAY_METHODS.map(m => (
                  <button key={m} onClick={() => togglePayMethod(m)}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors', form.payMethods.includes(m)?'bg-navy text-white border-navy':'bg-white text-gray-500 border-gray-200')}>
                    {m}
                  </button>
                ))}
              </div>
            </FormGroup>
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
              These become your contract defaults. You can always override them per-job in the contract wizard.
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            {loading && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 border-2 border-gray-200 border-t-brand rounded-full animate-spin mb-4" />
                <p className="font-display font-bold text-navy">Generating your template…</p>
                <p className="text-xs text-gray-400 mt-1">Writing trade-specific contract language</p>
              </div>
            )}
            {!loading && !generated && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-5xl mb-4">🤖</div>
                <p className="font-display font-bold text-navy text-lg">Ready to generate</p>
                <p className="text-gray-400 text-sm mt-1 mb-6 max-w-xs">AI will write scope templates, warranty conditions, and pre-filled change order language for your specific trade</p>
                <Button variant="primary" className="w-full max-w-xs" onClick={generate}>Generate my template</Button>
              </div>
            )}
            {!loading && generated && (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="font-semibold text-sm text-emerald-800">Template generated</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Trade-specific language is ready for your contracts</p>
                </div>
                <div className="card text-sm space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">What was generated</p>
                  <p className="text-xs text-gray-600">Scope boilerplate for {generated.tradeLabel} work</p>
                  <p className="text-xs text-gray-600">{generated.scopeTemplates?.length || 0} scope templates for common job types</p>
                  <p className="text-xs text-gray-600">{generated.maintenanceTemplates?.length || 0} maintenance requirement sets (warranty conditions)</p>
                  <p className="text-xs text-gray-600">{generated.warrantyExclusions?.length || 0} warranty exclusions specific to {generated.tradeLabel}</p>
                  <p className="text-xs text-gray-600">{generated.commonChangeOrders?.length || 0} pre-written change order scenarios</p>
                </div>
                <Button variant="primary" className="w-full" onClick={saveTemplate}>Save template to my account</Button>
                <Button variant="ghost" className="w-full" onClick={() => { setGenerated(null); generate() }}>Regenerate</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {step < 3 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 flex gap-3" style={{paddingBottom:'calc(16px + env(safe-area-inset-bottom))'}}>
          <Button variant="ghost" className="flex-1" onClick={() => step > 1 ? setStep(s=>s-1) : navigate('/admin?tab=Contracts')}>
            {step > 1 ? '← Back' : 'Cancel'}
          </Button>
          <Button variant="primary" className="flex-[2]" onClick={() => step === 2 ? setStep(3) : setStep(s=>s+1)}>
            {step === 2 ? 'Generate template →' : 'Continue →'}
          </Button>
        </div>
      )}
    </div>
  )
}
