import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { TopNav } from '../components/layout/AppShell'
import { Card, SectionTitle, Badge, Empty, FormGroup, Input, Select, Button } from '../components/ui'
import { toast } from '../components/ui'
import { cn, fmtDShort } from '../lib/utils'

const DOC_TYPES = [
  { value: 'contract',    label: 'Contract template',       icon: '📋', desc: 'Pre-approved contract to use for new jobs' },
  { value: 'co',         label: 'Change order template',    icon: '⚠️', desc: 'Pre-approved CO language' },
  { value: 'signed',     label: 'Signed contract',          icon: '✍️', desc: 'Wet or e-signed contract for a specific job' },
  { value: 'lien_waiver',label: 'Lien waiver template',     icon: '🔒', desc: 'Custom lien waiver language' },
  { value: 'other',      label: 'Other document',           icon: '📄', desc: 'Any other document to keep on file' },
]

const MAX_FILE_MB = 10

export default function DocumentVault() {
  const navigate = useNavigate()
  const [params] = useState(() => new URLSearchParams(window.location.search))
  const { user } = useAuth()
  const { customDocuments, addCustomDocument, updateCustomDocument, deleteCustomDocument, jobs, syncToSupabase } = useStore()
  const fileRef = useRef(null)
  const [view, setView] = useState('list')
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({
    name: '',
    type: 'contract',
    jobId: params.get('jobId') || '',
    notes: '',
    attorneyApproved: false,
    attorneyName: '',
    reviewDate: new Date().toISOString().split('T')[0],
  })
  const [fileInfo, setFileInfo] = useState(null) // { name, size, data (base64) }
  const [uploading, setUploading] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast(`File too large — max ${MAX_FILE_MB}MB`, 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setFileInfo({ name: file.name, size: file.size, data: ev.target.result, mimeType: file.type })
    }
    reader.readAsDataURL(file)
  }

  const upload = async () => {
    if (!form.name.trim()) { toast('Document name is required', 'error'); return }
    if (!fileInfo) { toast('Select a file to upload', 'error'); return }
    setUploading(true)
    addCustomDocument({
      name: form.name.trim(),
      type: form.type,
      jobId: form.jobId || null,
      notes: form.notes.trim(),
      attorneyApproved: form.attorneyApproved,
      attorneyName: form.attorneyApproved ? form.attorneyName : '',
      reviewDate: form.attorneyApproved ? form.reviewDate : null,
      fileName: fileInfo.name,
      fileSize: fileInfo.size,
      fileMimeType: fileInfo.mimeType,
      fileData: fileInfo.data, // base64 stored in Supabase JSONB
    })
    if (user?.id) syncToSupabase(user.id)
    toast('Document uploaded')
    setForm({ name: '', type: 'contract', jobId: '', notes: '', attorneyApproved: false, attorneyName: '', reviewDate: new Date().toISOString().split('T')[0] })
    setFileInfo(null)
    setView('list')
    setUploading(false)
  }

  const openDoc = (doc) => {
    if (!doc.fileData) { toast('No file data', 'error'); return }
    const a = document.createElement('a')
    a.href = doc.fileData
    a.download = doc.fileName || doc.name
    a.click()
  }

  const filtered = filter === 'all'
    ? customDocuments
    : customDocuments.filter(d => d.type === filter)

  const jobName = (jobId) => jobs.find(j => j.id === jobId)?.client || ''

  return (
    <div className="page">
      <TopNav title="Document Vault" onBack={() => navigate(-1)}
        actions={
          <button onClick={() => setView(v => v === 'list' ? 'upload' : 'list')}
            className="text-white/80 text-xs font-semibold">
            {view === 'list' ? '+ Upload' : 'Cancel'}
          </button>
        }
      />

      <div className="page-content px-4 pt-4 pb-8">

        {view === 'upload' ? (
          <div className="space-y-4">
            <SectionTitle>Upload document</SectionTitle>

            <FormGroup label="Document name *">
              <Input value={form.name} onChange={set('name')} placeholder="e.g. Proline Standard Gutter Contract v2" />
            </FormGroup>

            <FormGroup label="Document type">
              <Select value={form.type} onChange={set('type')}>
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
              <p className="text-xs text-gray-400 mt-1">{DOC_TYPES.find(t => t.value === form.type)?.desc}</p>
            </FormGroup>

            {/* Link to job for signed contracts */}
            {(form.type === 'signed') && (
              <FormGroup label="Job" hint="Link this signed document to a specific job">
                <Select value={form.jobId} onChange={set('jobId')}>
                  <option value="">— Not linked to a job —</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.client} — {j.address?.split(',')[0]}</option>)}
                </Select>
              </FormGroup>
            )}

            <FormGroup label="Notes">
              <textarea value={form.notes} onChange={set('notes')}
                rows={2} placeholder="e.g. Approved by attorney John Smith on 3/1/26 for SC residential work"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-brand" />
            </FormGroup>

            {/* Attorney approval for template types */}
            {['contract','co','lien_waiver'].includes(form.type) && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.attorneyApproved}
                    onChange={e => setForm(f => ({...f, attorneyApproved: e.target.checked}))}
                    className="w-4 h-4 rounded" />
                  <div>
                    <p className="text-sm font-semibold text-navy">Attorney approved</p>
                    <p className="text-xs text-gray-400">This document has been reviewed and approved by a licensed attorney</p>
                  </div>
                </label>
                {form.attorneyApproved && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <FormGroup label="Attorney name">
                      <Input value={form.attorneyName} onChange={set('attorneyName')} placeholder="John Smith, Esq." />
                    </FormGroup>
                    <FormGroup label="Review date">
                      <Input type="date" value={form.reviewDate} onChange={set('reviewDate')} />
                    </FormGroup>
                  </div>
                )}
              </div>
            )}

            {/* File picker */}
            <div>
              <button onClick={() => fileRef.current?.click()}
                className={cn('w-full border-2 border-dashed rounded-2xl p-6 text-center transition-colors',
                  fileInfo ? 'border-brand bg-blue-50' : 'border-gray-200 hover:border-gray-300')}>
                {fileInfo ? (
                  <div>
                    <p className="text-sm font-semibold text-navy">📎 {fileInfo.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{(fileInfo.size / 1024).toFixed(0)} KB</p>
                    <p className="text-xs text-brand mt-1">Tap to change file</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl mb-2">📁</p>
                    <p className="text-sm font-semibold text-gray-700">Tap to select file</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, Word, or image · Max {MAX_FILE_MB}MB</p>
                  </div>
                )}
              </button>
              <input ref={fileRef} type="file" className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                onChange={handleFile} />
            </div>

            <Button variant="primary" className="w-full" onClick={upload} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload document'}
            </Button>
          </div>
        ) : (
          <div>
            {/* Filter tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {['all', 'contract', 'co', 'signed', 'other'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn('text-xs font-semibold px-3 py-1.5 rounded-full border flex-shrink-0 transition-colors',
                    filter === f ? 'bg-navy text-white border-navy' : 'bg-white text-gray-500 border-gray-200')}>
                  {f === 'all' ? 'All' : DOC_TYPES.find(t => t.value === f)?.label || f}
                  {f !== 'all' && ` (${customDocuments.filter(d => d.type === f).length})`}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <Empty icon="📁" title="No documents yet"
                description="Upload your attorney-approved contracts, existing templates, or signed documents." />
            ) : (
              <div className="space-y-2.5">
                {filtered.map(doc => {
                  const docType = DOC_TYPES.find(t => t.value === doc.type)
                  return (
                    <Card key={doc.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base">{docType?.icon || '📄'}</span>
                            <p className="font-semibold text-sm text-navy truncate">{doc.name}</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {docType?.label}
                            {doc.jobId && ` · ${jobName(doc.jobId)}`}
                            {' · '}{fmtDShort(doc.uploadedAt)}
                          </p>
                          {doc.attorneyApproved && (
                            <p className="text-xs text-emerald-600 mt-0.5">
                              ✓ Attorney reviewed{doc.attorneyName ? ` — ${doc.attorneyName}` : ''}
                            </p>
                          )}
                          {doc.notes && (
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{doc.notes}</p>
                          )}
                          <p className="text-xs text-gray-300 mt-0.5">{doc.fileName} · {doc.fileSize ? `${(doc.fileSize/1024).toFixed(0)} KB` : ''}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          {doc.fileData && (
                            <button onClick={() => openDoc(doc)}
                              className="text-xs font-semibold text-brand border border-brand rounded-lg px-2.5 py-1.5">
                              Open
                            </button>
                          )}
                          <button onClick={() => { deleteCustomDocument(doc.id); if (user?.id) syncToSupabase(user.id) }}
                            className="text-xs text-gray-300 hover:text-red-400 border border-gray-100 rounded-lg px-2.5 py-1.5">
                            Delete
                          </button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

            <div className="mt-6 bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
              <p className="font-semibold text-gray-700">About the Document Vault</p>
              <p>Store your attorney-approved contract templates, change order language, lien waivers, and signed documents. Documents are stored securely in your account.</p>
              <p>Template documents (contracts, COs) marked as attorney-approved can be referenced when creating new contracts. Signed documents create a permanent record.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
