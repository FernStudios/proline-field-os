import { useState } from 'react'
import { printTemplate } from '../lib/templatePrint'
import { generateAndDownloadPacket } from '../lib/generateDocxPacket'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { TopNav } from '../components/layout/AppShell'
import { ProgressBar, FormGroup, Input, Select, Button } from '../components/ui'
import { toast } from '../components/ui'
import { cn } from '../lib/utils'

const TRADE_SERVICES = {
  gutters: [
    'Seamless gutter installation','Gutter replacement','Gutter repair','Gutter cleaning',
    'Downspout installation','Downspout repair','Gutter guards / leaf protection',
    'Fascia replacement','Soffit replacement','Fascia & soffit repair',
    'Drip edge installation','Ice & water shield','Gutter realignment',
    'Downspout extensions','Underground drainage','Splash blocks',
  ],
  roofing: [
    'Shingle replacement','Metal roofing','Flat / TPO roofing','EPDM roofing',
    'Roof repair','Emergency roof repair','Skylight installation','Skylight repair',
    'Chimney flashing','Valley flashing','Ridge cap','Decking replacement',
    'Attic ventilation','Soffit & fascia','Drip edge','Ice & water shield',
  ],
  hvac: [
    'AC installation','AC replacement','Furnace installation','Heat pump installation',
    'Mini-split installation','HVAC repair','HVAC maintenance','Duct cleaning',
    'Duct sealing','Thermostat installation','Air quality systems','Refrigerant recharge',
  ],
  plumbing: [
    'Water heater installation','Tankless water heater','Drain cleaning','Hydro jetting',
    'Pipe repair','Pipe replacement','Repiping','Fixture installation',
    'Toilet replacement','Faucet installation','Water softener','Sump pump',
    'Gas line work','Backflow prevention','Sewer line repair',
  ],
  painting: [
    'Exterior painting','Interior painting','Cabinet painting','Deck staining',
    'Fence staining','Pressure washing','Power washing','Epoxy floor coating',
    'Drywall repair','Trim painting','Stucco painting','Concrete sealing',
  ],
  siding: [
    'Vinyl siding installation','Fiber cement siding','Wood siding','Hardie board',
    'Siding repair','Siding replacement','Soffit installation','Fascia installation',
    'Trim installation','Wrap installation','Caulking','Storm damage repair',
  ],
  general: [
    'Kitchen remodel','Bathroom remodel','Room addition','Basement finishing',
    'Deck construction','Deck repair','Fence installation','Flooring installation',
    'Tile installation','Drywall installation','Insulation','Window replacement',
    'Door replacement','Garage door','Concrete work','Masonry',
  ],
}

export default function TemplateSetup() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { settings, setContractTemplate, templateGenerationCount } = useStore()
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
Services: ${[...form.services, ...(form.customServices ? form.customServices.split(',').map(s=>s.trim()).filter(Boolean) : [])].join(', ')}

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
          max_tokens: 8000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await resp.json()
      // Check for API-level error
      if (data.error) throw new Error(data.error)

      const text = data.content?.[0]?.text || ''
      if (!text.trim()) throw new Error('Empty response from AI — check GEMINI_API_KEY in Vercel env vars')

      const clean = text.replace(/```json\n?/g,'').replace(/\n?```/g,'').trim()

      // Find start of JSON object
      const startIdx = clean.indexOf('{')
      if (startIdx === -1) throw new Error('No JSON found in AI response')

      // Try parsing directly first
      let parsed = null
      let jsonStr = clean.substring(startIdx)
      try {
        parsed = JSON.parse(jsonStr)
      } catch {
        // Response may be truncated — try to close open structures
        // Count open braces/brackets to determine how many to close
        let braces = 0, brackets = 0, inString = false, escape = false
        for (const ch of jsonStr) {
          if (escape) { escape = false; continue }
          if (ch === '\\') { escape = true; continue }
          if (ch === '"' && !escape) { inString = !inString; continue }
          if (inString) continue
          if (ch === '{') braces++
          else if (ch === '}') braces--
          else if (ch === '[') brackets++
          else if (ch === ']') brackets--
        }
        // Close any open arrays then objects
        let fixed = jsonStr
        // Remove trailing incomplete string/value
        fixed = fixed.replace(/,?\s*"[^"]*$/, '')  // remove incomplete key
        fixed = fixed.replace(/,?\s*$/, '')          // remove trailing comma
        for (let i = 0; i < brackets; i++) fixed += ']'
        for (let i = 0; i < braces; i++) fixed += '}'
        try {
          parsed = JSON.parse(fixed)
        } catch(e2) {
          throw new Error('AI response could not be parsed. Try generating again.')
        }
      }
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
  const PAY_METHODS = ['Check','Zelle','Cash App','Venmo','PayPal','ACH','Cash','Credit Card']

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

      <div className="flex-1 overflow-y-auto px-4 pt-4" style={{paddingBottom:'140px'}}>
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
              <FormGroup label="Services you offer" hint="Select all that apply — or type additional services below">
                <div className="flex flex-wrap gap-2 mb-2">
                  {services.map(s => (
                    <button key={s} onClick={() => toggleService(s)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors', form.services.includes(s)?'bg-navy text-white border-navy':'bg-white text-gray-500 border-gray-200')}>
                      {s}
                    </button>
                  ))}
                </div>
                <Input value={form.customServices||''} onChange={e => setForm(f => ({...f, customServices: e.target.value}))}
                  placeholder="Add more services, comma-separated (e.g. Copper gutters, Historic restoration)" />
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
                {(templateGenerationCount || 0) >= 1 && !user?.user_metadata?.plan ? (
                  <div className="text-center">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                      <p className="font-semibold text-amber-800 text-sm mb-1">Trial limit reached</p>
                      <p className="text-xs text-amber-700">Your free trial includes 1 AI template generation. Upgrade to a paid plan for 3/month.</p>
                    </div>
                    <Button variant="ghost" className="w-full max-w-xs" onClick={saveTemplate} disabled={!generated}>Use existing template</Button>
                  </div>
                ) : (
                  <Button variant="primary" className="w-full max-w-xs" onClick={generate}>Generate my template</Button>
                )}
              </div>
            )}
            {!loading && generated && (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="font-semibold text-sm text-emerald-800">Template generated</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Review all sections below, then save when ready.</p>
                </div>

                {/* Attorney review notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1">⚖️ Attorney review recommended</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Review all language below with your attorney before using in contracts. This AI-generated language is a starting point — your attorney should confirm it is appropriate for your state and trade.
                  </p>
                </div>

                {/* Print / export button */}
                <button
                  onClick={() => generateAndDownloadPacket(generated, settings)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-navy text-white font-semibold text-sm rounded-xl">
                  ⬇ Download full document packet (.docx)
                </button>

                {/* Scope boilerplate */}
                <details className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none">
                    <span className="font-semibold text-sm text-navy">Scope boilerplate</span>
                    <span className="text-xs text-gray-400">Tap to expand ›</span>
                  </summary>
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500 mb-2 leading-relaxed italic">This appears at the top of every scope of work section.</p>
                    <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3 font-mono whitespace-pre-wrap">{generated.scopeBoilerplate}</p>
                  </div>
                </details>

                {/* Scope templates */}
                {(generated.scopeTemplates || []).map((t, i) => (
                  <details key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none">
                      <div>
                        <span className="font-semibold text-sm text-navy">{t.jobType}</span>
                        <span className="text-xs text-gray-400 ml-2">Scope template</span>
                      </div>
                      <span className="text-xs text-gray-400">›</span>
                    </summary>
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-500 mb-2 italic">Variables in {'{{'} double brackets {'}'} are filled in by the contract wizard.</p>
                      <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{t.scope}</p>
                    </div>
                  </details>
                ))}

                {/* Warranty conditions / maintenance */}
                {(generated.maintenanceTemplates || []).map((t, i) => (
                  <details key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none">
                      <div>
                        <span className="font-semibold text-sm text-navy">{t.jobType}</span>
                        <span className="text-xs text-gray-400 ml-2">Warranty conditions</span>
                      </div>
                      <span className="text-xs text-gray-400">›</span>
                    </summary>
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-500 mb-2 italic">Customer must follow these to keep their warranty valid.</p>
                      <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{Array.isArray(t.requirements) ? t.requirements.join('\n\n') : t.requirements}</p>
                    </div>
                  </details>
                ))}

                {/* Warranty exclusions */}
                {(generated.warrantyExclusions || []).length > 0 && (
                  <details className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none">
                      <span className="font-semibold text-sm text-navy">Warranty exclusions ({generated.warrantyExclusions.length})</span>
                      <span className="text-xs text-gray-400">›</span>
                    </summary>
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
                      <p className="text-xs text-gray-500 mb-2 italic">These conditions void the warranty if present at the time of work.</p>
                      {generated.warrantyExclusions.map((ex, i) => (
                        <div key={i} className="text-xs text-gray-700 bg-gray-50 rounded-lg p-2.5">
                          <span className="font-medium">{typeof ex === 'string' ? ex : ex.condition || ex}</span>
                          {ex.explanation && <p className="text-gray-500 mt-0.5">{ex.explanation}</p>}
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Change order scenarios */}
                {(generated.commonChangeOrders || []).map((co, i) => (
                  <details key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none">
                      <div>
                        <span className="font-semibold text-sm text-navy">CO scenario {i + 1}</span>
                        <span className={cn('text-xs ml-2', co.type === 'required_a' ? 'text-red-500' : co.type === 'required_b' ? 'text-amber-500' : 'text-blue-500')}>
                          {co.type === 'required_a' ? 'Life/safety' : co.type === 'required_b' ? 'Warranty impact' : 'Customer request'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">›</span>
                    </summary>
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2 text-xs">
                      <p className="text-gray-500 italic">{co.scenario}</p>
                      {co.descriptionTemplate && <div className="bg-gray-50 rounded-lg p-2.5"><p className="text-gray-400 text-[10px] font-semibold mb-1">DESCRIPTION</p><p className="text-gray-700">{co.descriptionTemplate}</p></div>}
                      {co.conditionTemplate && <div className="bg-gray-50 rounded-lg p-2.5"><p className="text-gray-400 text-[10px] font-semibold mb-1">CONDITION</p><p className="text-gray-700">{co.conditionTemplate}</p></div>}
                      {co.correctiveTemplate && <div className="bg-gray-50 rounded-lg p-2.5"><p className="text-gray-400 text-[10px] font-semibold mb-1">CORRECTIVE WORK</p><p className="text-gray-700">{co.correctiveTemplate}</p></div>}
                      {co.consequenceTemplate && <div className="bg-gray-50 rounded-lg p-2.5"><p className="text-gray-400 text-[10px] font-semibold mb-1">CONSEQUENCE IF DECLINED</p><p className="text-gray-700">{co.consequenceTemplate}</p></div>}
                    </div>
                  </details>
                ))}

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">What happens when you save?</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    The template is saved as a <strong>draft</strong> — stored in your account but not yet active.
                    You can review it with your attorney, then go to <strong>Admin → Contracts</strong> to unlock it for use.
                    Until unlocked, contracts use generic language instead of your custom template.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="primary" className="flex-1" onClick={saveTemplate}>Save as draft</Button>
                  <Button variant="ghost" className="flex-1" onClick={() => { setGenerated(null); generate() }}>Regenerate</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {step < 3 && (
        <div className="fixed left-0 right-0 bg-white border-t border-gray-100 p-4 flex gap-3" style={{bottom:'65px', paddingBottom:'env(safe-area-inset-bottom)'}}>
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
