import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { fmtDShort, cn, uid } from '../lib/utils'
import { TopNav } from '../components/layout/AppShell'
import { Button, Card, Modal, FormGroup, Input, Select, Textarea, Empty } from '../components/ui'
import { toast } from '../components/ui'

const TYPES = [
  { id: 'call_out',   label: 'Call — outbound',  icon: '📞', color: 'text-blue-600'   },
  { id: 'call_in',    label: 'Call — inbound',   icon: '📲', color: 'text-blue-600'   },
  { id: 'text_out',   label: 'Text — outbound',  icon: '💬', color: 'text-purple-600' },
  { id: 'text_in',    label: 'Text — inbound',   icon: '💬', color: 'text-purple-600' },
  { id: 'email_out',  label: 'Email — sent',     icon: '📧', color: 'text-gray-600'   },
  { id: 'email_in',   label: 'Email — received', icon: '📩', color: 'text-gray-600'   },
  { id: 'site_visit', label: 'Site visit',       icon: '🏠', color: 'text-amber-600'  },
  { id: 'in_person',  label: 'In-person meeting',icon: '🤝', color: 'text-green-600'  },
  { id: 'voicemail',  label: 'Voicemail left',   icon: '📮', color: 'text-gray-500'   },
  { id: 'note',       label: 'Internal note',    icon: '📝', color: 'text-gray-400'   },
]

const OUTCOMES = [
  { id: '',               label: '— No outcome —' },
  { id: 'reached',        label: 'Reached customer' },
  { id: 'no_answer',      label: 'No answer' },
  { id: 'left_message',   label: 'Left message' },
  { id: 'follow_up',      label: 'Follow-up needed' },
  { id: 'approved',       label: 'Customer approved' },
  { id: 'declined',       label: 'Customer declined' },
  { id: 'complaint',      label: 'Customer complaint' },
  { id: 'resolved',       label: 'Issue resolved' },
]

const EMPTY_FORM = {
  type: 'call_out',
  date: new Date().toISOString().slice(0, 16),
  summary: '',
  outcome: '',
  followUpDate: '',
  followUpNote: '',
  internal: false,
}

export default function CommLog() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { jobs, updateJob } = useStore()
  const job = jobs.find(j => j.id === jobId)
  const [showNew, setShowNew] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterType, setFilterType] = useState('all')

  if (!job) return <div className="p-8 text-center text-gray-400">Job not found</div>

  const log = [...(job.commLog || [])].sort((a, b) => new Date(b.date) - new Date(a.date))
  const filtered = filterType === 'all' ? log
    : filterType === 'notes' ? log.filter(e => e.type === 'note')
    : filterType === 'calls' ? log.filter(e => e.type.startsWith('call') || e.type === 'voicemail')
    : filterType === 'texts' ? log.filter(e => e.type.startsWith('text'))
    : log.filter(e => e.type.startsWith('email'))

  const pendingFollowUps = log.filter(e => e.followUpDate && !e.followUpDone && new Date(e.followUpDate) >= new Date(new Date().toDateString()))

  const set = k => v => setForm(f => ({ ...f, [k]: v }))
  const setE = k => e => set(k)(e.target.value)
  const setChk = k => e => set(k)(e.target.checked)

  const openNew = () => {
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 16) })
    setEditId(null)
    setShowNew(true)
  }

  const openEdit = (entry) => {
    setForm({
      type: entry.type,
      date: entry.date?.slice(0, 16) || '',
      summary: entry.summary || '',
      outcome: entry.outcome || '',
      followUpDate: entry.followUpDate || '',
      followUpNote: entry.followUpNote || '',
      internal: entry.internal || false,
    })
    setEditId(entry.id)
    setShowNew(true)
  }

  const save = () => {
    if (!form.summary.trim()) { toast('Summary required'); return }
    const entry = {
      id: editId || uid(),
      ...form,
      date: form.date || new Date().toISOString(),
      createdAt: editId ? undefined : new Date().toISOString(),
    }
    const current = job.commLog || []
    const updated = editId
      ? current.map(e => e.id === editId ? entry : e)
      : [entry, ...current]
    updateJob(jobId, { commLog: updated })
    setShowNew(false)
    toast(editId ? 'Entry updated' : 'Logged')
  }

  const del = (id) => {
    updateJob(jobId, { commLog: (job.commLog || []).filter(e => e.id !== id) })
    setShowNew(false)
    toast('Deleted')
  }

  const markFollowUpDone = (entryId) => {
    const updated = (job.commLog || []).map(e =>
      e.id === entryId ? { ...e, followUpDone: true } : e
    )
    updateJob(jobId, { commLog: updated })
    toast('Follow-up marked done')
  }

  const typeInfo = (typeId) => TYPES.find(t => t.id === typeId) || TYPES[0]

  return (
    <>
      <TopNav title="Communication log" onBack={() => navigate(`/jobs/${jobId}`)}
        actions={<button onClick={openNew} className="text-white text-xl font-light">+</button>}
      />
      <div className="px-4 pt-4">

        {/* Pending follow-ups */}
        {pendingFollowUps.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4">
            <p className="text-xs font-semibold text-amber-800 mb-2">
              Follow-ups pending ({pendingFollowUps.length})
            </p>
            {pendingFollowUps.map(e => (
              <div key={e.id} className="flex items-start justify-between gap-2 py-1.5 border-t border-amber-200">
                <div>
                  <p className="text-xs font-medium text-amber-800">
                    {fmtDShort(e.followUpDate)} — {e.followUpNote || e.summary.slice(0, 60)}
                  </p>
                </div>
                <button
                  onClick={() => markFollowUpDone(e.id)}
                  className="text-[10px] font-semibold text-emerald-700 border border-emerald-300 bg-emerald-50 rounded-md px-2 py-1 flex-shrink-0 active:scale-95">
                  Done
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            ['all', 'All', log.length],
            ['calls', 'Calls', log.filter(e => e.type.startsWith('call') || e.type === 'voicemail').length],
            ['texts', 'Texts', log.filter(e => e.type.startsWith('text')).length],
            ['notes', 'Notes', log.filter(e => e.type === 'note').length],
          ].map(([key, label, count]) => (
            <button key={key} onClick={() => setFilterType(key)}
              className={cn('rounded-xl p-2.5 text-center transition-colors border',
                filterType === key ? 'bg-navy text-white border-navy' : 'bg-gray-50 text-gray-600 border-transparent'
              )}>
              <p className={cn('font-display font-bold text-base leading-none', filterType === key ? 'text-white' : 'text-navy')}>{count}</p>
              <p className={cn('text-[10px] mt-0.5', filterType === key ? 'text-white/70' : 'text-gray-400')}>{label}</p>
            </button>
          ))}
        </div>

        {/* Log entries */}
        {filtered.length === 0 ? (
          <Empty icon="💬" title="No communication logged"
            description="Log calls, texts, emails, and site visits to build a complete customer history"
            action={<Button variant="primary" onClick={openNew}>+ Log communication</Button>}
          />
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-100" />
            <div className="space-y-0">
              {filtered.map((entry, i) => {
                const t = typeInfo(entry.type)
                const outcomeInfo = OUTCOMES.find(o => o.id === entry.outcome)
                const isOverdue = entry.followUpDate && !entry.followUpDone && new Date(entry.followUpDate) < new Date()
                return (
                  <div key={entry.id} className="flex gap-3 pb-4">
                    {/* Icon dot */}
                    <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center text-base">
                      {t.icon}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="bg-white rounded-xl border border-gray-100 p-3">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <span className="text-xs font-semibold text-gray-700">{t.label}</span>
                            {entry.internal && (
                              <span className="ml-1.5 text-[9px] font-bold bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 uppercase tracking-wide">Internal</span>
                            )}
                            {entry.outcome && outcomeInfo?.id && (
                              <span className={cn('ml-1.5 text-[9px] font-bold rounded px-1.5 py-0.5 uppercase tracking-wide',
                                entry.outcome === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                                entry.outcome === 'complaint' || entry.outcome === 'declined' ? 'bg-red-50 text-red-600' :
                                entry.outcome === 'follow_up' ? 'bg-amber-50 text-amber-700' :
                                'bg-gray-100 text-gray-500'
                              )}>
                                {outcomeInfo.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <p className="text-[10px] text-gray-400">{fmtDShort(entry.date)}</p>
                            <button onClick={() => openEdit(entry)} className="text-[10px] text-gray-400 hover:text-navy">Edit</button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{entry.summary}</p>
                        {entry.followUpDate && (
                          <div className={cn('mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2',
                            isOverdue ? 'border-red-100' : '')}>
                            <p className={cn('text-[10px] font-medium', isOverdue ? 'text-red-500' : 'text-amber-600', entry.followUpDone ? 'line-through text-gray-400' : '')}>
                              {isOverdue && !entry.followUpDone ? '⚠ Overdue — ' : ''}Follow-up {fmtDShort(entry.followUpDate)}
                              {entry.followUpNote ? `: ${entry.followUpNote}` : ''}
                            </p>
                            {!entry.followUpDone && (
                              <button onClick={() => markFollowUpDone(entry.id)}
                                className="text-[10px] font-semibold text-emerald-600 border border-emerald-200 rounded-md px-1.5 py-0.5 flex-shrink-0 active:scale-95">
                                Done
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Log entry modal */}
      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title={editId ? 'Edit entry' : 'Log communication'}
        size="lg"
        footer={
          <div className="flex gap-2">
            {editId && <Button variant="danger" onClick={() => del(editId)}>Delete</Button>}
            <Button variant="ghost" className="flex-1" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button variant="primary" className="flex-[2]" onClick={save}>Save</Button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Type grid */}
          <FormGroup label="Type">
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button key={t.id} onClick={() => set('type')(t.id)}
                  className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors text-xs',
                    form.type === t.id ? 'border-brand bg-blue-50 font-semibold text-brand' : 'border-gray-200 text-gray-600'
                  )}>
                  <span className="text-base">{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </FormGroup>

          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Date & time">
              <Input type="datetime-local" value={form.date} onChange={setE('date')} />
            </FormGroup>
            <FormGroup label="Outcome">
              <Select value={form.outcome} onChange={setE('outcome')}>
                {OUTCOMES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>
            </FormGroup>
          </div>

          <FormGroup label="Summary *" hint="What was discussed, agreed, or noted">
            <Textarea rows={4} value={form.summary} onChange={setE('summary')}
              placeholder="Called to confirm start date. Customer confirmed 8am access. Dogs will be locked up. Gate code is 1234." />
          </FormGroup>

          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Follow-up date">
              <Input type="date" value={form.followUpDate} onChange={setE('followUpDate')} />
            </FormGroup>
            <FormGroup label="Follow-up note">
              <Input value={form.followUpNote} onChange={setE('followUpNote')} placeholder="What to do" />
            </FormGroup>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.internal} onChange={setChk('internal')}
              className="rounded accent-brand" />
            <span className="text-xs text-gray-600">Internal note — not visible in customer portal</span>
          </label>
        </div>
      </Modal>
    </>
  )
}
