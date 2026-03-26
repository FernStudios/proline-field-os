import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { fmtM, fmtDShort, cn, uid } from '../lib/utils'
import { TopNav } from '../components/layout/AppShell'
import { Button, Card, Badge, Modal, FormGroup, Input, Select, Empty } from '../components/ui'
import { toast } from '../components/ui'

const PAYMENT_METHODS = ['Check','Zelle','Cash App','Venmo','ACH','Cash','Credit Card','PayPal','Other']

export default function Invoices() {
  const [params] = useSearchParams()
  const { invoices, jobs, addInvoice, addPayment } = useStore()
  const [showNew, setShowNew] = useState(false)
  const [showPayment, setShowPayment] = useState(null)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({ jobId: params.get('jobId')||'', amount: '', dueDate: '', notes: '' })
  const [payForm, setPayForm] = useState({ amount: '', method: 'Check', memo: '', date: new Date().toISOString().split('T')[0] })

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}))
  const setP = k => e => setPayForm(f => ({...f, [k]: e.target.value}))

  const filtered = invoices.filter(inv => filter === 'all' || inv.status === filter)

  const totalOutstanding = invoices.reduce((s, inv) => {
    const paid = (inv.payments||[]).reduce((p, pm) => p+(pm.amount||0), 0)
    return s + Math.max(0, (inv.amount||0) - paid)
  }, 0)

  const handleCreate = () => {
    if (!form.amount || !form.jobId) { toast('Job and amount required'); return }
    const job = jobs.find(j => j.id === form.jobId)
    addInvoice({ ...form, amount: parseFloat(form.amount), clientName: job?.client||'' })
    setShowNew(false)
    setForm({ jobId: '', amount: '', dueDate: '', notes: '' })
    toast('Invoice created')
  }

  const handlePayment = (invId) => {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) { toast('Amount required'); return }
    addPayment(invId, { ...payForm, amount: parseFloat(payForm.amount), id: uid() })
    setShowPayment(null)
    setPayForm({ amount: '', method: 'Check', memo: '', date: new Date().toISOString().split('T')[0] })
    toast('Payment recorded')
  }

  return (
    <>
      <TopNav title="Invoices" actions={<button onClick={() => setShowNew(true)} className="text-white text-xl font-light">+</button>} />
      <div className="px-4 pt-4">
        <div className="bg-navy rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/50 text-xs font-medium">Outstanding balance</p>
            <p className="text-white/40 text-xs">{invoices.filter(i => i.status !== 'paid').length} open invoices</p>
          </div>
          <p className="text-white font-display font-bold text-3xl">{fmtM(totalOutstanding)}</p>
          {invoices.length > 0 && (
            <div className="flex gap-4 mt-2.5 pt-2.5 border-t border-white/10">
              <div><p className="text-white/40 text-[10px]">Total invoiced</p><p className="text-white/80 text-xs font-semibold">{fmtM(invoices.reduce((s,i)=>s+(i.amount||0),0))}</p></div>
              <div><p className="text-white/40 text-[10px]">Collected</p><p className="text-emerald-400 text-xs font-semibold">{fmtM(invoices.reduce((s,i)=>s+(i.payments||[]).reduce((p,pm)=>p+(pm.amount||0),0),0))}</p></div>
              <div><p className="text-white/40 text-[10px]">Invoices</p><p className="text-white/80 text-xs font-semibold">{invoices.length}</p></div>
            </div>
          )}
        </div>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[['all','All'],['unpaid','Unpaid'],['partial','Partial'],['paid','Paid']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)} className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex-shrink-0', filter===v?'bg-navy text-white border-navy':'bg-white text-gray-500 border-gray-200')}>{l}</button>
          ))}
        </div>
        {filtered.length === 0
          ? <Empty icon="💰" title="No invoices" action={<Button variant="primary" onClick={() => setShowNew(true)}>+ New invoice</Button>} />
          : <div className="space-y-2.5">
              {filtered.map(inv => {
                const paid = (inv.payments||[]).reduce((s,p)=>s+(p.amount||0),0)
                const balance = (inv.amount||0) - paid
                const job = jobs.find(j => j.id === inv.jobId)
                return (
                  <Card key={inv.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-navy">{inv.num}</span>
                          <Badge variant={inv.status==='paid'?'green':inv.status==='partial'?'amber':'red'}>{inv.status}</Badge>
                        </div>
                        <p className="text-xs text-gray-400">{job?.client||inv.clientName||'—'}</p>
                        {inv.dueDate && <p className="text-xs text-gray-400">Due {fmtDShort(inv.dueDate)}</p>}
                        {(inv.payments||[]).length > 0 && <p className="text-xs text-emerald-600 mt-1">{fmtM(paid)} received</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-navy text-sm">{fmtM(balance)}</p>
                        <p className="text-xs text-gray-400">of {fmtM(inv.amount)}</p>
                        {balance > 0 && (
                          <button onClick={() => { setShowPayment(inv.id); setPayForm(f=>({...f,amount:String(balance)})) }}
                            className="mt-1.5 text-xs font-semibold text-brand border border-brand rounded-lg px-2 py-1 active:scale-95 transition-transform">
                            Record payment
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
        }
      </div>
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New invoice"
        footer={<div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setShowNew(false)}>Cancel</Button><Button variant="primary" className="flex-[2]" onClick={handleCreate}>Create</Button></div>}>
        <div className="space-y-3">
          <FormGroup label="Job *"><Select value={form.jobId} onChange={set('jobId')}><option value="">Select job…</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.client} — {j.address?.split(',')[0]}</option>)}</Select></FormGroup>
          <FormGroup label="Amount *"><Input type="number" value={form.amount} onChange={set('amount')} placeholder="0.00" /></FormGroup>
          <FormGroup label="Due date"><Input type="date" value={form.dueDate} onChange={set('dueDate')} /></FormGroup>
          <FormGroup label="Notes"><Input value={form.notes} onChange={set('notes')} placeholder="Optional" /></FormGroup>
        </div>
      </Modal>
      <Modal open={!!showPayment} onClose={() => setShowPayment(null)} title="Record payment"
        footer={<div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setShowPayment(null)}>Cancel</Button><Button variant="primary" className="flex-[2]" onClick={() => handlePayment(showPayment)}>Record</Button></div>}>
        <div className="space-y-3">
          <FormGroup label="Amount *"><Input type="number" value={payForm.amount} onChange={setP('amount')} placeholder="0.00" /></FormGroup>
          <FormGroup label="Payment method"><Select value={payForm.method} onChange={setP('method')}>{PAYMENT_METHODS.map(m=><option key={m} value={m}>{m}</option>)}</Select></FormGroup>
          <FormGroup label="Date"><Input type="date" value={payForm.date} onChange={setP('date')} /></FormGroup>
          <FormGroup label="Memo"><Input value={payForm.memo} onChange={setP('memo')} placeholder="Check #1042, deposit ref…" /></FormGroup>
        </div>
      </Modal>
    </>
  )
}
