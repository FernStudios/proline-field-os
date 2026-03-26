import { useState } from 'react'
import { useStore } from '../store'
import { fmtM, fmtDShort, cn, uid } from '../lib/utils'
import { TopNav } from '../components/layout/AppShell'
import { Button, Card, Modal, FormGroup, Input, Select, Empty, SectionTitle } from '../components/ui'
import { toast } from '../components/ui'

export default function Payroll() {
  const [params] = useState(() => new URLSearchParams(window.location.search))
  const { crew, payrollRuns, settings, addCrew, updateCrew, deleteCrew, addPayrollRun } = useStore()
  const [tab, setTab] = useState(new URLSearchParams(window.location.search).get('clockin') ? 'crew' : 'run')
  const [showCrew, setShowCrew] = useState(null) // null | 'new' | crew id
  const [showRun, setShowRun] = useState(false)
  const [crewForm, setCrewForm] = useState({ name: '', role: 'crew', payType: 'daily', rate: '', phone: '' })
  const [runForm, setRunForm] = useState({ weekEnding: new Date().toISOString().split('T')[0], notes: '' })
  const [hours, setHours] = useState({}) // crewId -> hours

  const setCF = k => e => setCrewForm(f => ({...f, [k]: e.target.value}))

  const s = settings.adminSettings || {}
  const totalPayrollRuns = payrollRuns.length

  const openCrew = (member) => {
    if (member === 'new') {
      setCrewForm({ name: '', role: 'crew', payType: 'daily', rate: '', phone: '' })
    } else {
      setCrewForm({ name: member.name, role: member.role, payType: member.payType||'daily', rate: String(member.rate||''), phone: member.phone||'' })
    }
    setShowCrew(member === 'new' ? 'new' : member.id)
  }

  const saveCrew = () => {
    if (!crewForm.name) { toast('Name required'); return }
    const data = { ...crewForm, rate: parseFloat(crewForm.rate)||0 }
    if (showCrew === 'new') {
      addCrew({ ...data, id: uid() })
      toast('Crew member added')
    } else {
      updateCrew(showCrew, data)
      toast('Updated')
    }
    setShowCrew(null)
  }

  const runPayroll = () => {
    if (crew.length === 0) { toast('Add crew members first'); return }
    const crewPay = crew.map(c => {
      const h = parseFloat(hours[c.id]||0)
      const pay = c.payType === 'daily' ? c.rate * Math.ceil(h/8) : c.rate * h
      return { crewId: c.id, name: c.name, hours: h, pay: Math.round(pay*100)/100 }
    }).filter(c => c.pay > 0)
    const totalCrew = crewPay.reduce((s,c) => s+c.pay, 0)
    const newRun = { id: uid(), weekEnding: runForm.weekEnding, notes: runForm.notes, crewPay, totalCrew, date: new Date().toISOString() }
    addPayrollRun(newRun)
    setShowRun(false)
    setHours({})
    toast(`Payroll run saved — ${fmtM(totalCrew)} crew pay`)
  }

  return (
    <>
      <TopNav title="Payroll" />
      <div className="flex border-b border-gray-100 bg-white sticky top-[58px] z-10">
        {[['run','Pay Runs'],['crew','Crew Roster']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} className={cn('flex-1 py-3 text-xs font-semibold border-b-2 transition-colors', tab===v?'border-brand text-brand':'border-transparent text-gray-400')}>{l}</button>
        ))}
      </div>
      <div className="px-4 pt-4">
        {tab === 'run' && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-1">Pay runs</p><p className="font-display font-bold text-navy text-lg">{totalPayrollRuns}</p></div>
              <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-1">Crew</p><p className="font-display font-bold text-navy text-lg">{crew.length}</p></div>
            </div>
            <Button variant="primary" className="w-full mb-4" onClick={() => setShowRun(true)}>Run payroll</Button>
            {payrollRuns.length === 0
              ? <Empty icon="👷" title="No payroll runs" description="Record crew pay for each week" />
              : <div className="space-y-2.5">
                  {[...payrollRuns].reverse().map(run => (
                    <Card key={run.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm text-navy">Week ending {fmtDShort(run.weekEnding)}</p>
                          <p className="text-xs text-gray-400">{run.crewPay.length} crew members</p>
                        </div>
                        <p className="font-bold text-navy">{fmtM(run.totalCrew)}</p>
                      </div>
                      <div className="space-y-1 pt-2 border-t border-gray-100">
                        {run.crewPay.map(cp => (
                          <div key={cp.crewId} className="flex justify-between text-xs">
                            <span className="text-gray-600">{cp.name} ({cp.hours}h)</span>
                            <span className="font-semibold text-navy">{fmtM(cp.pay)}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
            }
          </>
        )}

        {tab === 'crew' && (
          <>
            <Button variant="primary" className="w-full mb-4" onClick={() => openCrew('new')}>+ Add crew member</Button>
            {crew.length === 0
              ? <Empty icon="👥" title="No crew members" description="Add your team to run payroll" />
              : <div className="space-y-2.5">
                  {crew.map(member => (
                    <Card key={member.id} onClick={() => openCrew(member)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {(member.name||'?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-navy">{member.name}</p>
                            <p className="text-xs text-gray-400 capitalize">{member.role} · {member.payType === 'daily' ? `$${member.rate}/day` : `$${member.rate}/hr`}</p>
                          </div>
                        </div>
                        <span className={cn('badge text-xs', member.role==='foreman'?'badge-blue':'badge-gray')}>{member.role}</span>
                      </div>
                    </Card>
                  ))}
                </div>
            }
          </>
        )}
      </div>

      {/* Crew modal */}
      <Modal open={!!showCrew} onClose={() => setShowCrew(null)} title={showCrew === 'new' ? 'Add crew member' : 'Edit crew member'}
        footer={
          <div className="flex gap-2">
            {showCrew !== 'new' && <Button variant="danger" onClick={() => { deleteCrew(showCrew); setShowCrew(null); toast('Removed') }}>Remove</Button>}
            <Button variant="ghost" className="flex-1" onClick={() => setShowCrew(null)}>Cancel</Button>
            <Button variant="primary" className="flex-[2]" onClick={saveCrew}>Save</Button>
          </div>
        }>
        <div className="space-y-3">
          <FormGroup label="Name *"><Input value={crewForm.name} onChange={setCF('name')} placeholder="Mike Torres" /></FormGroup>
          <FormGroup label="Phone"><Input type="tel" value={crewForm.phone} onChange={setCF('phone')} /></FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Role"><Select value={crewForm.role} onChange={setCF('role')}><option value="crew">Crew</option><option value="foreman">Foreman</option></Select></FormGroup>
            <FormGroup label="Pay type"><Select value={crewForm.payType} onChange={setCF('payType')}><option value="daily">Daily rate</option><option value="hourly">Hourly</option></Select></FormGroup>
          </div>
          <FormGroup label={crewForm.payType === 'daily' ? 'Daily rate ($)' : 'Hourly rate ($)'}><Input type="number" value={crewForm.rate} onChange={setCF('rate')} placeholder="0.00" /></FormGroup>
        </div>
      </Modal>

      {/* Run payroll modal */}
      <Modal open={showRun} onClose={() => setShowRun(false)} title="Run payroll"
        footer={<div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setShowRun(false)}>Cancel</Button><Button variant="primary" className="flex-[2]" onClick={runPayroll}>Save run</Button></div>}>
        <div className="space-y-4">
          <FormGroup label="Week ending"><Input type="date" value={runForm.weekEnding} onChange={e => setRunForm(f=>({...f,weekEnding:e.target.value}))} /></FormGroup>
          <div>
            <p className="form-label mb-2">Hours worked</p>
            {crew.map(c => (
              <div key={c.id} className="flex items-center gap-3 mb-2">
                <span className="text-sm text-navy w-32 flex-shrink-0 truncate">{c.name}</span>
                <Input type="number" value={hours[c.id]||''} onChange={e => setHours(h=>({...h,[c.id]:e.target.value}))} placeholder="0" className="w-20" />
                <span className="text-xs text-gray-400">hrs{c.payType==='daily'?` (${Math.ceil((parseFloat(hours[c.id])||0)/8)} days)`:''}</span>
                {hours[c.id] && <span className="text-xs font-semibold text-navy ml-auto">{fmtM(c.payType==='daily'?c.rate*Math.ceil((parseFloat(hours[c.id])||0)/8):c.rate*(parseFloat(hours[c.id])||0))}</span>}
              </div>
            ))}
          </div>
          <FormGroup label="Notes"><Input value={runForm.notes} onChange={e => setRunForm(f=>({...f,notes:e.target.value}))} placeholder="Optional notes" /></FormGroup>
        </div>
      </Modal>
    </>
  )
}
