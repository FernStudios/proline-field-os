import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { fmtM, fmtDShort } from '../lib/utils'
import { getStageInfo, CUSTOMER_PHASES, customerPhaseIndex } from '../lib/lifecycle'
import SignatureCanvas from '../components/SignatureCanvas'
import { supabase } from '../lib/supabase'

// CUSTOMER_PHASES and customerPhaseIndex imported from lifecycle.js

export default function CustomerPortal() {
  const { token } = useParams()
  const [status, setStatus] = useState('loading')
  const [data, setData] = useState(null)
  const [decision, setDecision] = useState(null)
  const [showSignModal, setShowSignModal] = useState(false)
  const [signatureData, setSignatureData] = useState(null)
  const [signingDoc, setSigningDoc] = useState(null) // { type: 'contract'|'estimate', id }
  const [declineReason, setDeclineReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => { loadByToken() }, [token])

  const loadByToken = async () => {
    if (!supabase) { setStatus('demo'); return }
    try {
      const { data: rows } = await supabase.from('user_data').select('db, user_id')
      if (rows) {
        for (const row of rows) {
          const db = row.db
          // Check jobs with this portal token
          const job = db?.jobs?.find(j => j.portalToken === token)
          if (job) {
            const estimates = (db.estimates || []).filter(e => e.jobId === job.id)
            const contracts = (db.contracts || []).filter(c => c.jobId === job.id)
            const invoices  = (db.invoices  || []).filter(i => i.jobId === job.id)
            const cos       = (db.changeOrders || []).filter(c => c.jobId === job.id)
            setData({ job, estimates, contracts, invoices, changeOrders: cos, settings: db.settings, userId: row.user_id })
            setStatus('job')
            return
          }
          // Fallback: check estimate token
          const est = db?.estimates?.find(e => e.portalToken === token)
          if (est) {
            const job2 = db?.jobs?.find(j => j.id === est.jobId)
            setData({ job: job2, estimates: [est], contracts: [], invoices: [], changeOrders: [], settings: db.settings, userId: row.user_id })
            setStatus('job')
            return
          }
        }
      }
      setStatus('not_found')
    } catch(e) {
      console.error(e)
      setStatus('not_found')
    }
  }

  const handleSign = async (docType, docId, signatureDataUrl) => {
    // Write signature back to Supabase
    if (supabase && data?.userId) {
      try {
        const { data: rows } = await supabase.from('user_data').select('db').eq('user_id', data.userId).single()
        if (rows?.db) {
          const db = rows.db
          if (docType === 'contract') {
            const idx = db.contracts.findIndex(c => c.id === docId)
            if (idx >= 0) {
              db.contracts[idx].status = 'signed'
              db.contracts[idx].signature = { dataUrl: signatureDataUrl, signedAt: new Date().toISOString() }
              // Advance job to contract_signed
              const jobIdx = db.jobs.findIndex(j => j.id === data.job?.id)
              if (jobIdx >= 0 && db.jobs[jobIdx].kbStatus === 'contract_pending') {
                db.jobs[jobIdx].kbStatus = 'contract_signed'
              }
            }
          }
          await supabase.from('user_data').update({ db }).eq('user_id', data.userId)
        }
      } catch(e) { console.warn('Sign error:', e.message) }
    }
    setSignatureData(signatureDataUrl)
    setShowSignModal(false)
    setSigningDoc(null)
  }

  const handleDecision = async (choice) => {
    setDecision(choice)
    setSubmitted(true)
    // Write approval back to Supabase
    if (supabase && data?.userId && data?.estimates?.[0]) {
      try {
        const { data: rows } = await supabase.from('user_data').select('db').eq('user_id', data.userId).single()
        if (rows?.db) {
          const db = rows.db
          const estIdx = db.estimates.findIndex(e => e.portalToken === token || e.jobId === data.job?.id)
          if (estIdx >= 0) {
            db.estimates[estIdx].status = choice === 'approve' ? 'approved' : 'declined'
            db.estimates[estIdx].customerDecision = { choice, reason: declineReason, timestamp: new Date().toISOString() }
          }
          if (choice === 'approve' && data.job) {
            const jobIdx = db.jobs.findIndex(j => j.id === data.job.id)
            if (jobIdx >= 0) db.jobs[jobIdx].kbStatus = 'estimate_approved'
          }
          await supabase.from('user_data').update({ db }).eq('user_id', data.userId)
        }
      } catch(e) { console.warn('Portal write:', e.message) }
    }
  }

  // ── Loading / error states ─────────────────────────────────────
  if (status === 'loading') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    </div>
  )

  if (status === 'not_found') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-sm">
        <div className="text-4xl mb-3">🔍</div>
        <h1 className="font-bold text-gray-900 text-lg mb-2">Link not found</h1>
        <p className="text-gray-500 text-sm">This link may have expired. Contact your contractor for a new link.</p>
      </div>
    </div>
  )

  if (status === 'demo') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-sm">
        <div className="text-4xl mb-3">🔗</div>
        <h1 className="font-bold text-gray-900 text-lg mb-2">Customer Portal</h1>
        <p className="text-gray-500 text-sm">In demo mode, customer portal data is not persisted. Create an account to enable live portals.</p>
      </div>
    </div>
  )

  const { job, estimates, contracts, invoices, changeOrders, settings } = data
  const currentEst = estimates?.[0]
  const currentContract = contracts?.[contracts.length - 1]
  const totalPaid = invoices.reduce((s,i) => s+(i.payments||[]).reduce((p,pm)=>p+(pm.amount||0),0), 0)
  const totalOwed = invoices.reduce((s,i) => s+(i.amount||0), 0)
  const balance = totalOwed - totalPaid
  const stageInfo = getStageInfo(job?.kbStatus)
  const currentPhaseIdx = customerPhaseIndex(job?.kbStatus)
  const pendingCOs = changeOrders.filter(co => co.status === 'pending')

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">{decision === 'approve' ? '✅' : '❌'}</div>
        <h2 className="font-bold text-gray-900 text-xl mb-2">{decision === 'approve' ? 'Estimate accepted!' : 'Estimate declined'}</h2>
        <p className="text-gray-500 text-sm">{decision === 'approve' ? 'Your contractor will be in touch to prepare the contract.' : 'Your contractor has been notified.'}</p>
        {decision === 'approve' && currentEst?.depositAmount > 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 text-left">
            <p className="font-semibold mb-1">Materials deposit required</p>
            <p>A deposit of {fmtM(currentEst.depositAmount)} is due before materials can be ordered. Your contractor will contact you with payment details.</p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#050d1f] px-4 py-4">
        <p className="font-bold text-white text-base">{settings?.coName || 'Your Contractor'}</p>
        <p className="text-white/50 text-xs mt-0.5">Customer portal · {settings?.coPhone || ''}</p>
      </div>

      <div className="px-4 pt-5 pb-10 max-w-lg mx-auto space-y-4">

        {/* Job status card */}
        {job && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-gray-900 text-base">{job.client}</p>
                <p className="text-xs text-gray-400 mt-0.5">{job.address}</p>
              </div>
              <span className={`badge text-xs ${stageInfo.badge}`}>{stageInfo.label}</span>
            </div>

            {/* Progress stepper */}
            <div className="flex items-center gap-0 mt-3">
              {CUSTOMER_PHASES.map((phase, i) => (
                <div key={phase.key} className="flex items-center flex-1 min-w-0">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i < currentPhaseIdx ? 'bg-[#050d1f] text-white' :
                    i === currentPhaseIdx ? 'bg-[#0a3ef8] text-white' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {i < currentPhaseIdx ? '✓' : i + 1}
                  </div>
                  {i < CUSTOMER_PHASES.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${i < currentPhaseIdx ? 'bg-[#050d1f]' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex mt-1.5">
              {CUSTOMER_PHASES.map((phase, i) => (
                <div key={phase.key} className="flex-1 min-w-0">
                  <p className={`text-[9px] leading-tight truncate ${i === currentPhaseIdx ? 'font-semibold text-[#0a3ef8]' : 'text-gray-400'}`}>
                    {phase.label}
                  </p>
                </div>
              ))}
            </div>

            {job.type && <p className="text-xs text-gray-400 mt-3">Work type: {job.type}</p>}
            {job.startDate && <p className="text-xs text-gray-400">Scheduled start: {fmtDShort(job.startDate)}</p>}
          </div>
        )}

        {/* Pending CO alert */}
        {pendingCOs.length > 0 && pendingCOs.map(co => (
          <div key={co.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="font-semibold text-amber-800 text-sm mb-1">
              {co.coType === 'customer' ? 'Your change order is pending' : 'Action required — change order'}
            </p>
            <p className="text-xs text-amber-700 mb-2">
              {co.coType === 'required_a'
                ? 'A field condition has been found that requires your decision before work can continue.'
                : co.coType === 'required_b'
                ? 'A condition was found that may affect your warranty if not corrected.'
                : 'Your requested change order is being reviewed.'}
            </p>
            {co.description && <p className="text-xs text-amber-600 italic">"{co.description.substring(0,120)}…"</p>}
            <p className="text-xs text-amber-700 mt-2 font-medium">Contact your contractor to review and sign this change order.</p>
          </div>
        ))}

        {/* Estimate */}
        {currentEst && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-900 text-sm">Estimate {currentEst.num}</p>
              <span className={`badge text-xs ${currentEst.status === 'approved' ? 'badge-green' : currentEst.status === 'declined' ? 'badge-red' : 'badge-amber'}`}>
                {currentEst.status || 'Pending review'}
              </span>
            </div>
            <div className="space-y-1.5 text-xs mb-3">
              <div className="flex justify-between"><span className="text-gray-400">Total</span><span className="font-semibold">{fmtM(currentEst.price)}</span></div>
              {currentEst.depositAmount > 0 && <div className="flex justify-between"><span className="text-gray-400">Deposit at acceptance</span><span>{fmtM(currentEst.depositAmount)}</span></div>}
              {currentEst.expiryDate && <div className="flex justify-between"><span className="text-gray-400">Valid through</span><span>{fmtDShort(currentEst.expiryDate)}</span></div>}
            </div>

            {currentEst.scope && (
              <details className="text-xs">
                <summary className="text-[#0a3ef8] font-medium cursor-pointer list-none">View scope of work ›</summary>
                <p className="mt-2 text-gray-600 leading-relaxed font-serif whitespace-pre-wrap">{currentEst.scope}</p>
              </details>
            )}

            {!currentEst.status || currentEst.status === 'draft' || currentEst.status === 'sent' ? (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Ready to proceed with this project?</p>
                <div className="space-y-2">
                  <button onClick={() => handleDecision('approve')}
                    className="w-full bg-[#050d1f] text-white font-semibold py-2.5 rounded-xl text-sm active:scale-[0.99]">
                    Accept estimate — {fmtM(currentEst.price)}
                  </button>
                  {!decision && (
                    <button onClick={() => setDecision('decline-confirm')}
                      className="w-full text-red-500 text-xs font-medium py-1.5">
                      Decline
                    </button>
                  )}
                  {decision === 'decline-confirm' && (
                    <div>
                      <textarea value={declineReason} onChange={e=>setDeclineReason(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-2.5 text-xs resize-none mb-2" rows={2}
                        placeholder="Let them know why (optional)…" />
                      <button onClick={() => handleDecision('decline')}
                        className="w-full bg-red-500 text-white font-semibold py-2 rounded-xl text-xs">Confirm decline</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className={`mt-2 pt-2 border-t border-gray-100 text-xs font-medium ${currentEst.status === 'approved' ? 'text-emerald-600' : 'text-red-500'}`}>
                {currentEst.status === 'approved' ? '✓ You accepted this estimate' : '✗ You declined this estimate'}
              </p>
            )}
          </div>
        )}

        {/* Contract */}
        {currentContract && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-900 text-sm">Contract {currentContract.num}</p>
              <span className={`badge text-xs ${currentContract.status === 'signed' ? 'badge-green' : 'badge-amber'}`}>{currentContract.status}</span>
            </div>
            <div className="space-y-1 text-xs mb-2">
              <div className="flex justify-between"><span className="text-gray-400">Amount</span><span className="font-semibold">{fmtM(currentContract.price)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Warranty</span><span>{currentContract.warrantyYears} years</span></div>
            </div>
            <details className="text-xs">
              <summary className="text-[#0a3ef8] font-medium cursor-pointer list-none">View contract ›</summary>
              <div className="mt-2 max-h-48 overflow-y-auto">
                <p className="text-gray-600 leading-relaxed font-serif whitespace-pre-wrap text-[10px]">{currentContract.documentText}</p>
              </div>
            </details>
          </div>
        )}

        {/* Invoices */}
        {invoices.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="font-semibold text-gray-900 text-sm mb-3">Account balance</p>
            <div className="space-y-2 text-xs mb-3">
              <div className="flex justify-between"><span className="text-gray-400">Total invoiced</span><span className="font-semibold">{fmtM(totalOwed)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Paid</span><span className="text-emerald-600 font-semibold">{fmtM(totalPaid)}</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                <span className="font-semibold text-gray-700">Balance due</span>
                <span className={`font-bold ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmtM(balance)}</span>
              </div>
            </div>
            {balance > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                Contact your contractor with your preferred payment method — Check, Zelle, or as agreed.
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-300 pb-6">Powered by Proline Field OS</p>
    </div>
  )
}
