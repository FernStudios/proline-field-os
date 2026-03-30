import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { cn } from '../lib/utils'
import { TopNav } from '../components/layout/AppShell'
import { Button, FormGroup, Input, Select, Textarea, SectionTitle, Modal } from '../components/ui'
import { toast } from '../components/ui'

const TABS = ['Company','Job types','Contracts','Payroll','Roles','Branding']

export default function Admin() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') || 'Company')
  const { settings, updateSettings, updateContractDefaults, reset, syncToSupabase, contractTemplate, contractTemplateMeta, rolePermissions, accountTeam } = useStore()
  const { signOut, user } = useAuth()

  const co = settings || {}
  const doSync = () => { if (user?.id && syncToSupabase) syncToSupabase(user.id) }
  const cd = co.contractDefaults || {}

  const [company, setCompany] = useState({ coName: co.coName||'', coPhone: co.coPhone||'', coEmail: co.coEmail||'', license: co.license||'', primaryState: co.primaryState||'SC', tagline: co.tagline||'' })
  const [paySettings, setPaySettings] = useState({ ownerName: co.adminSettings?.ownerName||'', ownerPayPct: co.adminSettings?.ownerPayPct||60, retainPct: co.adminSettings?.retainPct||20 })
  const [contractSettings, setContractSettings] = useState({ lateFee: cd.lateFee||1.5, curePeriod: cd.curePeriod||10, lienDays: cd.lienDays||90, adminFee: cd.adminFee||75, defaultPayment: cd.defaultPayment||'deposit_completion', coResponseDays: cd.coResponseDays||5 })
  const [brandSettings, setBrandSettings] = useState({ brandColor: co.brandColor||'#0a3ef8', tagline: co.tagline||'' })
  const [showJobTypeModal, setShowJobTypeModal] = useState(null)
  const [jtForm, setJtForm] = useState({ name: '', warrantyYrs: 5 })

  const saveCompany = () => { updateSettings({ ...company, adminSettings: { ...co.adminSettings, ...paySettings } }); doSync(); toast('Company settings saved') }
  const saveContracts = () => { updateContractDefaults(contractSettings); doSync(); toast('Contract defaults saved') }
  const savePayroll = () => { updateSettings({ adminSettings: { ...co.adminSettings, ...paySettings } }); doSync(); toast('Payroll settings saved') }
  const saveBranding = () => { updateSettings({ brandColor: brandSettings.brandColor, tagline: brandSettings.tagline }); doSync(); toast('Branding saved') }

  const jobTypes = co.jobTypes || []

  const saveJobType = () => {
    if (!jtForm.name) return
    const updated = showJobTypeModal === 'new'
      ? [...jobTypes, { id: Date.now().toString(), ...jtForm, warrantyYrs: parseInt(jtForm.warrantyYrs)||5 }]
      : jobTypes.map(jt => jt.id === showJobTypeModal ? { ...jt, ...jtForm, warrantyYrs: parseInt(jtForm.warrantyYrs)||5 } : jt)
    updateSettings({ jobTypes: updated }); doSync()
    setShowJobTypeModal(null)
    toast('Job type saved')
  }

  const deleteJobType = (id) => {
    updateSettings({ jobTypes: jobTypes.filter(jt => jt.id !== id) }); doSync()
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
              {user?.email === 'brandyturner815@gmail.com' && (
                <button onClick={() => navigate('/owner')} className="w-full mb-3 py-2.5 bg-[#050d1f] text-white text-xs font-bold rounded-xl">
                  🔒 Platform admin
                </button>
              )}
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

            {/* Contract wizard is always available */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="font-semibold text-sm text-emerald-800 mb-1">✓ Contract wizard is ready</p>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Create contracts from any job's Documents tab. The wizard generates a full 14-article residential construction contract with your company info, scope, and payment terms.
              </p>
            </div>

            {/* Custom contract templates */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-sm text-navy mb-1">📁 Custom contract templates</p>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                Upload your own attorney-approved contract as a template in the Document Vault. It will be available to reference when creating contracts for jobs.
              </p>
              <div className="flex gap-2">
                <button onClick={() => navigate('/documents')}
                  className="flex-1 py-2.5 bg-navy text-white text-xs font-semibold rounded-xl">
                  Document Vault →
                </button>
                <button onClick={() => navigate('/documents')}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-xl">
                  Document Vault
                </button>
              </div>
            </div>

            <button onClick={() => navigate('/document-templates')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors mb-2">
              <div className="flex items-center gap-3">
                <span className="text-xl">📝</span>
                <div className="text-left">
                  <p className="font-semibold text-sm text-navy">Edit document templates</p>
                  <p className="text-xs text-gray-400 mt-0.5">Scope, warranty, CO opening language</p>
                </div>
              </div>
              <span className="text-gray-300 text-sm">›</span>
            </button>

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

            {/* AI template - available but not required */}
            <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-xs text-gray-600 mb-1">AI contract template (optional)</p>
              <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                Generate trade-specific scope language, warranty conditions, and pre-written change order scenarios. Optional — the contract wizard works without it.
              </p>
              {contractTemplateMeta ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    {contractTemplateMeta.trade} template — {contractTemplateMeta.status === 'active' ? '✓ active' : 'draft'}
                  </span>
                  <button onClick={() => navigate('/template-setup')}
                    className="text-xs font-semibold text-brand">Manage</button>
                </div>
              ) : (
                <button onClick={() => navigate('/template-setup')}
                  className="text-xs font-semibold text-gray-500 underline">Set up AI template</button>
              )}
            </div>
          </div>
        )}

        {tab === 'Payroll' && (
          <div className="space-y-3">
            {/* Owner payroll — one row per owner (primary + co-owners) */}
            <SectionTitle>Owner payroll</SectionTitle>
            <p className="text-xs text-gray-400 -mt-1 mb-3 leading-relaxed">
              Set a draw percentage for each owner. All owner draws are taken from net profit before crew payroll.
              Add additional owners via <button onClick={() => navigate('/account-team')} className="text-brand underline">Account & Team</button>.
            </p>

            {/* Primary owner row */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2.5 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">👑</span>
                <p className="font-semibold text-sm text-navy">{settings.adminSettings?.ownerName || user?.email || 'Primary owner'}</p>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">Primary</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormGroup label="Draw % of net">
                  <Input type="number" min="0" max="100" value={paySettings.ownerPayPct}
                    onChange={e=>setPaySettings(p=>({...p,ownerPayPct:parseInt(e.target.value)||0}))} />
                </FormGroup>
                <FormGroup label="Retain in business %">
                  <Input type="number" min="0" max="100" value={paySettings.retainPct}
                    onChange={e=>setPaySettings(p=>({...p,retainPct:parseInt(e.target.value)||0}))} />
                </FormGroup>
              </div>
            </div>

            {/* Co-owner rows — dynamically from accountTeam */}
            {(accountTeam || []).filter(m => m.role === 'owner').map(coOwner => {
              const pctKey = `ownerPct_${coOwner.id}`
              const pct = paySettings[pctKey] ?? 0
              return (
                <div key={coOwner.id} className="bg-white border border-gray-100 rounded-xl p-3 space-y-2.5 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">👑</span>
                    <p className="font-semibold text-sm text-navy">{coOwner.name}</p>
                    <span className="text-[10px] bg-gray-100 text-gray-600 font-bold px-1.5 py-0.5 rounded">Co-owner</span>
                  </div>
                  <FormGroup label="Draw % of net">
                    <Input type="number" min="0" max="100" value={pct}
                      onChange={e=>setPaySettings(p=>({...p, [pctKey]: parseInt(e.target.value)||0}))} />
                  </FormGroup>
                </div>
              )
            })}

            {/* Total check */}
            {(() => {
              const coOwnerTotal = (accountTeam || []).filter(m => m.role === 'owner')
                .reduce((sum, m) => sum + (paySettings[`ownerPct_${m.id}`] || 0), 0)
              const total = paySettings.ownerPayPct + paySettings.retainPct + coOwnerTotal
              return total > 100 ? (
                <p className="text-xs text-red-500">⚠ Total owner draws + retain ({total}%) exceed 100%</p>
              ) : total > 0 ? (
                <p className="text-xs text-gray-400">Total allocated: {total}% of net profit</p>
              ) : null
            })()}
            <Button variant="primary" className="w-full mt-2" onClick={savePayroll}>Save payroll settings</Button>
          </div>
        )}

        {tab === 'Roles' && (
          <div className="space-y-4 pt-1">
            <p className="text-xs text-gray-500 leading-relaxed">
              Customize what each role can access in your account.
              Owner always has full access and cannot be restricted.
            </p>
            {['office','foreman','crew'].map(role => {
              const meta = {
                office:  { icon: '💼', label: 'Office',  desc: 'Administrative staff' },
                foreman: { icon: '🦺', label: 'Foreman', desc: 'Field supervisors' },
                crew:    { icon: '👷', label: 'Crew',    desc: 'Field workers' },
              }[role]
              const perms = rolePermissions?.[role] || {}
              const count = Object.values(perms).filter(Boolean).length
              return (
                <button key={role} onClick={() => navigate('/role-permissions')}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{meta.icon}</span>
                    <div className="text-left">
                      <p className="font-semibold text-sm text-navy">{meta.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{meta.desc} · {count} permissions on</p>
                    </div>
                  </div>
                  <span className="text-gray-300 text-sm">›</span>
                </button>
              )
            })}
            <button onClick={() => navigate('/role-permissions')}
              className="w-full py-3 bg-navy text-white text-sm font-semibold rounded-xl">
              Configure role permissions →
            </button>
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
