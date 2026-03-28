// Generates the complete attorney review document packet
// Includes every document type in the system, formatted exactly as they appear to customers
// One continuous printable document with page breaks between docs

import { generateContractText } from './contractText'
import { generateCO02Text, generateCO03AText, generateCO03BText } from './contractText'
import { generateEstimateText, generateLienWaiverText } from './estimateText'

const TODAY = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

export function printDocumentPacket(contractTemplate, settings) {
  const co = settings || {}
  const tpl = contractTemplate || {}
  const cd = co.contractDefaults || {}

  // ── Shared placeholder data ─────────────────────────────────────
  const payMethods = Object.entries(co.paymentConfig || {})
    .filter(([, v]) => v?.enabled)
    .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
    .join(', ') || 'Check, Zelle, ACH'

  const scopeText = buildSampleScope(tpl)
  const maintText = buildMaintText(tpl)
  const primaryState = co.primaryState || 'SC'

  const shared = {
    customerName:        '[CUSTOMER FULL LEGAL NAME]',
    coCustomerName:      '',
    customerAddress:     '[CUSTOMER MAILING ADDRESS]',
    customerPhone:       '[CUSTOMER PHONE]',
    customerEmail:       '[CUSTOMER EMAIL]',
    projectAddress:      '[PROJECT SITE ADDRESS]',
    workType:            tpl.tradeLabel || tpl.trade || co.jobTypes?.[0] || 'Residential Improvement',
    scope:               scopeText,
    price:               0,
    deposit:             0,
    startDate:           '',
    estimatedCompletion: '[To be mutually agreed upon at scheduling]',
    durationDays:        'X',
    warrantyYears:       5,
    maintenanceItems:    maintText,
    paymentMethods:      payMethods,
    lateFee:             cd.lateFee   || 1.5,
    adminFee:            cd.adminFee  || 75,
    responseDays:        cd.coResponseDays || 5,
    disputeMethod:       cd.disputeMethod  || 'mediation_arbitration',
    includePermits:      false,
    includeHOA:          false,
    curePeriod:          cd.curePeriod || 10,
    insurancePerOccurrence: '1,000,000',
    insuranceAggregate:     '2,000,000',
    projectState:        primaryState,
    lienDays:            cd.lienDays  || 90,
    milestones:          [],
    expiryDate:          '',
    depositAmount:       0,
    exclusions:          '',
    finalPaymentAmount:  0,
    contractNum:         'CON-XXXX',
    estimateNum:         'EST-XXXX',
    originalContractNum: 'CON-XXXX',
    coNum:               'CO-XXXX',
    description:         buildCODesc(tpl, 'customer'),
    conditionDescription:buildCODesc(tpl, 'required_a'),
    correctiveWork:      buildCOCorrectiveWork(tpl, 'required_a'),
    consequences:        buildCOConsequences(tpl, 'required_a'),
    warrantyImpactDescription: buildCODesc(tpl, 'required_b'),
    coAmount:            0,
    materialsDeposit:    0,
    scheduleImpact:      false,
    scheduleDays:        0,
    newCompletion:       '',
    totalPaidToDate:     0,
    originalContractPrice: 0,
    lifeSafety:          true,
    structural:          false,
    codeViolation:       false,
    permitFeesIncluded:  false,
    contractorPullsPermits: false,
    notes:               '',
  }

  // ── Generate all documents ──────────────────────────────────────
  const docs = [
    {
      title: 'DOCUMENT 1 OF 7 — ESTIMATE / PROPOSAL',
      subtitle: 'The estimate is sent to the customer before a contract is signed.',
      text: generateEstimateText({ ...shared, scope: tpl.scopeTemplates?.[0]?.scope || scopeText }, co),
    },
    {
      title: 'DOCUMENT 2 OF 7 — RESIDENTIAL CONSTRUCTION CONTRACT',
      subtitle: 'Payment Version A: Materials deposit + full balance at completion. (Most common)',
      text: generateContractText({ ...shared, paymentVersion: 'A' }, co),
    },
    {
      title: 'DOCUMENT 3 OF 7 — RESIDENTIAL CONSTRUCTION CONTRACT',
      subtitle: 'Payment Version B: Materials deposit + weekly labor draws. Used for longer projects.',
      text: generateContractText({ ...shared, paymentVersion: 'B' }, co),
    },
    {
      title: 'DOCUMENT 4 OF 7 — RESIDENTIAL CONSTRUCTION CONTRACT',
      subtitle: 'Payment Version C: Materials deposit + milestone-based draws.',
      text: generateContractText({ ...shared, paymentVersion: 'C', milestones: [
        { description: '[Milestone 1 — e.g., framing complete]', amount: 0 },
        { description: '[Milestone 2 — e.g., rough-in complete]', amount: 0 },
      ]}, co),
    },
    {
      title: 'DOCUMENT 5 OF 7 — CHANGE ORDER (CUSTOMER REQUESTED)',
      subtitle: 'CO-02: Issued when a customer requests additional scope.',
      text: generateCO02Text(shared),
    },
    {
      title: 'DOCUMENT 6 OF 7 — REQUIRED CHANGE ORDER (LIFE/SAFETY/CODE)',
      subtitle: 'CO-03A: Issued when a field condition prevents safe continuation of work.',
      text: generateCO03AText(shared),
    },
    {
      title: 'DOCUMENT 7 OF 7 — REQUIRED CHANGE ORDER (WARRANTY IMPACT)',
      subtitle: 'CO-03B: Issued when a field condition voids warranty if left uncorrected.',
      text: generateCO03BText({ ...shared,
        conditionDescription: buildCODesc(tpl, 'required_b'),
        correctiveWork:       buildCOCorrectiveWork(tpl, 'required_b'),
        warrantyImpactDescription: buildCOWarrantyImpact(tpl),
      }),
    },
    {
      title: 'DOCUMENT 8 OF 8 — FINAL UNCONDITIONAL LIEN WAIVER',
      subtitle: 'Issued after all invoices are paid in full to release lien rights.',
      text: generateLienWaiverText(shared, co),
    },
  ]

  // ── Render HTML ─────────────────────────────────────────────────
  const docSections = docs.map((d, i) => `
    <div class="doc-section${i > 0 ? ' page-break' : ''}">
      <div class="doc-header">
        <div class="doc-tag">ATTORNEY REVIEW DRAFT — NOT FOR EXECUTION</div>
        <h2 class="doc-title">${d.title}</h2>
        <p class="doc-subtitle">${d.subtitle}</p>
      </div>
      <div class="doc-body">${esc(d.text)}</div>
    </div>`
  ).join('\n')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Document Review Packet — ${co.coName || 'Your Company'}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f1f5f9;
      color: #111;
    }

    /* ── Print bar (screen only) ── */
    .print-bar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 200;
      background: #050d1f; color: white;
      padding: 12px 24px;
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,.4);
    }
    .pb-left strong { font-size: 14px; display: block; }
    .pb-left span { font-size: 11px; color: rgba(255,255,255,.6); }
    .pb-right { display: flex; gap: 10px; flex-shrink: 0; }
    .btn { border: none; cursor: pointer; border-radius: 8px; font-weight: 700; font-size: 13px; padding: 8px 18px; }
    .btn-primary { background: white; color: #050d1f; }
    .btn-ghost { background: transparent; color: white; border: 1px solid rgba(255,255,255,.35); }
    .print-spacer { height: 60px; }

    /* ── Cover page ── */
    .cover {
      max-width: 8.5in; margin: 32px auto; background: white;
      border-radius: 8px; overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,.12);
    }
    .cover-header {
      background: #050d1f; color: white;
      padding: 40px 48px 32px;
    }
    .cover-header h1 { font-size: 26px; font-weight: 800; margin-bottom: 6px; }
    .cover-header p { font-size: 14px; color: rgba(255,255,255,.65); }
    .cover-body { padding: 32px 48px; }
    .cover-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 28px; }
    .meta-row label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #888; display: block; margin-bottom: 3px; }
    .meta-row span { font-size: 13px; font-weight: 600; color: #111; }
    .notice {
      background: #fff8e1; border: 2px solid #f59e0b; border-radius: 8px;
      padding: 18px 22px; margin-bottom: 24px;
    }
    .notice h3 { font-size: 12px; font-weight: 800; color: #92400e; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
    .notice p { font-size: 12px; line-height: 1.65; color: #78350f; margin-bottom: 6px; }
    .notice p:last-child { margin: 0; }
    .doc-list { list-style: none; }
    .doc-list li { padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; display: flex; gap: 10px; }
    .doc-list li:last-child { border: none; }
    .doc-list .num { font-weight: 700; color: #050d1f; min-width: 24px; }
    .doc-list .name { font-weight: 600; color: #111; }
    .doc-list .desc { font-size: 11px; color: #888; margin-top: 1px; }

    /* ── Document sections ── */
    .doc-section {
      max-width: 8.5in; margin: 24px auto; background: white;
      border-radius: 8px; overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,.12);
    }
    .doc-header {
      background: #f8fafc; border-bottom: 2px solid #e2e8f0;
      padding: 18px 48px 16px;
    }
    .doc-tag {
      display: inline-block; font-size: 9px; font-weight: 800; letter-spacing: .08em;
      text-transform: uppercase; color: #b45309;
      background: #fef3c7; border: 1px solid #f59e0b;
      padding: 3px 8px; border-radius: 4px; margin-bottom: 8px;
    }
    .doc-title { font-size: 15px; font-weight: 800; color: #050d1f; margin-bottom: 4px; }
    .doc-subtitle { font-size: 12px; color: #64748b; }
    .doc-body {
      padding: 32px 48px 40px;
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.75;
      color: #111;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* ── Sign-off section ── */
    .signoff-section {
      max-width: 8.5in; margin: 24px auto; background: white;
      border-radius: 8px; overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,.12);
    }
    .signoff-header {
      background: #050d1f; color: white; padding: 24px 48px;
    }
    .signoff-header h2 { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
    .signoff-header p { font-size: 12px; color: rgba(255,255,255,.65); }
    .signoff-body { padding: 32px 48px 48px; }
    .signoff-body > p { font-size: 12px; line-height: 1.7; color: #444; margin-bottom: 28px; }

    .option-block {
      border: 2px solid #e2e8f0; border-radius: 10px;
      padding: 22px 26px; margin-bottom: 20px;
    }
    .option-block.attorney { border-color: #10b981; background: #f0fdf4; }
    .option-block.self { border-color: #f59e0b; background: #fffbeb; }
    .option-block h3 { font-size: 14px; font-weight: 800; color: #111; margin-bottom: 6px; }
    .option-block.attorney h3 { color: #065f46; }
    .option-block.self h3 { color: #92400e; }
    .option-block p { font-size: 11.5px; line-height: 1.65; color: #555; margin-bottom: 14px; }
    .option-block.self p.disclaimer {
      font-size: 11px; line-height: 1.65;
      color: #78350f; background: #fef3c7; border: 1px solid #f59e0b;
      border-radius: 6px; padding: 12px 14px; margin-bottom: 16px;
    }

    .sig-table { width: 100%; border-collapse: collapse; }
    .sig-table td { padding: 8px 0 18px; vertical-align: bottom; }
    .sig-table .line { border-bottom: 1px solid #555; display: block; height: 28px; }
    .sig-table .cap { font-size: 9.5px; color: #666; font-family: system-ui, sans-serif; padding-top: 3px; }
    .sig-table .w50 { width: 48%; }
    .sig-table .gap { width: 4%; }
    .sig-table .w100 { width: 100%; }

    .footer-bar {
      max-width: 8.5in; margin: 16px auto 48px;
      text-align: center; font-size: 10px; color: #94a3b8;
    }

    /* ── Print media ── */
    @media print {
      body { background: white; }
      .print-bar, .print-spacer { display: none !important; }
      .doc-section, .signoff-section, .cover { margin: 0; border-radius: 0; box-shadow: none; }
      .doc-header { padding: 14px 0.85in 12px; }
      .doc-body { padding: 24px 0.85in 32px; }
      .cover-header, .cover-body { padding-left: 0.85in; padding-right: 0.85in; }
      .signoff-header, .signoff-body { padding-left: 0.85in; padding-right: 0.85in; }
      .footer-bar { display: none; }
      .page-break { page-break-before: always; }
    }

    @page { margin: 0.5in; }
  </style>
</head>
<body>

<!-- Print bar -->
<div class="print-bar">
  <div class="pb-left">
    <strong>Attorney Review Packet — ${esc(co.coName || 'Your Company')}</strong>
    <span>8 documents · All legal documents used with customers · Generated ${TODAY}</span>
  </div>
  <div class="pb-right">
    <button class="btn btn-ghost" onclick="window.close()">Close</button>
    <button class="btn btn-primary" onclick="window.print()">🖨 Print / Save as PDF</button>
  </div>
</div>
<div class="print-spacer"></div>

<!-- Cover page -->
<div class="cover">
  <div class="cover-header">
    <h1>Attorney Review Document Packet</h1>
    <p>${esc(co.coName || 'Your Company')} · Confidential · Generated ${TODAY}</p>
  </div>
  <div class="cover-body">
    <div class="cover-meta">
      <div class="meta-row"><label>Company</label><span>${esc(co.coName || '—')}</span></div>
      <div class="meta-row"><label>Primary state</label><span>${co.primaryState || '—'}</span></div>
      <div class="meta-row"><label>Trade</label><span>${esc(tpl.tradeLabel || tpl.trade || '—')}</span></div>
      <div class="meta-row"><label>AI template status</label><span>${tpl ? 'Generated' : 'None'}</span></div>
    </div>

    <div class="notice">
      <h3>⚖ Purpose of this packet</h3>
      <p>This packet contains every document that customers and this company are asked to sign or acknowledge during a job. All documents must be reviewed and approved by a licensed attorney before use. Placeholder values are shown in [BRACKETS] — these are filled in at time of job creation.</p>
      <p>AI-generated language (scope, warranty conditions, change order scenarios) is integrated into the documents where it appears. The attorney is reviewing the complete documents, not just the AI additions.</p>
      <p><strong>To print or save as PDF:</strong> Click "Print / Save as PDF" above. In the print dialog, select "Save as PDF" to create a file you can email to your attorney.</p>
    </div>

    <p style="font-size:13px;font-weight:700;color:#050d1f;margin-bottom:10px;">Documents included in this packet:</p>
    <ul class="doc-list">
      <li><span class="num">1</span><div><div class="name">Estimate / Proposal</div><div class="desc">Sent to customer before a contract is signed</div></div></li>
      <li><span class="num">2</span><div><div class="name">Residential Construction Contract — Version A</div><div class="desc">Materials deposit + balance at completion</div></div></li>
      <li><span class="num">3</span><div><div class="name">Residential Construction Contract — Version B</div><div class="desc">Materials deposit + weekly labor draws</div></div></li>
      <li><span class="num">4</span><div><div class="name">Residential Construction Contract — Version C</div><div class="desc">Materials deposit + milestone draws</div></div></li>
      <li><span class="num">5</span><div><div class="name">Change Order — Customer Requested (CO-02)</div><div class="desc">Customer requests additional scope</div></div></li>
      <li><span class="num">6</span><div><div class="name">Required Change Order — Life/Safety/Code (CO-03A)</div><div class="desc">Field condition prevents safe continuation</div></div></li>
      <li><span class="num">7</span><div><div class="name">Required Change Order — Warranty Impact (CO-03B)</div><div class="desc">Field condition voids warranty if uncorrected</div></div></li>
      <li><span class="num">8</span><div><div class="name">Final Unconditional Lien Waiver</div><div class="desc">Issued after all invoices paid in full</div></div></li>
    </ul>
  </div>
</div>

<!-- Document sections -->
${docSections}

<!-- Attorney sign-off -->
<div class="signoff-section page-break">
  <div class="signoff-header">
    <h2>Attorney Review &amp; Authorization</h2>
    <p>Complete ONE of the two options below and return this page to the company.</p>
  </div>
  <div class="signoff-body">
    <p>
      The undersigned has reviewed the complete document packet above, including all 8 documents and all AI-generated trade-specific language integrated within them.
      Complete <strong>Option A</strong> if the documents have been reviewed by a licensed attorney, or <strong>Option B</strong> to self-authorize use without attorney review.
    </p>

    <!-- Option A: Attorney reviewed -->
    <div class="option-block attorney">
      <h3>✅ Option A — Attorney Reviewed and Approved</h3>
      <p>By signing below, the undersigned licensed attorney confirms they have reviewed the complete document packet and that in their professional judgment all language is legally sufficient for use in the state(s) indicated below.</p>
      <table class="sig-table">
        <tr>
          <td class="w50"><span class="line"></span><div class="cap">Attorney signature</div></td>
          <td class="gap"></td>
          <td class="w50"><span class="line"></span><div class="cap">Date reviewed</div></td>
        </tr>
        <tr>
          <td class="w50"><span class="line"></span><div class="cap">Printed name</div></td>
          <td class="gap"></td>
          <td class="w50"><span class="line"></span><div class="cap">Bar number</div></td>
        </tr>
        <tr>
          <td colspan="3" class="w100"><span class="line"></span><div class="cap">Law firm / practice name</div></td>
        </tr>
        <tr>
          <td colspan="3" class="w100"><span class="line"></span><div class="cap">State(s) in which these documents are approved for use</div></td>
        </tr>
        <tr>
          <td colspan="3" class="w100"><span class="line"></span><div class="cap">Any conditions, required modifications, or exceptions (attach addendum if needed)</div></td>
        </tr>
      </table>
    </div>

    <!-- Option B: Self-authorize -->
    <div class="option-block self">
      <h3>⚠ Option B — Self-Authorization Without Attorney Review</h3>
      <p class="disclaimer">
        <strong>LEGAL DISCLAIMER — READ CAREFULLY BEFORE SIGNING:</strong><br><br>
        By signing below, I acknowledge and agree to ALL of the following:<br><br>
        (1) I have NOT had the documents in this packet reviewed by a licensed attorney.<br>
        (2) I am choosing to use these documents entirely at my own risk.<br>
        (3) These documents contain AI-generated language that has not been independently verified for legal sufficiency in any jurisdiction.<br>
        (4) Proline Field OS, its owners, operators, developers, and agents make NO representation or warranty as to the legal sufficiency of these documents and bear NO liability for any legal outcome arising from their use.<br>
        (5) I release and hold harmless Proline Field OS and all related parties from any claim arising from my use of these documents without attorney review.<br>
        (6) I am strongly encouraged to consult a licensed attorney in my state before using these documents with customers.
      </p>
      <table class="sig-table">
        <tr>
          <td class="w50"><span class="line"></span><div class="cap">Account owner signature</div></td>
          <td class="gap"></td>
          <td class="w50"><span class="line"></span><div class="cap">Date</div></td>
        </tr>
        <tr>
          <td colspan="3" class="w100"><span class="line"></span><div class="cap">Printed full legal name</div></td>
        </tr>
        <tr>
          <td colspan="3" class="w100"><span class="line"></span><div class="cap">Company name</div></td>
        </tr>
      </table>
    </div>

  </div>
</div>

<div class="footer-bar">
  ATTORNEY REVIEW PACKET — ${esc(co.coName || 'Your Company')} — ${TODAY} — CONFIDENTIAL — NOT FOR EXECUTION WITHOUT AUTHORIZATION
</div>

</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  window.open(URL.createObjectURL(blob), '_blank')
}

// ── Helpers ────────────────────────────────────────────────────────

function esc(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildSampleScope(tpl) {
  const boiler = tpl.scopeBoilerplate || ''
  const first = tpl.scopeTemplates?.[0]?.scope || ''
  if (boiler && first) return `${boiler}\n\n${first}`
  if (first) return first
  if (boiler) return boiler
  return '[Contractor will furnish all labor, materials, equipment, and supervision necessary to complete the Work as specified in the accepted estimate, in a professional and workmanlike manner conforming to applicable building codes.]'
}

function buildMaintText(tpl) {
  const first = tpl.maintenanceTemplates?.[0]
  if (!first) return 'Customer shall maintain the Work in accordance with industry-standard practices for the materials installed.'
  return Array.isArray(first.requirements)
    ? first.requirements.join('\n\n')
    : (first.requirements || 'Customer shall maintain the Work in accordance with industry-standard practices.')
}

function buildCODesc(tpl, type) {
  const co = tpl.commonChangeOrders?.find(c => c.type === type)
  return co?.descriptionTemplate || co?.conditionTemplate
    || '[Field condition discovered during work — see specific change order for details]'
}

function buildCOCorrectiveWork(tpl, type) {
  const co = tpl.commonChangeOrders?.find(c => c.type === type)
  return co?.correctiveTemplate
    || '[Corrective work required as specified in this change order]'
}

function buildCOConsequences(tpl, type) {
  const co = tpl.commonChangeOrders?.find(c => c.type === type)
  return co?.consequenceTemplate
    || '[Work cannot continue without correction of the identified condition. Customer may approve corrective work or elect to terminate this contract. All prior payments are non-refundable.]'
}

function buildCOWarrantyImpact(tpl) {
  const co = tpl.commonChangeOrders?.find(c => c.type === 'required_b')
  return co?.warrantyImpactTemplate || co?.consequenceTemplate
    || '[No warranty will be issued or honored on any portion of the Work affected by the identified condition if Customer declines to authorize the corrective work.]'
}
