import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { fmtM, uid } from '../../lib/utils'
import { TopNav } from '../../components/layout/AppShell'
import { ProgressBar, FormGroup, Input, Select, Textarea, Button } from '../../components/ui'
import { toast } from '../../components/ui'

export default function EstimateWizard() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { jobs, settings, _nextEst } = useStore()
  const job = jobs.find(j => j.id === jobId) || {}
  const [step, setStep] = useState(1)
  const [d, setD] = useState({
    estimateNum: `EST-${String(_nextEst || 1001).padStart(4,'0')}`,
    customerName: job.client || '',
    customerAddress: job.address || '',
    customerPhone: job.phone || '',
    customerEmail: job.email || '',
    projectAddress: job.address || '',
    projectState: job.state || 'SC',
    workType: job.type || '',
    scope: job.notes || '',
    exclusions: '',
    price: job.contractValue || '',
    depositAmount: '',
    expiryDate: new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
    notes: '',
  })
  const set = k => e => setD(prev => ({...prev, [k]: e.target.value}))

  const next = () => {
    if (step === 1 && !d.customerName) { toast('Customer name required'); return }
    if (step === 2 && !d.scope) { toast('Scope required'); return }
    if (step === 3 && (!d.price || parseFloat(d.price) <= 0)) { toast('Price required'); return }
    if (step < 4) setStep(s => s+1)
    else {
      sessionStorage.setItem('estimateWizardData', JSON.stringify({ ...d, jobId }))
      navigate(`/jobs/${jobId}/estimate/preview`)
    }
  }

  return (
    <div className="screen">
      <TopNav title="" onBack={step > 1 ? () => setStep(s=>s-1) : () => navigate(`/jobs/${jobId}`)} />
      <div className="px-4 pt-3 pb-2 bg-white border-b border-gray-100">
        <ProgressBar current={step} total={4} />
        <p className="text-xs text-gray-400 mt-2">Step {step} of 4 — Estimate</p>
        <p className="font-display font-bold text-navy text-base mt-0.5">
          {['Customer & project','Scope of work','Pricing','Review'][step-1]}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">

        {step === 1 && (
          <div className="space-y-3">
            <FormGroup label="Customer full name *"><Input value={d.customerName} onChange={set('customerName')} placeholder="John & Jane Smith" /></FormGroup>
            <FormGroup label="Customer address"><Input value={d.customerAddress} onChange={set('customerAddress')} /></FormGroup>
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Phone"><Input type="tel" value={d.customerPhone} onChange={set('customerPhone')} /></FormGroup>
              <FormGroup label="Email"><Input type="email" value={d.customerEmail} onChange={set('customerEmail')} /></FormGroup>
            </div>
            <FormGroup label="Project address"><Input value={d.projectAddress} onChange={set('projectAddress')} /></FormGroup>
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Work type"><Input value={d.workType} onChange={set('workType')} placeholder="Gutter installation" /></FormGroup>
              <FormGroup label="State"><Select value={d.projectState} onChange={set('projectState')}>{['SC','NC','GA','TN','VA'].map(s=><option key={s} value={s}>{s}</option>)}</Select></FormGroup>
            </div>
            <FormGroup label="Estimate valid through"><Input type="date" value={d.expiryDate} onChange={set('expiryDate')} /></FormGroup>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800 leading-relaxed">
              Be specific — include materials, specs, colors, measurements, and anything the customer expects. This is what they're agreeing to.
            </div>
            <FormGroup label="Scope of work *">
              <Textarea rows={10} value={d.scope} onChange={set('scope')} className="font-serif text-xs leading-relaxed" placeholder="Supply and install 120 LF of 6-inch K-style seamless aluminum gutters in Musket Brown, including 6 downspouts…" />
            </FormGroup>
            <FormGroup label="Exclusions" hint="What is NOT included in this estimate">
              <Textarea rows={3} value={d.exclusions} onChange={set('exclusions')} className="font-serif text-xs" placeholder="Does not include fascia repair, painting, or removal of debris unrelated to gutters…" />
            </FormGroup>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <FormGroup label="Total estimate price *"><Input type="number" value={d.price} onChange={set('price')} placeholder="0.00" /></FormGroup>
            <FormGroup label="Materials deposit amount" hint="Due at acceptance, before materials ordered"><Input type="number" value={d.depositAmount} onChange={set('depositAmount')} placeholder="0.00" /></FormGroup>
            {d.price > 0 && d.depositAmount > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-gray-500">Estimate total</span><span className="font-semibold">{fmtM(parseFloat(d.price)||0)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Deposit at acceptance</span><span>{fmtM(parseFloat(d.depositAmount)||0)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-1.5"><span className="font-semibold">Balance due at completion</span><span className="font-bold text-brand">{fmtM((parseFloat(d.price)||0)-(parseFloat(d.depositAmount)||0))}</span></div>
              </div>
            )}
            <FormGroup label="Additional notes" hint="Special considerations, product alternatives, site conditions"><Textarea rows={3} value={d.notes} onChange={set('notes')} /></FormGroup>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
              <p className="font-display font-bold text-navy text-xs uppercase tracking-wide mb-3">Estimate summary</p>
              <div className="space-y-1.5 text-xs text-gray-600">
                <p>📄 <strong>{d.estimateNum}</strong></p>
                <p>👤 {d.customerName}</p>
                <p>📍 {d.projectAddress}</p>
                <p>💰 {fmtM(parseFloat(d.price)||0)}{d.depositAmount?` · Deposit ${fmtM(parseFloat(d.depositAmount)||0)}`:''}</p>
                <p>📅 Valid through {d.expiryDate}</p>
                {d.scope && <p className="line-clamp-2 text-gray-400">Scope: {d.scope.substring(0,120)}…</p>}
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
              The estimate preview will be fully editable before saving. A customer portal link will be generated so they can review and accept online.
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 flex gap-3" style={{paddingBottom:'calc(16px + env(safe-area-inset-bottom))'}}>
        <Button variant="ghost" className="flex-1" onClick={() => step > 1 ? setStep(s=>s-1) : navigate(`/jobs/${jobId}`)}>← Back</Button>
        <Button variant="primary" className="flex-[2]" onClick={next}>{step < 4 ? 'Continue →' : 'Preview estimate →'}</Button>
      </div>
    </div>
  )
}
