import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { generateContractText } from '../../lib/contractText'
import { buildMergeData, applyMergeFields } from '../../lib/mergeFields'
import { TopNav } from '../../components/layout/AppShell'
import { Button, Modal } from '../../components/ui'
import { toast } from '../../components/ui'

export default function ContractPreview() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { settings, addContract, updateJob, customTemplates } = useStore()
  const [showGate, setShowGate] = useState(true)
  const [ackOption, setAckOption] = useState('')
  const [ackName, setAckName] = useState('')
  const [wasEdited, setWasEdited] = useState(false)
  const editRef = useRef(null)
  const wizardData = (() => {
    try {
      const raw = sessionStorage.getItem('wizardData')
      if (!raw) return {}
      return JSON.parse(raw)
    } catch(e) {
      console.error('wizardData parse error:', e)
      return {}
    }
  })()
  const [generatedText] = useState(() => {
    try {
      // Check for custom template
      const versionKey = `contract_${(wizardData.paymentVersion||'a').toLowerCase()}`
      const customTpl = customTemplates?.[versionKey]
      if (customTpl?.text) {
        const mergeData = buildMergeData(null, wizardData, settings)
        return applyMergeFields(customTpl.text, mergeData)
      }
      return generateContractText(wizardData, settings)
    } catch(e) {
      console.error('Contract generation error:', e)
      return 'Error generating contract text. Please go back and try again.\n\nError: ' + e.message
    }
  })
  const [currentText, setCurrentText] = useState(generatedText)

  const canProceed = ackOption && ackName.trim().length >= 2

  const handleSave = () => {
    const finalText = editRef.current?.innerText || currentText
    const contract = addContract({
      jobId,
      price: wizardData.price,
      deposit: wizardData.deposit,
      paymentVersion: wizardData.paymentVersion,
      projectState: wizardData.projectState,
      customerName: wizardData.customerName,
      projectAddress: wizardData.projectAddress,
      warrantyYears: wizardData.warrantyYears,
      wizardData,
      documentText: finalText,
      generatedText,
      wasEdited: finalText !== generatedText,
      attorneyAck: { type: ackOption, confirmedBy: ackName.trim(), timestamp: new Date().toISOString() },
      status: 'draft',
    })
    updateJob(jobId, { contractValue: wizardData.price, kbStatus: 'Pending Contract' })
    sessionStorage.removeItem('wizardData')
    toast('Contract saved ✓')
    navigate(`/jobs/${jobId}`)
  }

  if (!wizardData.customerName) {
    return <div className="p-8 text-center text-gray-400">No wizard data found. <button onClick={() => navigate(`/jobs/${jobId}/contract/new`)} className="text-brand underline">Start over</button></div>
  }

  return (
    <div className="screen">
      <TopNav title={wizardData.contractNum} onBack={() => navigate(`/jobs/${jobId}/contract/new`)} />
      <div className="flex-1 overflow-y-auto">
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-start gap-2">
          <span className="text-sm">✏️</span>
          <p className="text-xs text-amber-800">This document is fully editable. Tap anywhere in the text to make changes required by your attorney.</p>
        </div>
        <div ref={editRef} contentEditable suppressContentEditableWarning
          className="px-5 py-6 font-serif text-xs leading-relaxed text-gray-900 outline-none"
          style={{ whiteSpace:'pre-wrap', wordWrap:'break-word', minHeight:'60vh' }}
          onInput={() => { setWasEdited(true) }}
          dangerouslySetInnerHTML={{ __html: generatedText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') }}
        />
      </div>
      {wasEdited && (
        <div className="bg-blue-50 border-t border-blue-200 px-4 py-2 text-xs text-blue-700">📝 Document has been edited from the generated version</div>
      )}
      <div className="border-t border-gray-100 p-4 flex gap-3" style={{paddingBottom:'calc(16px + env(safe-area-inset-bottom))'}}>
        <Button variant="ghost" className="flex-1" onClick={() => navigate(`/jobs/${jobId}/contract/new`)}>← Edit</Button>
        <Button variant="primary" className="flex-[2]" onClick={() => setShowGate(true)}>Save & sign →</Button>
      </div>

      <Modal open={showGate} onClose={() => {}} title="⚖️ Legal acknowledgment required" size="lg">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800 leading-relaxed">
          Contracts and Change Orders have significant legal consequences. Before proceeding, confirm one of the following.
        </div>
        <div className="space-y-3 mb-4">
          {[
            { val:'reviewed', title:'✓ Attorney reviewed', desc:'I confirm this document has been reviewed by a licensed attorney in the applicable state(s) and I am authorized to use it.', bg:'bg-emerald-50 border-emerald-200' },
            { val:'not_reviewed', title:'⚠ Using without attorney review', desc:'I acknowledge I have NOT had this document reviewed by an attorney and accept sole responsibility for its legal effect. Proline Field OS bears no liability for use without attorney review.', bg:'bg-red-50 border-red-200' },
            { val:'ai_generated', title:'⚡ AI-assisted state provisions', desc:'This document includes AI-generated state-specific provisions based on publicly available statutes. This is not legal advice. I should consult a licensed attorney in my state before relying on this document in a dispute.', bg:'bg-blue-50 border-blue-200' },
          ].map(opt => (
            <label key={opt.val} onClick={() => setAckOption(opt.val)}
              className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${ackOption === opt.val ? 'border-brand bg-blue-50' : `border ${opt.bg}`}`}
            >
              <input type="radio" name="ack" value={opt.val} checked={ackOption === opt.val} onChange={() => setAckOption(opt.val)} className="mt-0.5 flex-shrink-0" />
              <div><p className="text-sm font-semibold">{opt.title}</p><p className="text-xs text-gray-600 mt-1 leading-relaxed">{opt.desc}</p></div>
            </label>
          ))}
        </div>
        {ackOption && (
          <div className="mb-4">
            <label className="form-label">Type your full name to confirm *</label>
            <input className="form-input" placeholder="Full name" value={ackName} onChange={e => setAckName(e.target.value)} />
          </div>
        )}
        <Button variant="primary" className="w-full" disabled={!canProceed} onClick={handleSave}>
          Save contract
        </Button>
        {!ackOption && <p className="text-xs text-center text-gray-400 mt-2">Select an option above to continue</p>}
      </Modal>
    </div>
  )
}
