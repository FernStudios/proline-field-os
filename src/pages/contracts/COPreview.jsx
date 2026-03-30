import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { buildMergeData, applyMergeFields } from '../../lib/mergeFields'
import { generateCO02Text, generateCO03AText, generateCO03BText } from '../../lib/contractText'
import { TopNav } from '../../components/layout/AppShell'
import { Button, Modal } from '../../components/ui'
import { toast } from '../../components/ui'

export default function COPreview() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { addChangeOrder, updateJob, jobs , customTemplates } = useStore()
  const [showGate, setShowGate] = useState(true)
  const [ackOption, setAckOption] = useState('')
  const [ackName, setAckName] = useState('')
  const [wasEdited, setWasEdited] = useState(false)
  const editRef = useRef(null)
  const d = JSON.parse(sessionStorage.getItem('coWizardData') || '{}')
  const [generatedText] = useState(() => {
    const tplKey = d.coType === 'customer' ? 'co_02' : d.coType === 'required_a' ? 'co_03a' : 'co_03b'
    const customTpl = customTemplates?.[tplKey]
    if (customTpl?.text) {
      const mergeData = buildMergeData(null, d, settings)
      return applyMergeFields(customTpl.text, mergeData)
    }
    if (d.coType === 'customer') return generateCO02Text(d)
    if (d.coType === 'required_a') return generateCO03AText(d)
    return generateCO03BText(d)
  })

  const handleSave = () => {
    const finalText = editRef.current?.innerText || generatedText
    addChangeOrder({
      jobId,
      coType: d.coType,
      amount: d.coAmount || 0,
      adminFee: d.adminFee || 0,
      description: d.description || d.conditionDescription || '',
      customerName: d.customerName,
      wizardData: d,
      documentText: finalText,
      generatedText,
      wasEdited: finalText !== generatedText,
      attorneyAck: { type: ackOption, confirmedBy: ackName.trim(), timestamp: new Date().toISOString() },
    })
    sessionStorage.removeItem('coWizardData')
    const job = jobs.find(j => j.id === jobId)
    const coTypeLabel = d.coType === 'customer' ? 'Customer-requested CO' : d.coType === 'required_a' ? 'Required CO (Track A) — work stopped' : 'Required CO (Track B)'
    toast(coTypeLabel + ' saved — job status updated')
    navigate(`/jobs/${jobId}`)
  }

  return (
    <div className="screen">
      <TopNav title={d.coNum || 'Change Order'} onBack={() => navigate(`/jobs/${jobId}/co/new?type=${d.coType}`)} />
      <div className="flex-1 overflow-y-auto">
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <p className="text-xs text-amber-800">✏️ Fully editable — tap any text to modify per attorney requirements.</p>
        </div>
        <div ref={editRef} contentEditable suppressContentEditableWarning
          className="px-5 py-6 font-serif text-xs leading-relaxed outline-none"
          style={{ whiteSpace:'pre-wrap', wordWrap:'break-word', minHeight:'60vh' }}
          onInput={() => setWasEdited(true)}
          dangerouslySetInnerHTML={{ __html: generatedText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>') }}
        />
      </div>
      {wasEdited && <div className="bg-blue-50 border-t border-blue-200 px-4 py-2 text-xs text-blue-700">📝 Document has been edited</div>}
      <div className="border-t border-gray-100 p-4 flex gap-3" style={{paddingBottom:'calc(16px + env(safe-area-inset-bottom))'}}>
        <Button variant="ghost" className="flex-1" onClick={() => navigate(`/jobs/${jobId}/co/new?type=${d.coType}`)}>← Edit</Button>
        <Button variant="primary" className="flex-[2]" onClick={() => setShowGate(true)}>Save CO →</Button>
      </div>
      <Modal open={showGate} onClose={() => {}} title="⚖️ Legal acknowledgment" size="lg">
        <div className="space-y-3 mb-4">
          {[
            { val:'reviewed', title:'✓ Attorney reviewed', desc:'Reviewed by licensed attorney in applicable state(s)' },
            { val:'not_reviewed', title:'⚠ No attorney review', desc:'I accept sole responsibility for this document\'s legal effect' },
            { val:'ai_generated', title:'⚡ AI-assisted state provisions', desc:'Includes AI-generated provisions based on public statutes. Not legal advice. Attorney review recommended.' },
          ].map(opt => (
            <label key={opt.val} onClick={() => setAckOption(opt.val)} className={`flex gap-3 p-3 rounded-xl border cursor-pointer ${ackOption === opt.val ? 'border-brand bg-blue-50' : 'border-gray-200'}`}>
              <input type="radio" name="ack" value={opt.val} checked={ackOption === opt.val} onChange={() => setAckOption(opt.val)} className="mt-0.5 flex-shrink-0" />
              <div><p className="text-sm font-semibold">{opt.title}</p><p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p></div>
            </label>
          ))}
        </div>
        {ackOption && <div className="mb-4"><label className="form-label">Confirm your name *</label><input className="form-input" value={ackName} onChange={e=>setAckName(e.target.value)} placeholder="Full name" /></div>}
        <Button variant="primary" className="w-full" disabled={!ackOption || ackName.trim().length < 2} onClick={handleSave}>Save change order</Button>
      </Modal>
    </div>
  )
}
