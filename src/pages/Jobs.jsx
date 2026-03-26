import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store'
import { fmtM, fmtDShort, cn } from '../lib/utils'
import { getStageInfo, KANBAN_COLUMNS, getKanbanColumn } from '../lib/lifecycle'
import { TopNav } from '../components/layout/AppShell'
import { Button, Empty, Modal, FormGroup, Input, Select, Textarea } from '../components/ui'
import { toast } from '../components/ui'

export default function Jobs() {
  const navigate = useNavigate()
  const location = useLocation()
  const { jobs, settings, addJob, updateJob } = useStore()
  const [view, setView] = useState('list') // list | kanban
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(!!location.state?.openNew)
  const [form, setForm] = useState({ client:'', address:'', phone:'', email:'', type:'', state:'SC', notes:'' })

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}))

  const handleAdd = () => {
    if (!form.client) { toast('Client name required'); return }
    const job = addJob({ ...form, contractValue: 0, kbStatus: 'new_lead' })
    setShowNew(false)
    setForm({ client:'', address:'', phone:'', email:'', type:'', state:'SC', notes:'' })
    navigate(`/jobs/${job.id}`)
  }

  const searchedJobs = jobs.filter(j =>
    !search ||
    j.client?.toLowerCase().includes(search.toLowerCase()) ||
    j.address?.toLowerCase().includes(search.toLowerCase()) ||
    j.type?.toLowerCase().includes(search.toLowerCase())
  )

  const moveJob = (jobId, newStage) => {
    updateJob(jobId, { kbStatus: newStage })
    toast(`Moved to ${getStageInfo(newStage).label}`)
  }

  return (
    <>
      <TopNav title="Jobs"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setView(v => v === 'list' ? 'kanban' : 'list')}
              className="text-white/70 hover:text-white text-xs font-medium border border-white/20 rounded-md px-2 py-1 transition-colors">
              {view === 'list' ? '⊞ Board' : '≡ List'}
            </button>
            <button onClick={() => setShowNew(true)} className="text-white text-xl font-light leading-none">+</button>
          </div>
        }
      />

      {view === 'list' ? (
        <ListView jobs={searchedJobs} search={search} setSearch={setSearch} navigate={navigate} setShowNew={setShowNew} />
      ) : (
        <KanbanView jobs={searchedJobs} navigate={navigate} moveJob={moveJob} />
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New job"
        footer={<div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setShowNew(false)}>Cancel</Button><Button variant="primary" className="flex-1" onClick={handleAdd}>Create job</Button></div>}
      >
        <div className="space-y-3">
          <FormGroup label="Client name *"><Input placeholder="John Smith" value={form.client} onChange={set('client')} autoFocus /></FormGroup>
          <FormGroup label="Job address"><Input placeholder="123 Main St, Greenville SC" value={form.address} onChange={set('address')} /></FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Phone"><Input type="tel" value={form.phone} onChange={set('phone')} /></FormGroup>
            <FormGroup label="Email"><Input type="email" value={form.email} onChange={set('email')} /></FormGroup>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Work type">
              <Select value={form.type} onChange={set('type')}>
                <option value="">Select…</option>
                {(settings.jobTypes||[]).map(jt => <option key={jt.id} value={jt.name}>{jt.name}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="State">
              <Select value={form.state} onChange={set('state')}>
                {['SC','NC','GA','TN','VA'].map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormGroup>
          </div>
          <FormGroup label="Notes"><Textarea rows={2} value={form.notes} onChange={set('notes')} placeholder="Scope, site conditions…" /></FormGroup>
        </div>
      </Modal>
    </>
  )
}

// ── List View ─────────────────────────────────────────────────────
function ListView({ jobs, search, setSearch, navigate, setShowNew }) {
  const [filter, setFilter] = useState('all')
  const getPhase = j => getStageInfo(j.kbStatus)?.phase || 'presale'

  const FILTER_PHASES = {
    presale:   ['presale'],
    contract:  ['contract'],
    materials: ['materials'],
    active:    ['execution'],
    close:     ['close'],
    other:     ['other'],
  }

  const filtered = jobs.filter(j => {
    if (filter === 'all') return true
    return FILTER_PHASES[filter]?.includes(getPhase(j))
  })

  const counts = Object.fromEntries(
    ['all',...Object.keys(FILTER_PHASES)].map(k => [k, k === 'all' ? jobs.length : jobs.filter(j => FILTER_PHASES[k]?.includes(getPhase(j))).length])
  )

  const FILTERS = [
    { key: 'all',       label: `All (${counts.all})` },
    { key: 'presale',   label: `Pre-sale (${counts.presale})` },
    { key: 'contract',  label: `Contract (${counts.contract})` },
    { key: 'materials', label: `Materials (${counts.materials})` },
    { key: 'active',    label: `In progress (${counts.active})` },
    { key: 'close',     label: `Closing (${counts.close})` },
  ].filter(f => f.key === 'all' || counts[f.key] > 0)

  return (
    <div className="px-4 pt-4">
      <input className="form-input mb-3" placeholder="Search jobs, addresses, types…" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 border transition-colors',
              filter === f.key ? 'bg-navy text-white border-navy' : 'bg-white text-gray-500 border-gray-200'
            )}>{f.label}</button>
        ))}
      </div>
      {filtered.length === 0
        ? <Empty icon="🔨" title={filter === 'all' ? 'No jobs yet' : 'No jobs in this stage'}
            action={filter === 'all' ? <Button variant="primary" onClick={() => setShowNew(true)}>+ New job</Button> : null} />
        : <div className="space-y-2.5">
            {filtered.map(job => {
              const stage = getStageInfo(job.kbStatus)
              return (
                <button key={job.id} onClick={() => navigate(`/jobs/${job.id}`)} className="w-full text-left card active:scale-[0.99] transition-transform">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy text-sm">{job.client}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {job.type}{job.address ? ` · ${job.address.split(',')[0]}` : ''}
                      </p>
                      {job.startDate && <p className="text-xs text-gray-400 mt-0.5">Started {fmtDShort(job.startDate)}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-navy text-sm">{job.contractValue ? fmtM(job.contractValue) : '—'}</p>
                      <span className={cn('badge mt-1 text-xs', stage.badge || 'badge-gray')}>{stage.label}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
      }
    </div>
  )
}

// ── Kanban Board ──────────────────────────────────────────────────
function KanbanView({ jobs, navigate, moveJob }) {
  const [dragging, setDragging] = useState(null) // job id being moved
  const [showMove, setShowMove] = useState(null) // { jobId, currentStage }

  const jobsByColumn = KANBAN_COLUMNS.map(col => ({
    ...col,
    jobs: jobs.filter(j => {
      const mapped = j.kbStatus
      return col.stages.includes(mapped) || col.stages.includes(
        ({ 'New Lead':'new_lead','Estimate':'estimate_pending','Pending Contract':'contract_pending','Active':'in_progress','In Progress':'in_progress','Invoiced':'final_invoice','Complete':'paid','On Hold':'on_hold' })[mapped] || mapped
      )
    })
  })).filter(col => col.id !== 'other' || col.jobs.length > 0)

  const totalJobs = jobs.length

  return (
    <div>
      {/* Column count summary */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <p className="text-xs text-gray-400 font-medium">{totalJobs} jobs</p>
        {showMove && <p className="text-xs text-brand">Tap a column to move</p>}
      </div>

      {/* Horizontal scroll kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 px-4" style={{ width: `${jobsByColumn.length * 180 + 32}px` }}>
          {jobsByColumn.map(col => (
            <div key={col.id}
              onClick={() => showMove && (moveJob(showMove.jobId, col.stages[0]), setShowMove(null))}
              className={cn(
                'flex-shrink-0 w-44 rounded-2xl border transition-colors',
                showMove ? 'cursor-pointer' : '',
                showMove?.currentStage && col.stages.includes(showMove.currentStage)
                  ? 'border-brand bg-blue-50'
                  : showMove ? 'border-dashed border-gray-300 bg-gray-50' : 'border-gray-100 bg-gray-50/80'
              )}
            >
              {/* Column header */}
              <div className="px-3 pt-3 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{col.label}</span>
                  {col.jobs.length > 0 && (
                    <span className="text-xs font-bold text-white rounded-full w-5 h-5 flex items-center justify-center"
                      style={{ background: col.color }}>
                      {col.jobs.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Cards */}
              <div className="px-2 pb-3 space-y-2 min-h-[80px]">
                {col.jobs.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-300">Empty</div>
                ) : col.jobs.map(job => {
                  const stage = getStageInfo(job.kbStatus)
                  const isBeingMoved = showMove?.jobId === job.id
                  return (
                    <div key={job.id}
                      className={cn(
                        'bg-white rounded-xl border p-2.5 cursor-pointer transition-all',
                        isBeingMoved ? 'border-brand shadow-sm scale-[0.98]' : 'border-gray-100 active:scale-[0.98]'
                      )}
                    >
                      <p className="font-semibold text-navy text-xs leading-tight mb-1">{job.client}</p>
                      {job.type && <p className="text-[10px] text-gray-400 mb-1.5 leading-tight">{job.type}</p>}
                      {job.contractValue > 0 && <p className="text-[10px] font-semibold text-gray-600">{fmtM(job.contractValue)}</p>}
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/jobs/${job.id}`) }}
                          className="text-[10px] text-brand font-medium">
                          Open →
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setShowMove(isBeingMoved ? null : { jobId: job.id, currentStage: job.kbStatus }) }}
                          className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md transition-colors', isBeingMoved ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500')}>
                          {isBeingMoved ? 'Cancel' : 'Move'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showMove && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center px-4 z-40">
          <div className="bg-navy text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg">
            Tap a column to move this job there
          </div>
        </div>
      )}
    </div>
  )
}
