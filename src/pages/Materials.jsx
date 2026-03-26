import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { fmtM, fmtDShort, cn, uid } from '../lib/utils'
import { TopNav } from '../components/layout/AppShell'
import { Button, Card, Modal, FormGroup, Input, Select, Textarea, Empty, Badge } from '../components/ui'
import { toast } from '../components/ui'

const UNITS = ['LF', 'SF', 'EA', 'LB', 'GAL', 'BOX', 'SQ', 'CY', 'BDL', 'PC', 'HR', 'LS']
const STATUSES = [
  { id: 'needed',    label: 'Needed',    badge: 'badge-gray'  },
  { id: 'ordered',   label: 'Ordered',   badge: 'badge-amber' },
  { id: 'delivered', label: 'Delivered', badge: 'badge-green' },
  { id: 'on_site',   label: 'On site',   badge: 'badge-green' },
]

const EMPTY_FORM = { name:'', qty:'', unit:'EA', costPerUnit:'', supplier:'', storageLocation:'', status:'needed', notes:'', orderedDate:'', deliveredDate:'' }

export default function Materials() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { jobs, updateJob } = useStore()
  const job = jobs.find(j => j.id === jobId)
  const [showNew, setShowNew] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterStatus, setFilterStatus] = useState('all')

  if (!job) return <div className="p-8 text-center text-gray-400">Job not found</div>

  const materials = job.materials || []
  const filtered = filterStatus === 'all' ? materials : materials.filter(m => m.status === filterStatus)

  const totalCost = materials.reduce((s, m) => s + ((m.qty||0) * (m.costPerUnit||0)), 0)
  const orderedCount = materials.filter(m => m.status !== 'needed').length
  const deliveredCount = materials.filter(m => m.status === 'delivered' || m.status === 'on_site').length

  const openNew = () => { setForm(EMPTY_FORM); setEditId(null); setShowNew(true) }
  const openEdit = (mat) => {
    setForm({ name: mat.name, qty: String(mat.qty||''), unit: mat.unit||'EA', costPerUnit: String(mat.costPerUnit||''), supplier: mat.supplier||'', storageLocation: mat.storageLocation||'', status: mat.status||'needed', notes: mat.notes||'', orderedDate: mat.orderedDate||'', deliveredDate: mat.deliveredDate||'' })
    setEditId(mat.id)
    setShowNew(true)
  }

  const saveMaterial = () => {
    if (!form.name) { toast('Name required'); return }
    const item = {
      id: editId || uid(),
      name: form.name,
      qty: parseFloat(form.qty) || 0,
      unit: form.unit,
      costPerUnit: parseFloat(form.costPerUnit) || 0,
      totalCost: (parseFloat(form.qty)||0) * (parseFloat(form.costPerUnit)||0),
      supplier: form.supplier,
      storageLocation: form.storageLocation, // INTERNAL ONLY - not sent to customer portal
      status: form.status,
      notes: form.notes,
      orderedDate: form.orderedDate || null,
      deliveredDate: form.deliveredDate || null,
      updatedAt: new Date().toISOString(),
    }
    if (editId) {
      updateJob(jobId, { materials: materials.map(m => m.id === editId ? item : m) })
    } else {
      updateJob(jobId, { materials: [...materials, { ...item, createdAt: new Date().toISOString() }] })
    }
    setShowNew(false)
    setEditId(null)
    toast(editId ? 'Material updated' : 'Material added')

    // Auto-advance job stage if all ordered or all delivered
    const updated = editId ? materials.map(m => m.id === editId ? item : m) : [...materials, item]
    if (updated.length > 0 && updated.every(m => m.status !== 'needed')) {
      if (updated.every(m => m.status === 'delivered' || m.status === 'on_site')) {
        if (!['in_progress','scheduled','punch_list'].includes(job.kbStatus)) {
          updateJob(jobId, { kbStatus: 'materials_ready' })
        }
      } else if (job.kbStatus === 'deposit_received') {
        updateJob(jobId, { kbStatus: 'materials_ordered' })
      }
    }
  }

  const deleteMaterial = (id) => {
    updateJob(jobId, { materials: materials.filter(m => m.id !== id) })
    setShowNew(false)
    toast('Removed')
  }

  const quickStatus = (matId, newStatus) => {
    const updated = materials.map(m => m.id === matId ? {
      ...m, status: newStatus,
      ...(newStatus === 'ordered' && !m.orderedDate ? { orderedDate: new Date().toISOString().split('T')[0] } : {}),
      ...(newStatus === 'delivered' && !m.deliveredDate ? { deliveredDate: new Date().toISOString().split('T')[0] } : {}),
      ...(newStatus === 'on_site' && !m.deliveredDate ? { deliveredDate: new Date().toISOString().split('T')[0] } : {}),
    } : m)
    updateJob(jobId, { materials: updated })
    toast(`Marked ${newStatus}`)
  }

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}))

  return (
    <>
      <TopNav title="Materials" onBack={() => navigate(`/jobs/${jobId}`)}
        actions={<button onClick={openNew} className="text-white text-xl font-light">+</button>}
      />
      <div className="px-4 pt-4">
        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-400 mb-1">Items</p><p className="font-display font-bold text-navy text-lg">{materials.length}</p></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-400 mb-1">Delivered</p><p className="font-display font-bold text-navy text-lg">{deliveredCount}/{materials.length}</p></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-400 mb-1">Est. cost</p><p className="font-display font-bold text-navy text-lg">{fmtM(totalCost)}</p></div>
        </div>

        {/* Storage locations summary — internal only */}
        {materials.some(m => m.storageLocation) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-xs font-semibold text-amber-800 mb-2">Storage locations (internal)</p>
            {[...new Set(materials.filter(m => m.storageLocation).map(m => m.storageLocation))].map(loc => {
              const items = materials.filter(m => m.storageLocation === loc)
              return (
                <div key={loc} className="text-xs text-amber-700 mb-1">
                  <span className="font-medium">{loc}:</span> {items.map(m => m.name).join(', ')}
                </div>
              )
            })}
          </div>
        )}

        {/* Status filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[['all','All'], ...STATUSES.map(s => [s.id, s.label])].map(([v,l]) => (
            <button key={v} onClick={() => setFilterStatus(v)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border flex-shrink-0 transition-colors', filterStatus===v?'bg-navy text-white border-navy':'bg-white text-gray-500 border-gray-200')}>
              {l}
            </button>
          ))}
        </div>

        {filtered.length === 0
          ? <Empty icon="📦" title="No materials" description="Add materials from your estimate or manually" action={<Button variant="primary" onClick={openNew}>+ Add material</Button>} />
          : <div className="space-y-2.5">
              {filtered.map(mat => {
                const statusInfo = STATUSES.find(s => s.id === mat.status) || STATUSES[0]
                const itemCost = (mat.qty||0) * (mat.costPerUnit||0)
                return (
                  <Card key={mat.id}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-navy leading-tight">{mat.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {mat.qty} {mat.unit}{mat.supplier ? ` · ${mat.supplier}` : ''}
                        </p>
                        {mat.costPerUnit > 0 && <p className="text-xs text-gray-400">{fmtM(itemCost)} ({mat.qty} × {fmtM(mat.costPerUnit)})</p>}
                        {mat.orderedDate && <p className="text-xs text-amber-600 mt-0.5">Ordered {fmtDShort(mat.orderedDate)}</p>}
                        {mat.deliveredDate && <p className="text-xs text-emerald-600 mt-0.5">Delivered {fmtDShort(mat.deliveredDate)}</p>}
                        {mat.storageLocation && (
                          <p className="text-xs text-amber-700 font-medium mt-0.5">📍 {mat.storageLocation}</p>
                        )}
                        {mat.notes && <p className="text-xs text-gray-400 mt-1 italic">{mat.notes}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={cn('badge text-xs', statusInfo.badge)}>{statusInfo.label}</span>
                        <button onClick={() => openEdit(mat)} className="text-xs text-gray-400 hover:text-navy">Edit</button>
                      </div>
                    </div>
                    {/* Quick status buttons */}
                    <div className="flex gap-1.5 pt-2 border-t border-gray-100">
                      {STATUSES.filter(s => s.id !== mat.status).map(s => (
                        <button key={s.id} onClick={() => quickStatus(mat.id, s.id)}
                          className="text-[10px] font-semibold px-2 py-1 rounded-md bg-gray-100 text-gray-600 active:bg-gray-200 transition-colors">
                          Mark {s.label}
                        </button>
                      ))}
                    </div>
                  </Card>
                )
              })}
            </div>
        }
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title={editId ? 'Edit material' : 'Add material'}
        footer={
          <div className="flex gap-2">
            {editId && <Button variant="danger" onClick={() => deleteMaterial(editId)}>Delete</Button>}
            <Button variant="ghost" className="flex-1" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button variant="primary" className="flex-[2]" onClick={saveMaterial}>Save</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <FormGroup label="Material name *"><Input value={form.name} onChange={set('name')} placeholder="6-inch aluminum gutter - Musket Brown" /></FormGroup>
          <div className="grid grid-cols-3 gap-2">
            <FormGroup label="Qty"><Input type="number" value={form.qty} onChange={set('qty')} placeholder="0" /></FormGroup>
            <FormGroup label="Unit"><Select value={form.unit} onChange={set('unit')}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</Select></FormGroup>
            <FormGroup label="Cost/unit"><Input type="number" value={form.costPerUnit} onChange={set('costPerUnit')} placeholder="0.00" /></FormGroup>
          </div>
          <FormGroup label="Supplier / source"><Input value={form.supplier} onChange={set('supplier')} placeholder="ABC Supply, Home Depot…" /></FormGroup>
          <FormGroup label="Storage location" hint="Internal only — never shown to customer">
            <Input value={form.storageLocation} onChange={set('storageLocation')} placeholder="Warehouse bay 3, job site garage, truck…" />
          </FormGroup>
          <FormGroup label="Status">
            <Select value={form.status} onChange={set('status')}>
              {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Order date"><Input type="date" value={form.orderedDate} onChange={set('orderedDate')} /></FormGroup>
            <FormGroup label="Delivery/pickup date"><Input type="date" value={form.deliveredDate} onChange={set('deliveredDate')} /></FormGroup>
          </div>
          <FormGroup label="Notes"><Textarea rows={2} value={form.notes} onChange={set('notes')} placeholder="Color, grade, special notes…" /></FormGroup>
        </div>
      </Modal>
    </>
  )
}
