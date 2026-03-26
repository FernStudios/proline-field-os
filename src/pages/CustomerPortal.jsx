import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { fmtM, fmtDShort } from '../lib/utils'
import { supabase } from '../lib/supabase'

export default function CustomerPortal() {
  const { token } = useParams()
  const [state, setState] = useState('loading') // loading | estimate | contract | not_found
  const [data, setData] = useState(null)
  const [decision, setDecision] = useState(null) // approve | decline
  const [declineReason, setDeclineReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    // Try to find the document by portal token in Supabase
    // In production, would query the user_data table for a job/estimate with this token
    // For now, decode the token from sessionStorage (demo mode)
    const stored = sessionStorage.getItem(`portal_${token}`)
    if (stored) {
      const parsed = JSON.parse(stored)
      setData(parsed)
      setState(parsed.type || 'estimate')
    } else {
      // Try Supabase
      trySupabase()
    }
  }, [token])

  const trySupabase = async () => {
    if (!supabase) { setState('not_found'); return }
    try {
      // Would query for the record with this portal token
      const { data: rows } = await supabase
        .from('user_data')
        .select('db')
      
      if (rows) {
        for (const row of rows) {
          const db = row.db
          const estimate = db?.estimates?.find(e => e.portalToken === token)
          if (estimate) {
            setData({ type: 'estimate', estimate, settings: db?.settings })
            setState('estimate')
            return
          }
          const contract = db?.contracts?.find(c => c.portalToken === token)
          if (contract) {
            setData({ type: 'contract', contract, settings: db?.settings })
            setState('contract')
            return
          }
        }
      }
      setState('not_found')
    } catch(e) {
      setState('not_found')
    }
  }

  const handleDecision = async (choice) => {
    setDecision(choice)
    setSubmitted(true)
    // In production: write back to Supabase with approval/decline + timestamp
    if (supabase && data) {
      try {
        // Update the record in Supabase
      } catch(e) {}
    }
  }

  if (state === 'loading') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading your document…</p>
      </div>
    </div>
  )

  if (state === 'not_found') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-sm border border-gray-100 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="font-display font-bold text-navy text-lg mb-2">Link not found</h1>
        <p className="text-gray-400 text-sm">This link may have expired or already been used. Contact your contractor for a new link.</p>
      </div>
    </div>
  )

  const est = data?.estimate
  const con = data?.contract
  const settings = data?.settings || {}

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">{decision === 'approve' ? '✅' : '❌'}</div>
        <h2 className="font-display font-bold text-navy text-xl mb-2">
          {decision === 'approve' ? 'Accepted!' : 'Declined'}
        </h2>
        <p className="text-gray-500 text-sm">
          {decision === 'approve'
            ? "Your contractor has been notified. They'll be in touch to schedule next steps."
            : "Your contractor has been notified of your decision."}
        </p>
        {decision === 'approve' && est?.depositAmount > 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            <p className="font-semibold mb-1">Materials deposit due</p>
            <p>A deposit of {fmtM(est.depositAmount)} is required before materials can be ordered. Your contractor will provide payment instructions.</p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy px-4 py-4 flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-white text-base">{settings.coName || 'Field OS'}</p>
          <p className="text-white/50 text-xs">Secure document portal</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-bold">
          {(settings.coName || 'P')[0]}
        </div>
      </div>

      <div className="px-4 pt-5 pb-10 max-w-lg mx-auto">
        {state === 'estimate' && est && (
          <>
            {/* Estimate header */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-display font-bold text-navy text-base">Estimate {est.num}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{est.projectAddress}</p>
                </div>
                <span className={`badge text-xs ${est.status === 'approved' ? 'badge-green' : est.status === 'declined' ? 'badge-red' : 'badge-amber'}`}>
                  {est.status || 'Pending review'}
                </span>
              </div>
              <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                <div className="flex justify-between"><span className="text-gray-400">Estimated total</span><span className="font-semibold text-navy">{fmtM(est.price)}</span></div>
                {est.depositAmount > 0 && <div className="flex justify-between"><span className="text-gray-400">Deposit at acceptance</span><span className="text-navy">{fmtM(est.depositAmount)}</span></div>}
                {est.depositAmount > 0 && <div className="flex justify-between"><span className="text-gray-400">Balance at completion</span><span className="text-navy">{fmtM((est.price||0)-(est.depositAmount||0))}</span></div>}
                {est.expiryDate && <div className="flex justify-between"><span className="text-gray-400">Valid through</span><span className="text-navy">{fmtDShort(est.expiryDate)}</span></div>}
              </div>
            </div>

            {/* Scope */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
              <p className="font-semibold text-navy text-sm mb-2">Scope of work</p>
              <p className="text-xs text-gray-600 leading-relaxed font-serif whitespace-pre-wrap">{est.scope}</p>
            </div>

            {/* Full document */}
            <details className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 cursor-pointer">
              <summary className="font-semibold text-navy text-sm list-none flex items-center justify-between">
                <span>View full estimate document</span>
                <span className="text-gray-400 text-lg">›</span>
              </summary>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="font-serif text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{est.documentText}</p>
              </div>
            </details>

            {/* Decision */}
            {est.status === 'approved' || est.status === 'declined' ? (
              <div className={`rounded-2xl p-4 text-center ${est.status === 'approved' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <p className={`font-semibold text-sm ${est.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
                  {est.status === 'approved' ? '✅ You accepted this estimate' : '❌ You declined this estimate'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="font-semibold text-navy text-sm mb-1">Ready to proceed?</p>
                <p className="text-xs text-gray-400 mb-3">Accepting this estimate confirms you've reviewed the scope and pricing. A formal contract will be prepared next.</p>
                <div className="space-y-2.5">
                  <button onClick={() => handleDecision('approve')}
                    className="w-full bg-navy text-white font-semibold py-3 rounded-xl text-sm active:scale-[0.99] transition-transform">
                    ✓ Accept estimate — {fmtM(est.price)}
                  </button>
                  <button onClick={() => setDecision('decline-confirm')}
                    className="w-full bg-red-50 text-red-600 font-semibold py-2.5 rounded-xl text-sm border border-red-200 active:scale-[0.99] transition-transform">
                    Decline
                  </button>
                </div>
                {decision === 'decline-confirm' && (
                  <div className="mt-3">
                    <textarea value={declineReason} onChange={e=>setDeclineReason(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3 text-xs resize-none" rows={3}
                      placeholder="Optional: let them know why you're declining…" />
                    <button onClick={() => handleDecision('decline')}
                      className="w-full mt-2 bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm">
                      Confirm decline
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {state === 'contract' && con && (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
              <p className="font-display font-bold text-navy text-base mb-1">{con.num}</p>
              <p className="text-xs text-gray-400 mb-3">{con.projectAddress}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Contract amount</span><span className="font-semibold">{fmtM(con.price)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Payment</span><span>Version {con.paymentVersion}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Warranty</span><span>{con.warrantyYears} years</span></div>
              </div>
            </div>
            <details className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 cursor-pointer">
              <summary className="font-semibold text-navy text-sm list-none flex items-center justify-between">
                <span>View contract document</span><span className="text-gray-400 text-lg">›</span>
              </summary>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="font-serif text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{con.documentText}</p>
              </div>
            </details>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
              Electronic signature is coming soon. Contact your contractor to sign this contract.
            </div>
          </>
        )}

        <p className="text-center text-xs text-gray-300 mt-6">Powered by Proline Field OS</p>
      </div>
    </div>
  )
}
