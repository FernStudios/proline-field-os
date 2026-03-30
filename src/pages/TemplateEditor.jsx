import { useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { TopNav } from '../components/layout/AppShell'
import { Button, FormGroup, Input, Select } from '../components/ui'
import { toast } from '../components/ui'
import { cn } from '../lib/utils'
import { MERGE_FIELDS, FIELD_GROUPS, buildSampleData, applyMergeFields } from '../lib/mergeFields'

const TEMPLATE_TYPES = [
  { value: 'contract_a',   label: 'Contract — Version A (deposit + balance)',      icon: '📋' },
  { value: 'contract_b',   label: 'Contract — Version B (deposit + weekly draws)',  icon: '📋' },
  { value: 'contract_c',   label: 'Contract — Version C (deposit + milestones)',    icon: '📋' },
  { value: 'estimate',     label: 'Estimate / Proposal',                            icon: '📄' },
  { value: 'co_02',        label: 'Change Order — Customer Requested (CO-02)',      icon: '⚠️' },
  { value: 'co_03a',       label: 'Change Order — Life/Safety/Code (CO-03A)',       icon: '🚫' },
  { value: 'co_03b',       label: 'Change Order — Warranty Impact (CO-03B)',        icon: '⚠️' },
  { value: 'lien_waiver',  label: 'Final Lien Waiver',                              icon: '🔒' },
]

export default function TemplateEditor() {
  const navigate = useNavigate()
  const { templateType } = useParams()
  const { user } = useAuth()
  const { customTemplates, saveCustomTemplate, deleteCustomTemplate, settings, syncToSupabase } = useStore()

  const existing = templateType ? customTemplates[templateType] : null
  const [type, setType] = useState(templateType || 'contract_a')
  const [name, setName] = useState(existing?.name || '')
  const [text, setText] = useState(existing?.text || '')
  const [preview, setPreview] = useState(false)
  const [activeGroup, setActiveGroup] = useState(FIELD_GROUPS[0])
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)
  const textareaRef = useRef(null)

  const sampleData = buildSampleData(settings)
  const previewText = preview ? applyMergeFields(text, sampleData) : text

  // Insert merge field at cursor position
  const insertField = useCallback((key) => {
    const el = textareaRef.current
    if (!el) { setText(t => t + `{{${key}}}`); return }
    const start = el.selectionStart
    const end = el.selectionEnd
    const token = `{{${key}}}`
    const newText = text.substring(0, start) + token + text.substring(end)
    setText(newText)
    // Restore cursor after the inserted token
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }, [text])

  // Extract text from uploaded file
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)

    try {
      if (file.name.endsWith('.docx')) {
        // Use mammoth via CDN — load dynamically
        const mammoth = await loadMammoth()
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        setText(result.value || '')
        toast('Document imported — now insert merge fields where variable data should go')
      } else if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const t = await file.text()
        setText(t)
        toast('Text file imported')
      } else if (file.name.endsWith('.pdf')) {
        toast('PDF import: copy your contract text and paste it into the editor below, then add merge fields', 'info')
      } else {
        const t = await file.text()
        setText(t)
        toast('File imported')
      }
      if (!name) setName(file.name.replace(/\.[^.]+$/, ''))
    } catch (err) {
      toast('Import failed: ' + err.message + ' — try copying and pasting the text directly', 'error')
    }
    setImporting(false)
  }

  async function loadMammoth() {
    return new Promise((resolve, reject) => {
      if (window.mammoth) { resolve(window.mammoth); return }
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
      script.onload = () => resolve(window.mammoth)
      script.onerror = () => reject(new Error('Failed to load mammoth'))
      document.head.appendChild(script)
    })
  }

  const handleSave = () => {
    if (!name.trim()) { toast('Template name is required', 'error'); return }
    if (!text.trim()) { toast('Template text is required', 'error'); return }
    saveCustomTemplate(type, { name: name.trim(), type, text, createdAt: new Date().toISOString() })
    if (user?.id) syncToSupabase(user.id)
    toast('Template saved and active')
    navigate('/document-templates')
  }

  const handleDelete = () => {
    if (!window.confirm('Delete this template? The system will fall back to the default generated document.')) return
    deleteCustomTemplate(type)
    if (user?.id) syncToSupabase(user.id)
    toast('Template deleted')
    navigate('/document-templates')
  }

  const typeLabel = TEMPLATE_TYPES.find(t => t.value === type)?.label || ''

  // Count merge fields in current text
  const fieldCounts = {}
  const fieldMatches = text.matchAll(/\{\{(\w+)\}\}/g)
  for (const m of fieldMatches) { fieldCounts[m[1]] = (fieldCounts[m[1]] || 0) + 1 }
  const usedCount = Object.keys(fieldCounts).length
  const unknownFields = Object.keys(fieldCounts).filter(k => !MERGE_FIELDS.find(f => f.key === k))

  return (
    <div className="flex flex-col h-screen" style={{fontFamily:'system-ui,sans-serif'}}>
      {/* Header */}
      <div style={{background:'#050d1f'}} className="px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/document-templates')} className="text-white/60 hover:text-white text-sm">← Back</button>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">{existing ? 'Edit template' : 'New template'}</p>
            <p className="text-white/40 text-xs">{typeLabel}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setPreview(p => !p)}
            className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors',
              preview ? 'bg-blue-600 text-white border-blue-600' : 'text-white/60 border-white/20 hover:text-white')}>
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button onClick={handleSave}
            className="text-xs font-bold text-white bg-brand rounded-lg px-4 py-1.5">
            Save & activate
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: merge field palette */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200">
            <p className="text-xs font-bold text-gray-700 mb-1">Insert merge field</p>
            <p className="text-[10px] text-gray-400 leading-snug">Click a field to insert at cursor. Fields are replaced with real data when the document is generated.</p>
          </div>

          {/* Group tabs */}
          <div className="flex overflow-x-auto px-2 pt-2 gap-1 flex-shrink-0">
            {FIELD_GROUPS.map(g => (
              <button key={g} onClick={() => setActiveGroup(g)}
                className={cn('text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap flex-shrink-0 transition-colors',
                  activeGroup === g ? 'bg-navy text-white' : 'text-gray-500 hover:bg-gray-200')}>
                {g}
              </button>
            ))}
          </div>

          {/* Fields list */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {MERGE_FIELDS.filter(f => f.group === activeGroup).map(f => (
              <button key={f.key} onClick={() => !preview && insertField(f.key)}
                disabled={preview}
                className={cn(
                  'w-full text-left px-2 py-2 rounded-lg mb-1 transition-colors group',
                  preview ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white hover:shadow-sm cursor-pointer',
                  fieldCounts[f.key] ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-transparent'
                )}>
                <p className="text-[11px] font-mono text-blue-700 font-bold">{`{{${f.key}}}`}</p>
                <p className="text-[10px] text-gray-500">{f.label}</p>
                {fieldCounts[f.key] && (
                  <p className="text-[9px] text-blue-500">Used {fieldCounts[f.key]}×</p>
                )}
              </button>
            ))}
          </div>

          {/* Field usage summary */}
          {usedCount > 0 && (
            <div className="px-3 py-2 border-t border-gray-200 flex-shrink-0">
              <p className="text-[10px] text-gray-500">{usedCount} field{usedCount !== 1 ? 's' : ''} in template</p>
              {unknownFields.length > 0 && (
                <p className="text-[10px] text-red-500 mt-0.5">⚠ Unknown: {unknownFields.join(', ')}</p>
              )}
            </div>
          )}
        </div>

        {/* Right: editor + settings */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Template settings bar */}
          <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <label className="text-xs text-gray-500 whitespace-nowrap">Name:</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Proline Standard Contract v2"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-navy min-w-0" />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="text-xs text-gray-500 whitespace-nowrap">Type:</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-navy">
                {TEMPLATE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => fileRef.current?.click()} disabled={importing || preview}
                className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-3 py-1 hover:border-gray-300 disabled:opacity-50">
                {importing ? 'Importing…' : '⬆ Import Word/text'}
              </button>
              <input ref={fileRef} type="file" className="hidden"
                accept=".docx,.txt,.md,.pdf"
                onChange={handleFileUpload} />
              {existing && (
                <button onClick={handleDelete} className="text-xs font-semibold text-red-500 border border-red-200 rounded-lg px-3 py-1 hover:bg-red-50">
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Preview banner */}
          {preview && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex-shrink-0">
              <p className="text-xs text-blue-700">
                <strong>Preview mode</strong> — showing with sample data substituted. Click "Edit" to make changes.
              </p>
            </div>
          )}

          {/* Import hint when empty */}
          {!text && !importing && (
            <div className="px-4 py-4 bg-amber-50 border-b border-amber-200 flex-shrink-0">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>How to use:</strong> Click "⬆ Import Word/text" to upload your contract (.docx), or paste your text directly into the editor below.
                Then click merge fields on the left to insert them where variable data should go (customer name, price, dates, etc.).
                Save when ready — this template will replace the default for this document type.
              </p>
            </div>
          )}

          {/* Main textarea / preview */}
          <div className="flex-1 overflow-hidden">
            {preview ? (
              <div className="h-full overflow-y-auto px-8 py-6"
                style={{ fontFamily: "'Times New Roman', serif", fontSize: '11pt', lineHeight: '1.75', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                {previewText || <span className="text-gray-400 italic">No content yet</span>}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste your contract text here, or use the Import button above to upload a Word document.

Then click merge fields on the left to insert them where variable data goes.

Example:
This Agreement is entered into between {{company_name}} and {{client_name}} of {{client_address}}..."
                className="w-full h-full resize-none border-none outline-none px-8 py-6 text-gray-900"
                style={{ fontFamily: "'Times New Roman', serif", fontSize: '11pt', lineHeight: '1.75' }}
                spellCheck={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
