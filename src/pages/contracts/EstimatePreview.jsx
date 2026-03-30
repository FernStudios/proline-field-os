import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { generateEstimateText } from '../../lib/estimateText'
import { buildMergeData, applyMergeFields } from '../../lib/mergeFields'
import { TopNav } from '../../components/layout/AppShell'
import { Button } from '../../components/ui'
import { toast } from '../../components/ui'
import { uid } from '../../lib/utils'

export default function EstimatePreview() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { settings, addEstimate, updateJob, customTemplates } = useStore()
  const [wasEdited, setWasEdited] = useState(false)
  const editRef = useRef(null)
  const d = (() => {
    try {
      const raw = sessionStorage.getItem('estimateWizardData')
      if (!raw) return {}
      return JSON.parse(raw)
    } catch(e) {
      console.error('estimateWizardData parse error:', e)
      return {}
    }
  })()
  const [generatedText] = useState(() => {
    const customTpl = customTemplates?.estimate
    if (customTpl?.text) {
      const mergeData = buildMergeData(null, d, settings)
      return applyMergeFields(customTpl.text, mergeData)
    }
    return generateEstimateText(d, settings)
  })

  const handleSave = () => {
    const finalText = editRef.current?.innerText || generatedText
    const portalToken = uid() + uid()
    const estimate = {
      id: uid(),
      num: d.estimateNum,
      jobId,
      status: 'draft',
      price: parseFloat(d.price) || 0,
      depositAmount: parseFloat(d.depositAmount) || 0,
      customerName: d.customerName,
      customerEmail: d.customerEmail,
      projectAddress: d.projectAddress,
      projectState: d.projectState,
      scope: d.scope,
      expiryDate: d.expiryDate,
      documentText: finalText,
      generatedText,
      wasEdited: finalText !== generatedText,
      portalToken,
      created: new Date().toISOString(),
      wizardData: d,
    }
    addEstimate(estimate)
    updateJob(jobId, { kbStatus: 'estimate_sent', contractValue: parseFloat(d.price) || 0 })
    sessionStorage.removeItem('estimateWizardData')
    toast('Estimate saved — portal link generated ✓')
    navigate(`/jobs/${jobId}`)
  }

  if (!d.customerName) return (
    <div className="p-8 text-center text-gray-400">
      No estimate data. <button onClick={() => navigate(`/jobs/${jobId}/estimate/new`)} className="text-brand underline">Start over</button>
    </div>
  )

  return (
    <div className="screen">
      <TopNav title={d.estimateNum} onBack={() => navigate(`/jobs/${jobId}/estimate/new`)} />
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
        <p className="text-xs text-amber-800">✏️ Fully editable — tap to modify before saving. A customer portal link will be created when you save.</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div ref={editRef} contentEditable suppressContentEditableWarning
          className="px-5 py-6 font-serif text-xs leading-relaxed text-gray-900 outline-none"
          style={{ whiteSpace:'pre-wrap', wordWrap:'break-word', minHeight:'60vh' }}
          onInput={() => setWasEdited(true)}
          dangerouslySetInnerHTML={{ __html: generatedText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') }}
        />
      </div>
      {wasEdited && <div className="bg-blue-50 border-t border-blue-200 px-4 py-2 text-xs text-blue-700">📝 Edited from generated version</div>}
      <div className="border-t border-gray-100 p-4 flex gap-3" style={{paddingBottom:'calc(16px + env(safe-area-inset-bottom))'}}>
        <Button variant="ghost" className="flex-1" onClick={() => navigate(`/jobs/${jobId}/estimate/new`)}>← Edit</Button>
        <Button variant="primary" className="flex-[2]" onClick={handleSave}>Save estimate + create portal link →</Button>
      </div>
    </div>
  )
}
