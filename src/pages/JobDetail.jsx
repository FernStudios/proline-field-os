import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { fmtM, fmtDShort, cn, uid } from '../lib/utils'
import { TopNav } from '../components/layout/AppShell'
import { Button, Card, Badge, Modal, FormGroup, Input, Select, Textarea, SectionTitle, Empty } from '../components/ui'
import { LIFECYCLE_STAGES, getStageInfo } from '../lib/lifecycle'
import { generateLienWaiverText } from '../lib/estimateText'
import { toast } from '../components/ui'

const TABS = ['Overview','Documents','Invoices','Tasks','Notes']
// lifecycle stages replaced

export default function JobDetail() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { jobs, contracts, changeOrders, invoices, estimates = [], addInvoice, addPayment, updateJob, settings } = useStore()
  const [tab, setTab] = useState('Overview')
  const [showCOSelector, setShowCOSelector] = useState(false)
  const [showLienWaiver, setShowLienWaiver] = useState(false)
  const [showStatusEdit, setShowStatusEdit] = useState(false)
  const [showInvoice, setShowInvoice] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', method: 'Check', memo: '', date: new Date().toISOString().split('T')[0] })
  const [noteText, setNoteText] = useState('')
  const [invForm, setInvForm] = useState({ amount: '', dueDate: '', notes: '' })
  const [taskText, setTaskText] = useState('')

  const job = jobs.find(j => j.id === jobId)
  if (!job) return <div className="p-8 text-center text-gray-400">Job not found. <button onClick={() => navigate('/jobs')} className="text-brand underline">Back to jobs</button></div>

  const jobContracts = contracts.filter(c => c.jobId === jobId)
  const jobCOs = changeOrders.filter(c => c.jobId === jobId)
  const jobInvoices = invoices.filter(i => i.jobId === jobId)
  const totalPaid = jobInvoices.reduce((s,i) => s+(i.payments||[]).reduce((p,pm) => p+(pm.amount||0), 0), 0)
  const totalInvoiced = jobInvoices.reduce((s,i) => s+(i.amount||0), 0)
  const balance = (job.contractValue||0) - totalPaid
  const tasks = job.tasks || []
  const notes = job.notes || ''

  const addInvoiceForJob = () => {
    if (!invForm.amount) { toast('Amount required'); return }
    addInvoice({ jobId, clientName: job.client, jobAddress: job.address, amount: parseFloat(invForm.amount), dueDate: invForm.dueDate, notes: invForm.notes })
    setShowInvoice(false)
    setInvForm({ amount: '', dueDate: '', notes: '' })
    toast('Invoice created')
  }

  const addTask = () => {
    if (!taskText.trim()) return
    const newTask = { id: uid(), text: taskText.trim(), done: false, created: new Date().toISOString() }
    updateJob(jobId, { tasks: [...tasks, newTask] })
    setTaskText('')
  }

  const toggleTask = (taskId) => {
    updateJob(jobId, { tasks: tasks.map(t => t.id === taskId ? {...t, done: !t.done} : t) })
  }

  const deleteTask = (taskId) => {
    updateJob(jobId, { tasks: tasks.filter(t => t.id !== taskId) })
  }

  const handlePayment = (invId) => {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) { toast('Amount required'); return }
    addPayment(invId, { ...payForm, amount: parseFloat(payForm.amount), id: uid() })
    setShowPaymentModal(null)
    setPayForm({ amount: '', method: 'Check', memo: '', date: new Date().toISOString().split('T')[0] })
    toast('Payment recorded')
  }

  const generateLienWaiver = () => {
    const con = jobContracts[0]
    const text = generateLienWaiverText({
      projectAddress: job.address,
      customerName: job.client,
      projectState: job.state || 'SC',
      contractNum: con?.num || '',
      finalPaymentAmount: totalPaid,
    }, settings || {})
    const w = window.open('','_blank')
    if (w) {
      w.document.write('<pre style="font-family:serif;font-size:12px;padding:2rem;max-width:700px;margin:auto;white-space:pre-wrap">'+text+'</pre>')
      w.document.close()
    }
    toast('Lien waiver opened')
  }

  const saveNote = () => {
    updateJob(jobId, { notes: noteText })
    setShowNote(false)
    toast('Notes saved')
  }

  const openNotes = () => {
    setNoteText(notes)
    setShowNote(true)
  }

  const doneTasks = tasks.filter(t => t.done).length

  return (
    <>
      <TopNav title={job.client} onBack={() => navigate('/jobs')}
        actions={
          <button onClick={() => setShowStatusEdit(true)} className={cn('badge text-xs', getStageInfo(job.kbStatus).badge || 'badge-gray')}>
            {getStageInfo(job.kbStatus).label || job.kbStatus || job.status}
          </button>
        }
      />
      <div className="flex gap-0 border-b border-gray-100 overflow-x-auto bg-white sticky top-[58px] z-10">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-3 text-xs font-semibold whitespace-nowrap flex-shrink-0 border-b-2 transition-colors',
              tab===t?'border-brand text-brand':'border-transparent text-gray-400'
            )}
          >
            {t}
            {t === 'Tasks' && tasks.length > 0 && <span className="ml-1 text-gray-300">({doneTasks}/{tasks.length})</span>}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">
        {tab === 'Overview' && (
          <div className="space-y-4">
            {/* Financial summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-400 mb-1">Contract</p><p className="font-display font-bold text-navy text-base">{fmtM(job.contractValue)}</p></div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-xs text-emerald-600 mb-1">Collected</p><p className="font-display font-bold text-emerald-700 text-base">{fmtM(totalPaid)}</p></div>
              <div className={cn('rounded-xl p-3 text-center', balance>0?'bg-amber-50':'bg-gray-50')}><p className={cn('text-xs mb-1', balance>0?'text-amber-600':'text-gray-400')}>Balance</p><p className={cn('font-display font-bold text-base', balance>0?'text-amber-700':'text-navy')}>{fmtM(balance)}</p></div>
            </div>

            {/* Job details */}
            <Card>
              <div className="space-y-2.5 text-sm">
                {job.address && <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0 text-xs">Address</span><span className="text-navy text-xs leading-relaxed">{job.address}</span></div>}
                {job.phone && <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0 text-xs">Phone</span><a href={`tel:${job.phone}`} className="text-brand text-xs">{job.phone}</a></div>}
                {job.email && <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0 text-xs">Email</span><a href={`mailto:${job.email}`} className="text-brand text-xs">{job.email}</a></div>}
                {job.type && <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0 text-xs">Type</span><span className="text-xs">{job.type}</span></div>}
                {job.startDate && <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0 text-xs">Start</span><span className="text-xs">{fmtDShort(job.startDate)}</span></div>}
                {job.state && <div className="flex gap-2"><span className="text-gray-400 w-20 flex-shrink-0 text-xs">State</span><span className="text-xs">{job.state}</span></div>}
              </div>
            </Card>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="primary" className="w-full text-xs" onClick={() => navigate(`/jobs/${jobId}/contract/new`)}>📋 New contract</Button>
              <Button variant="ghost" className="w-full text-xs" onClick={() => setShowCOSelector(true)}>⚠️ Change order</Button>
              <Button variant="ghost" className="w-full text-xs" onClick={() => setShowInvoice(true)}>💰 New invoice</Button>
              <Button variant="ghost" className="w-full text-xs" onClick={() => navigate(`/schedule`)}>🗓 Schedule job</Button>
            </div>
          </div>
        )}

        {tab === 'Documents' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant="primary" className="flex-1 text-xs" onClick={() => navigate(`/jobs/${jobId}/contract/new`)}>+ Contract</Button>
              <Button variant="ghost" className="flex-1 text-xs" onClick={() => navigate(`/jobs/${jobId}/estimate/new`)}>+ Estimate</Button>
              <Button variant="ghost" className="flex-1 text-xs" onClick={() => setShowCOSelector(true)}>+ Change order</Button>
            </div>
            {jobContracts.length === 0 && jobCOs.length === 0
              ? <Empty icon="📋" title="No documents" description="Create a contract to get started" />
              : <>
                  {estimates.filter(e => e.jobId === jobId).map(est => (
                    <Card key={est.id}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-sm">{est.num}</span>
                            <Badge variant={est.status==='approved'?'green':est.status==='declined'?'red':'amber'}>{est.status||'draft'}</Badge>
                          </div>
                          <p className="text-xs text-gray-400">{fmtM(est.price)}{est.expiryDate?' · Exp '+fmtDShort(est.expiryDate):''}</p>
                          {est.portalToken && (
                            <button onClick={() => { navigator.clipboard?.writeText(window.location.origin+'/portal/'+est.portalToken); toast('Portal link copied') }}
                              className="text-xs text-brand mt-0.5">Copy portal link</button>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{fmtDShort(est.created)}</p>
                      </div>
                    </Card>
                  ))}
                  {jobContracts.map(c => (
                    <Card key={c.id}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5"><span className="font-semibold text-sm">{c.num}</span><Badge variant={c.status==='signed'?'green':'amber'}>{c.status}</Badge></div>
                          <p className="text-xs text-gray-400">Version {c.paymentVersion} · {c.projectState} · {fmtM(c.price)}</p>
                          {c.warrantyYears && <p className="text-xs text-gray-400">{c.warrantyYears} year warranty</p>}
                          {c.attorneyAck && <p className={cn('text-xs mt-1', c.attorneyAck.type==='reviewed'?'text-emerald-600':'text-amber-500')}>
                            {c.attorneyAck.type==='reviewed'?'✓ Attorney reviewed':c.attorneyAck.type==='ai_generated'?'⚡ AI provisions':'⚠ No review'} · {c.attorneyAck.confirmedBy}
                          </p>}
                        </div>
                        <p className="text-xs text-gray-400">{fmtDShort(c.created)}</p>
                      </div>
                    </Card>
                  ))}
                  {jobCOs.map(c => (
                    <Card key={c.id}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-sm">{c.num}</span>
                            <Badge variant={c.status==='approved'?'green':c.status==='declined'?'red':'amber'}>{c.status}</Badge>
                          </div>
                          <p className="text-xs text-gray-400">{c.coType==='customer'?'Customer-requested':c.coType==='required_a'?'Required — Track A':'Required — Track B'}</p>
                          {c.amount > 0 && <p className="text-xs text-gray-400">{fmtM(c.amount)}</p>}
                        </div>
                        <p className="text-xs text-gray-400">{fmtDShort(c.created)}</p>
                      </div>
                    </Card>
                  ))}
                </>
            }
          </div>
        )}

        {tab === 'Invoices' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant="primary" className="flex-1 text-xs" onClick={() => setShowInvoice(true)}>+ New invoice</Button>
              {balance <= 0 && totalPaid > 0 && (
                <Button variant="ghost" className="flex-1 text-xs" onClick={generateLienWaiver}>Lien waiver</Button>
              )}
            </div>
            {jobInvoices.length === 0
              ? <Empty icon="💰" title="No invoices" />
              : jobInvoices.map(inv => {
                  const paid = (inv.payments||[]).reduce((s,p)=>s+(p.amount||0),0)
                  const bal = (inv.amount||0) - paid
                  return (
                    <Card key={inv.id}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5"><span className="font-semibold text-sm">{inv.num}</span><Badge variant={bal<=0?'green':paid>0?'amber':'red'}>{bal<=0?'Paid':paid>0?'Partial':'Unpaid'}</Badge></div>
                          <p className="text-xs text-gray-400">Total {fmtM(inv.amount)}</p>
                          {(inv.payments||[]).map((p,i) => <p key={i} className="text-xs text-emerald-600">{fmtDShort(p.date)} — {fmtM(p.amount)} via {p.method}</p>)}
                        </div>
                        <div>
                          <p className="font-bold text-navy">{fmtM(bal)}</p>
                          {bal > 0 && (
                            <button onClick={() => { setShowPaymentModal(inv.id); setPayForm(f=>({...f,amount:String(bal)})) }}
                              className="mt-1 text-xs font-semibold text-brand border border-brand rounded-lg px-2 py-1 active:scale-95 transition-transform whitespace-nowrap">
                              Record payment
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })
            }
          </div>
        )}

        {tab === 'Tasks' && (
          <div>
            <div className="flex gap-2 mb-4">
              <Input value={taskText} onChange={e=>setTaskText(e.target.value)} placeholder="Add a task…" className="flex-1"
                onKeyDown={e => e.key==='Enter' && addTask()} />
              <Button variant="primary" onClick={addTask} size="sm">Add</Button>
            </div>
            {tasks.length === 0
              ? <Empty icon="✅" title="No tasks" description="Track work items for this job" />
              : <div className="space-y-2">
                  {tasks.map(task => (
                    <div key={task.id} className={cn('flex items-start gap-3 p-3 rounded-xl border transition-colors', task.done?'bg-gray-50 border-gray-100':'bg-white border-gray-200')}>
                      <button onClick={() => toggleTask(task.id)} className={cn('w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors', task.done?'bg-navy border-navy':'border-gray-300')}>
                        {task.done && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                      <p className={cn('flex-1 text-sm', task.done?'line-through text-gray-400':'text-navy')}>{task.text}</p>
                      <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                    </div>
                  ))}
                  {doneTasks > 0 && <p className="text-xs text-gray-400 text-center py-2">{doneTasks} of {tasks.length} complete</p>}
                </div>
            }
          </div>
        )}

        {tab === 'Notes' && (
          <div>
            <Button variant="ghost" className="w-full mb-3" onClick={openNotes}>{notes ? 'Edit notes' : '+ Add notes'}</Button>
            {notes
              ? <Card><p className="text-sm text-navy leading-relaxed whitespace-pre-wrap">{notes}</p></Card>
              : <Empty icon="📝" title="No notes" description="Site conditions, customer requests, important details" />
            }
          </div>
        )}
      </div>

      {/* CO Type selector */}
      <Modal open={showCOSelector} onClose={() => setShowCOSelector(false)} title="New change order">
        <div className="space-y-3">
          {[
            { type:'customer', icon:'📋', title:'Customer-requested', desc:'Scope change at customer request. Requires admin fee + deposit.' },
            { type:'required_a', icon:'⛔', title:'Required — Track A (Life/Safety/Code)', desc:'Work cannot proceed. Customer must approve or terminate.' },
            { type:'required_b', icon:'⚠️', title:'Required — Track B (Warranty Impact)', desc:'Work can proceed but warranty void if declined.' },
          ].map(opt => (
            <button key={opt.type} onClick={() => { setShowCOSelector(false); navigate(`/jobs/${jobId}/co/new?type=${opt.type}`) }}
              className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-navy transition-colors active:scale-[0.99]"
            >
              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">{opt.icon}</span>
                <div><p className="font-semibold text-sm text-navy">{opt.title}</p><p className="text-xs text-gray-500 mt-1">{opt.desc}</p></div>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Status edit modal */}
      <Modal open={showStatusEdit} onClose={() => setShowStatusEdit(false)} title="Update status">
        <div className="space-y-2">
          {LIFECYCLE_STAGES.map(s => (
            <button key={s} onClick={() => { updateJob(jobId, { kbStatus: s.id, status: ['paid','lien_waiver_issued','closed'].includes(s.id)?'complete':'active' }); setShowStatusEdit(false); toast('Moved to: '+s.label) }}
              className={cn('w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center justify-between', job.kbStatus===s.id?'border-brand bg-blue-50':'border-gray-200 hover:border-gray-300')}
            >
              <span className={cn('text-sm font-semibold', job.kbStatus===s.id?'text-brand':'text-navy')}>{s.label}</span>
              <span className="text-xs text-gray-400 capitalize">{s.phase}</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* New invoice modal */}
      <Modal open={showInvoice} onClose={() => setShowInvoice(false)} title="New invoice"
        footer={<div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setShowInvoice(false)}>Cancel</Button><Button variant="primary" className="flex-[2]" onClick={addInvoiceForJob}>Create</Button></div>}>
        <div className="space-y-3">
          <FormGroup label="Amount *"><Input type="number" value={invForm.amount} onChange={e=>setInvForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" /></FormGroup>
          <FormGroup label="Due date"><Input type="date" value={invForm.dueDate} onChange={e=>setInvForm(f=>({...f,dueDate:e.target.value}))} /></FormGroup>
          <FormGroup label="Notes"><Input value={invForm.notes} onChange={e=>setInvForm(f=>({...f,notes:e.target.value}))} placeholder="Optional" /></FormGroup>
        </div>
      </Modal>

      {/* Payment modal */}
      <Modal open={!!showPaymentModal} onClose={() => setShowPaymentModal(null)} title="Record payment"
        footer={<div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setShowPaymentModal(null)}>Cancel</Button><Button variant="primary" className="flex-[2]" onClick={() => handlePayment(showPaymentModal)}>Record</Button></div>}>
        <div className="space-y-3">
          <FormGroup label="Amount *"><Input type="number" value={payForm.amount} onChange={e=>setPayForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" /></FormGroup>
          <FormGroup label="Method">
            <Select value={payForm.method} onChange={e=>setPayForm(f=>({...f,method:e.target.value}))}>
              {['Check','Zelle','Cash App','Venmo','ACH','Cash','Credit Card','Other'].map(m=><option key={m} value={m}>{m}</option>)}
            </Select>
          </FormGroup>
          <FormGroup label="Date"><Input type="date" value={payForm.date} onChange={e=>setPayForm(f=>({...f,date:e.target.value}))} /></FormGroup>
          <FormGroup label="Memo"><Input value={payForm.memo} onChange={e=>setPayForm(f=>({...f,memo:e.target.value}))} placeholder="Check #1042, Zelle ref..." /></FormGroup>
        </div>
      </Modal>

      {/* Notes modal */}
      <Modal open={showNote} onClose={() => setShowNote(false)} title="Job notes"
        footer={<div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setShowNote(false)}>Cancel</Button><Button variant="primary" className="flex-[2]" onClick={saveNote}>Save</Button></div>}>
        <Textarea rows={8} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Site conditions, customer requests, scope details, special instructions…" />
      </Modal>
    </>
  )
}
