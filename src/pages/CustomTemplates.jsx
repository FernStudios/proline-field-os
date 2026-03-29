import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { TopNav } from '../components/layout/AppShell'
import { Card, SectionTitle, Badge, Empty, FormGroup, Input, Select, Button } from '../components/ui'
import { toast } from '../components/ui'
import { cn } from '../lib/utils'
import { MERGE_FIELDS, MERGE_GROUPS, buildMergeValues, applyMergeFields } from '../lib/mergeFields'

const TPL_TYPES = [
  { value: 'contract',     label: 'Contract',         icon: '📋' },
  { value: 'co_customer',  label: 'Change Order (CO-02 Customer)', icon: '⚠️' },
  { value: 'co_required',  label: 'Change Order (CO-03 Required)', icon: '🛑' },
  { value: 'estimate',     label: 'Estimate',          icon: '💰' },
  { value: 'lien_waiver',  label: 'Lien Waiver',       icon: '🔒' },
  { value: 'other',        label: 'Other document',    icon: '📄' },
]

const MAX_MB = 10

export default function CustomTemplates() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { customDocuments, addCustomDocument, deleteCustomDocument, settings, jobs, syncToSupabase } = useStore()
  const fileRef = useRef(null)
  const [view, setView] = useState('list')
  const [activeTab, setActiveTab] = useState('upload') // upload | fields
  const [form, setForm] = useState({ name: '', type: 'contract', notes: '', attorneyApproved: false, attorneyName: '', reviewDate: new Date().toISOString().split('T')[0] })
  const [fileInfo, setFileInfo] = useState(null)
  const [previewJob, setPreviewJob] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [uploading, setUploading] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const templates = customDocuments.filter(d => ['contract','co_customer','co_required','estimate','lien_waiver'].includes(d.type) || d.fileData?.includes('text'))

  const handleFile = e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_MB * 1024 * 1024) { toast(`Max ${MAX_MB}MB`, 'error'); return }
    const reader = new FileReader()
    reader.onload = ev => setFileInfo({ name: file.name, size: file.size, data: ev.target.result, mimeType: file.type })
    reader.readAsDataURL(file)
  }

  const upload = async () => {
    if (!form.name.trim()) { toast('Name required', 'error'); return }
    if (!fileInfo) { toast('Select a file', 'error'); return }
    setUploading(true)
    addCustomDocument({
      name: form.name.trim(), type: form.type, notes: form.notes.trim(),
      attorneyApproved: form.attorneyApproved,
      attorneyName: form.attorneyApproved ? form.attorneyName : '',
      reviewDate: form.attorneyApproved ? form.reviewDate : null,
      fileName: fileInfo.name, fileSize: fileInfo.size, fileMimeType: fileInfo.mimeType,
      fileData: fileInfo.data, isTemplate: true,
    })
    if (user?.id) syncToSupabase(user.id)
    toast('Template uploaded')
    setForm({ name: '', type: 'contract', notes: '', attorneyApproved: false, attorneyName: '', reviewDate: new Date().toISOString().split('T')[0] })
    setFileInfo(null)
    setView('list')
    setUploading(false)
  }

  const previewMerge = (doc) => {
    const job = jobs.find(j => j.id === previewJob) || jobs[0]
    if (!job) { toast('Create a job first to preview merge', 'error'); return }
    const values = buildMergeValues(job, null, settings)
    const decoded = atob(doc.fileData?.split(',')[1] || '')
    setPreviewText(applyMergeFields(decoded, values))
  }

  const typeLabel = t => TPL_TYPES.find(x => x.value === t)?.label || t

  return (
    <div className="flex flex-col h-full min-h-0">
      <TopNav title="Contract Templates" onBack={() => navigate('/admin?tab=Contracts')}
        actions={
          <button onClick={() => setView(v => v === 'list' ? 'upload' : 'list')}
            className="text-xs font-bold text-white bg-brand rounded-lg px-3 py-1.5">
            {view === 'list' ? '+ Upload' : 'Cancel'}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">

        {view === 'upload' ? (
          <div>
            {/* Tab switcher */}
            <div className="flex border-b border-gray-200 mb-4">
              {[['upload','Upload template'],['fields','Merge fields reference']].map(([id,label]) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={cn('px-4 py-2 text-xs font-semibold border-b-2 transition-colors',
                    activeTab === id ? 'border-brand text-brand' : 'border-transparent text-gray-400')}>
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'upload' ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-800 mb-1">How to use merge fields</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    In your Word document or text template, use <code className="bg-blue-100 px-1 rounded">{'{{field_name}}'}</code> placeholders.
                    When you use the template for a job, these are automatically replaced with the actual job data.
                    Switch to the "Merge fields reference" tab to see all available fields.
                  </p>
                </div>

                <FormGroup label="Template name *">
                  <Input value={form.name} onChange={set('name')} placeholder="e.g. Proline Standard Gutter Contract v2" />
                </FormGroup>

                <FormGroup label="Document type">
                  <Select value={form.type} onChange={set('type')}>
                    {TPL_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </Select>
                </FormGroup>

                <FormGroup label="Notes">
                  <textarea value={form.notes} onChange={set('notes')} rows={2}
                    placeholder="e.g. Attorney-approved March 2026, SC residential use"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-brand" />
                </FormGroup>

                {/* Attorney approval */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.attorneyApproved}
                      onChange={e => setForm(f => ({...f, attorneyApproved: e.target.checked}))}
                      className="w-4 h-4 rounded" />
                    <div>
                      <p className="text-sm font-semibold text-navy">Attorney approved</p>
                      <p className="text-xs text-gray-400">This template has been reviewed and approved by a licensed attorney</p>
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

                {/* File picker */}
                <button onClick={() => fileRef.current?.click()}
                  className={cn('w-full border-2 border-dashed rounded-2xl p-6 text-center transition-colors',
                    fileInfo ? 'border-brand bg-blue-50' : 'border-gray-200 hover:border-gray-300')}>
                  {fileInfo ? (
                    <div>
                      <p className="text-sm font-semibold text-navy">📎 {fileInfo.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{(fileInfo.size / 1024).toFixed(0)} KB</p>
                      <p className="text-xs text-brand mt-1">Tap to change</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl mb-2">📄</p>
                      <p className="text-sm font-semibold text-gray-700">Tap to select file</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, Word (.docx), or plain text · Max {MAX_MB}MB</p>
                    </div>
                  )}
                </button>
                <input ref={fileRef} type="file" className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFile} />

                <Button variant="primary" className="w-full" onClick={upload} disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Save template'}
                </Button>
              </div>
            ) : (
              /* Merge fields reference */
              <div className="space-y-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Copy these field codes exactly — including the double curly braces — into your Word document or text template.
                  They are case-sensitive.
                </p>
                {MERGE_GROUPS.map(group => (
                  <div key={group}>
                    <SectionTitle className="mb-2">{group}</SectionTitle>
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      {MERGE_FIELDS.filter(f => f.group === group).map((f, i) => (
                        <div key={f.field} className={cn('flex items-start gap-3 px-4 py-3', i > 0 && 'border-t border-gray-50')}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-xs font-mono bg-gray-100 text-brand px-1.5 py-0.5 rounded">{f.field}</code>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{f.label}</p>
                            <p className="text-xs text-gray-300 mt-0.5">e.g. {f.example}</p>
                          </div>
                          <button
                            onClick={() => { navigator.clipboard?.writeText(f.field); toast(`Copied ${f.field}`) }}
                            className="text-xs text-gray-400 border border-gray-200 rounded px-2 py-1 flex-shrink-0 hover:border-gray-300">
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Template list */
          <div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Upload your attorney-approved contract templates here. When creating a contract for a job,
              you can select a custom template and the system fills in the merge fields automatically.
            </p>

            {templates.length === 0 ? (
              <Empty icon="📋" title="No templates yet"
                description="Upload your Word document with merge fields like {{customer_name}} and {{contract_value}}." />
            ) : (
              <div className="space-y-3">
                {templates.map(doc => {
                  const tType = TPL_TYPES.find(t => t.value === doc.type)
                  return (
                    <Card key={doc.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{tType?.icon || '📄'}</span>
                            <p className="font-semibold text-sm text-navy">{doc.name}</p>
                            {doc.attorneyApproved && (
                              <Badge variant="green">✓ Attorney approved</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {typeLabel(doc.type)} · {doc.fileName}
                            {doc.attorneyName ? ` · ${doc.attorneyName}` : ''}
                          </p>
                          {doc.notes && (
                            <p className="text-xs text-gray-500 mt-1">{doc.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          {doc.fileData && (
                            <button
                              onClick={() => { const a = document.createElement('a'); a.href = doc.fileData; a.download = doc.fileName || doc.name; a.click() }}
                              className="text-xs font-semibold text-brand border border-brand rounded-lg px-2.5 py-1.5">
                              Download
                            </button>
                          )}
                          <button
                            onClick={() => { deleteCustomDocument(doc.id); if (user?.id) syncToSupabase(user.id) }}
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

            {/* Merge field preview */}
            {templates.length > 0 && jobs.length > 0 && (
              <div className="mt-6 bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-700">Preview merge fields</p>
                <Select value={previewJob} onChange={e => setPreviewJob(e.target.value)}>
                  <option value="">Select a job to preview</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.client}</option>)}
                </Select>
                {previewJob && (
                  <div className="bg-white border border-gray-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Merge values for this job:</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {Object.entries(buildMergeValues(
                        jobs.find(j => j.id === previewJob),
                        null,
                        settings
                      )).map(([field, value]) => value ? (
                        <div key={field} className="flex gap-2 text-xs">
                          <code className="text-brand font-mono flex-shrink-0">{field}</code>
                          <span className="text-gray-500">→</span>
                          <span className="text-gray-700 truncate">{value}</span>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
