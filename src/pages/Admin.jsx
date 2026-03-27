import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { cn } from '../lib/utils'
import { TopNav } from '../components/layout/AppShell'
import { Button, FormGroup, Input, Select, Textarea, SectionTitle, Modal } from '../components/ui'
import { toast } from '../components/ui'

const TABS = ['Company','Job types','Contracts','Payroll','Branding']

export default function Admin() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') || 'Company')
  const { settings, updateSettings, updateContractDefaults, reset } = useStore()
  const { signOut, user } = useAuth()

  const co = settings || {}
  const { contractTemplate, contractTemplateMeta } = useStore(s => ({ contractTemplate: s.contractTemplate, contractTemplateMeta: s.contractTemplateMeta }))
  const cd = co.contractDefaults || {}

  const [company, setCompany] = useState({ coName: co.coName||'', coPhone: co.coPhone||'', coEmail: co.coEmail||'', license: co.license||'', primaryState: co.primaryState||'SC', tagline: co.tagline||'' })
  const [paySettings, setPaySettings] = useState({ ownerName: co.adminSettings?.ownerName||'', ownerPayPct: co.adminSettings?.ownerPayPct||60, retainPct: co.adminSettings?.retainPct||20 })
  const [contractSettings, setContractSettings] = useState({ lateFee: cd.lateFee||1.5, curePeriod: cd.curePeriod||10, lienDays: cd.lienDays||90, adminFee: cd.adminFee||75, defaultPayment: cd.defaultPayment||'deposit_completion', coResponseDays: cd.coResponseDays||5 })
  const [brandSettings, setBrandSettings] = useState({ brandColor: co.brandColor||'#0a3ef8', tagline: co.tagline||'' })
  const [showJobTypeModal, setShowJobTypeModal] = useState(null)
  const [jtForm, setJtForm] = useState({ name: '', warrantyYrs: 5 })

  const saveCompany = () => { updateSettings({ ...company, adminSettings: { ...co.adminSettings, ...paySettings } }); toast('Company settings saved') }
  const saveContracts = () => { updateContractDefaults(contractSettings); toast('Contract defaults saved') }
  const savePayroll = () => { updateSettings({ adminSettings: { ...co.adminSettings, ...paySettings } }); toast('Payroll settings saved') }
  const saveBranding = () => { updateSettings({ brandColor: brandSettings.brandColor, tagline: brandSettings.tagline }); toast('Branding saved') }

  const jobTypes = co.jobTypes || []

  const saveJobType = () => {
    if (!jtForm.name) return
    const updated = showJobTypeModal === 'new'
      ? [...jobTypes, { id: Date.now().toString(), ...jtForm, warrantyYrs: parseInt(jtForm.warrantyYrs)||5 }]
      : jobTypes.map(jt => jt.id === showJobTypeModal ? { ...jt, ...jtForm, warrantyYrs: parseInt(jtForm.warrantyYrs)||5 } : jt)
    updateSettings({ jobTypes: updated })
    setShowJobTypeModal(null)
    toast('Job type saved')
  }

  const deleteJobType = (id) => {
    updateSettings({ jobTypes: jobTypes.filter(jt => jt.id !== id) })
    setShowJobTypeModal(null)
    toast('Removed')
  }

  return (
    <>
      <TopNav title="Admin" onBack={() => navigate('/')} />
      <div className="flex border-b border-gray-100 bg-white sticky top-[58px] z-10 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0', tab===t?'border-brand text-brand':'border-transparent text-gray-400')}>{t}</button>
        ))}
      </div>

      <div className="px-4 pt-5 pb-32">
        {tab === 'Company' && (
          <div className="space-y-3">
            <SectionTitle>Company info</SectionTitle>
            <FormGroup label="Company name"><Input value={company.coName} onChange={e=>setCompany(c=>({...c,coName:e.target.value}))} placeholder="Proline Residential LLC" /></FormGroup>
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Phone"><Input type="tel" value={company.coPhone} onChange={e=>setCompany(c=>({...c,coPhone:e.target.value}))} /></FormGroup>
              <FormGroup label="Email"><Input type="email" value={company.coEmail} onChange={e=>setCompany(c=>({...c,coEmail:e.target.value}))} /></FormGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="License # (optional)" hint="Not required for all job types"><Input value={company.license} onChange={e=>setCompany(c=>({...c,license:e.target.value}))} placeholder="SC-GC-009241" /></FormGroup>
              <FormGroup label="Primary state"><Select value={company.primaryState} onChange={e=>setCompany(c=>({...c,primaryState:e.target.value}))}>{['SC','NC','GA','TN','VA'].map(s=><option key={s} value={s}>{s}</option>)}</Select></FormGroup>
            </div>
            <Button variant="primary" className="w-full mt-2" onClick={saveCompany}>Save company info</Button>
            <div className="border-t border-gray-100 pt-4 mt-4">
              <SectionTitle>Account</SectionTitle>
              {user && <p className="text-xs text-gray-400 mb-3">{user.email}</p>}
              <Button variant="ghost" className="w-full" onClick={() => { signOut(); navigate('/auth') }}>Sign out</Button>
              <div className="mt-4">
                <p className="text-xs text-red-500 font-semibold mb-2">Danger zone</p>
                <Button variant="danger" className="w-full" onClick={() => { if(window.confirm('Clear all data? This cannot be undone.')) { reset(); toast('Data cleared') } }}>Clear all data</Button>
              </div>
            </div>
          </div>
        )}

        {tab === 'Job types' && (
          <div>
            <SectionTitle>Job types</SectionTitle>
            <p className="text-xs text-gray-400 mb-3">Warranty years per job type — used in the contract wizard</p>
            <div className="space-y-2 mb-4">
              {jobTypes.map(jt => (
                <div key={jt.id} className="card flex items-center justify-between cursor-pointer active:scale-[0.99]" onClick={() => { setJtForm({name:jt.name,warrantyYrs:jt.warrantyYrs}); setShowJobTypeModal(jt.id) }}>
                  <div><p className="font-semibold text-sm text-navy">{jt.name}</p><p className="text-xs text-gray-400">{jt.warrantyYrs} year warranty</p></div>
                  <span className="text-gray-300 text-lg">›</span>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => { setJtForm({name:'',warrantyYrs:5}); setShowJobTypeModal('new') }}>+ Add job type</Button>
          </div>
        )}

        {tab === 'Contracts' && (
          <div className="space-y-3">
            <div className="bg-navy rounded-xl p-3 flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-white text-xs">{co.contractTemplateMeta?.trade ? 'Template loaded: '+co.contractTemplateMeta.trade : 'No AI template'}</p>
                <p className="text-white/50 text-xs mt-0.5">{co.contractTemplateMeta?.generatedAt ? 'Generated '+new Date(co.contractTemplateMeta.generatedAt).toLocaleDateString() : 'Generate trade-specific scope, warranty & CO language'}</p>
              </div>
              <button onClick={() => navigate('/template-setup')} className="text-xs font-bold text-white bg-brand rounded-lg px-3 py-1.5 flex-shrink-0">{contractTemplateMeta ? 'Regenerate' : 'Set up'}</button>
            </div>
            <SectionTitle>Contract defaults</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Late fee (%/mo)" hint="Default 1.5% = 18%/yr"><Input type="number" step="0.1" value={contractSettings.lateFee} onChange={e=>setContractSettings(c=>({...c,lateFee:parseFloat(e.target.value)||1.5}))} /></FormGroup>
              <FormGroup label="Admin fee ($)" hint="Per customer-requested CO"><Input type="number" value={contractSettings.adminFee} onChange={e=>setContractSettings(c=>({...c,adminFee:parseFloat(e.target.value)||75}))} /></FormGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Right-to-cure (days)" hint="SC requires 10 minimum"><Input type="number" value={contractSettings.curePeriod} onChange={e=>setContractSettings(c=>({...c,curePeriod:parseInt(e.target.value)||10}))} /></FormGroup>
              <FormGroup label="CO response deadline (days)"><Input type="number" value={contractSettings.coResponseDays} onChange={e=>setContractSettings(c=>({...c,coResponseDays:parseInt(e.target.value)||5}))} /></FormGroup>
            </div>
            <FormGroup label="Default payment structure">
              <Select value={contractSettings.defaultPayment} onChange={e=>setContractSettings(c=>({...c,defaultPayment:e.target.value}))}>
                <option value="deposit_completion">Materials deposit + balance at completion</option>
                <option value="deposit_draws">Materials deposit + weekly labor draws</option>
                <option value="deposit_milestone">Materials deposit + milestone draws</option>
              </Select>
            </FormGroup>
            <Button variant="primary" className="w-full mt-2" onClick={saveContracts}>Save contract defaults</Button>
          </div>
        )}

        {tab === 'Payroll' && (
          <div className="space-y-3">
            <SectionTitle>Owner payroll</SectionTitle>
            <FormGroup label="Owner name"><Input value={paySettings.ownerName} onChange={e=>setPaySettings(p=>({...p,ownerName:e.target.value}))} placeholder="Brandy Turner" /></FormGroup>
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Owner draw % of net" hint="% taken as owner pay each run"><Input type="number" min="0" max="100" value={paySettings.ownerPayPct} onChange={e=>setPaySettings(p=>({...p,ownerPayPct:parseInt(e.target.value)||0}))} /></FormGroup>
              <FormGroup label="Retain in business %" hint="% kept in business account"><Input type="number" min="0" max="100" value={paySettings.retainPct} onChange={e=>setPaySettings(p=>({...p,retainPct:parseInt(e.target.value)||0}))} /></FormGroup>
            </div>
            {(paySettings.ownerPayPct + paySettings.retainPct) > 100 && (
              <p className="text-xs text-red-500">Warning: percentages exceed 100%</p>
            )}
            <Button variant="primary" className="w-full mt-2" onClick={savePayroll}>Save payroll settings</Button>
          </div>
        )}

        {tab === 'Branding' && (
          <div className="space-y-3">
            <SectionTitle>Brand settings</SectionTitle>
            <FormGroup label="Tagline" hint="Appears on customer-facing documents"><Input value={brandSettings.tagline} onChange={e=>setBrandSettings(b=>({...b,tagline:e.target.value}))} placeholder="Quality work, guaranteed." /></FormGroup>
            <FormGroup label="Brand color">
              <div className="flex items-center gap-3">
                <input type="color" value={brandSettings.brandColor} onChange={e=>setBrandSettings(b=>({...b,brandColor:e.target.value}))} className="w-14 h-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
                <Input value={brandSettings.brandColor} onChange={e=>setBrandSettings(b=>({...b,brandColor:e.target.value}))} className="flex-1" />
              </div>
            </FormGroup>
            <Button variant="primary" className="w-full mt-2" onClick={saveBranding}>Save branding</Button>
          </div>
        )}
      </div>

      <Modal open={!!showJobTypeModal} onClose={() => setShowJobTypeModal(null)} title={showJobTypeModal === 'new' ? 'New job type' : 'Edit job type'}
        footer={
          <div className="flex gap-2">
            {showJobTypeModal !== 'new' && <Button variant="danger" onClick={() => deleteJobType(showJobTypeModal)}>Delete</Button>}
            <Button variant="ghost" className="flex-1" onClick={() => setShowJobTypeModal(null)}>Cancel</Button>
            <Button variant="primary" className="flex-[2]" onClick={saveJobType}>Save</Button>
          </div>
        }>
        <div className="space-y-3">
          <FormGroup label="Job type name *"><Input value={jtForm.name} onChange={e=>setJtForm(f=>({...f,name:e.target.value}))} placeholder="Gutter Installation" /></FormGroup>
          <FormGroup label="Default warranty (years)">
            <Select value={jtForm.warrantyYrs} onChange={e=>setJtForm(f=>({...f,warrantyYrs:e.target.value}))}>
              {[1,2,3,5,7,10].map(y=><option key={y} value={y}>{y} years</option>)}
            </Select>
          </FormGroup>
        </div>
      </Modal>
    </>
  )
}
