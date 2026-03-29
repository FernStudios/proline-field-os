// generateDocxPacket.js — Browser-compatible docx packet generator
// Uses the docx npm package (ES module build) to create a properly formatted .docx

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, UnderlineType, PageNumber
} from 'docx'
import { generateContractText, generateCO02Text, generateCO03AText, generateCO03BText } from './contractText'
import { generateEstimateText, generateLienWaiverText } from './estimateText'

// ── Constants ────────────────────────────────────────────────────────
const PT      = n => n * 20        // pt → half-pt
const NAVY    = '050D1F'
const AMBER   = 'B45309'
const GRAY    = '64748B'
const BLACK   = '000000'
const PAGE_W  = 12240
const PAGE_H  = 15840
const MARGIN  = 1440
const CONTENT = PAGE_W - MARGIN * 2  // 9360

// ── Micro helpers ─────────────────────────────────────────────────────
const noBorder  = { style: BorderStyle.NONE, size: 0, color: 'auto' }
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder }

function run(text, opts = {}) {
  return new TextRun({
    text: String(text ?? ''),
    font: opts.serif ? 'Times New Roman' : (opts.font || 'Arial'),
    size: PT(opts.size || 11),
    bold:    opts.bold    || false,
    italics: opts.italic  || false,
    color:   opts.color   || BLACK,
    allCaps: opts.caps    || false,
  })
}

function p(children, opts = {}) {
  const kids = Array.isArray(children) ? children : [run(children, { serif: true, ...opts })]
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 100, line: opts.line || 276 },
    indent: opts.indent ? { left: opts.indent } : undefined,
    border: opts.borderBottom ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } } : undefined,
    children: kids,
  })
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: NAVY } },
    children: [run(text, { font: 'Arial', size: 16, bold: true, color: NAVY })],
  })
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 60 },
    children: [run(text, { font: 'Arial', size: 10, bold: true, color: NAVY, caps: true })],
  })
}

function empty(spaceAfter = 80) {
  return p('', { after: spaceAfter })
}

function pg() {
  return new Paragraph({ children: [new TextRun({ break: 1 })], spacing: { before: 0, after: 0 } })
}

function amberBox(title, lines) {
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [CONTENT],
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 8, color: 'F59E0B' },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: 'F59E0B' },
      left:   { style: BorderStyle.SINGLE, size: 8, color: 'F59E0B' },
      right:  { style: BorderStyle.SINGLE, size: 8, color: 'F59E0B' },
      insideH: noBorder, insideV: noBorder,
    },
    rows: [new TableRow({ children: [new TableCell({
      shading: { fill: 'FFFBEB', type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 180, right: 180 },
      width: { size: CONTENT, type: WidthType.DXA },
      borders: noBorders,
      children: [
        p([run(title, { font: 'Arial', size: 10, bold: true, color: AMBER })], { after: 80 }),
        ...lines.map(l => p([run(l, { font: 'Arial', size: 10, color: '78350F' })], { after: 60 })),
      ],
    })]})],
  })
}

// Signature line as a single-cell table with bottom border
function sigLine(label, wide = false) {
  const half = Math.floor(CONTENT * 0.47)
  const gap  = CONTENT - half * 2
  const cols  = wide ? [CONTENT] : [half, gap, half]
  const cells = wide
    ? [sigCell(CONTENT)]
    : [sigCell(half), blankCell(gap), sigCell(half)]

  return [
    new Table({ width: { size: CONTENT, type: WidthType.DXA }, columnWidths: cols, borders: noBorders, rows: [new TableRow({ children: cells })] }),
    ...(wide
      ? [p([run(label, { font: 'Arial', size: 9, color: GRAY })], { before: 40, after: 160 })]
      : []),
  ]
}

function sigCell(w) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders: { ...noBorders, bottom: { style: BorderStyle.SINGLE, size: 4, color: '555555' } },
    margins: { top: 240, bottom: 40, left: 0, right: 0 },
    children: [p('', { after: 0 })],
  })
}

function blankCell(w) {
  return new TableCell({ width: { size: w, type: WidthType.DXA }, borders: noBorders, children: [p('')] })
}

function twoCaption(left, right) {
  return new Paragraph({
    spacing: { before: 40, after: 160 },
    tabStops: [{ type: 'left', position: Math.floor(CONTENT / 2) + 80 }],
    children: [
      run(left,  { font: 'Arial', size: 9, color: GRAY }),
      ...(right ? [new TextRun({ text: '\t' + right, font: 'Arial', size: PT(9), color: GRAY })] : []),
    ],
  })
}

// ── Contract body renderer ────────────────────────────────────────────
function renderContractBody(text, coName) {
  const resolved = text.replace(/PROLINE RESIDENTIAL LLC/g, coName || 'YOUR COMPANY LLC')
  const lines = resolved.split('\n')
  const paras = []
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith('━')) continue  // section dividers — replaced by h2 above line
    if (!line.trim()) { paras.push(empty(60)); continue }

    // All-caps section headers
    const isAllCaps = line === line.toUpperCase() && line.trim().length > 4
      && /^[A-Z0-9 ─—–&./,():]+$/.test(line.trim())
      && !line.trim().startsWith('⚠')
      && !line.includes('[')
    if (isAllCaps) { paras.push(h2(line.trim())); continue }

    // Article headers like "ARTICLE 3 — CONTRACT PRICE..."
    if (/^ARTICLE \d|^SECTION \d/.test(line)) { paras.push(h2(line.trim())); continue }

    const isWarning = line.trim().startsWith('⚠')
    const isBold = isWarning || /^\d+\.\d+ [A-Z]/.test(line)  // like "3.1 PAYMENT..."
    paras.push(p([run(line, { serif: true, size: 11, bold: isBold })], { after: isWarning ? 140 : 80 }))
  }
  return paras
}

// ── Company header block ──────────────────────────────────────────────
function companyHeader(coName, coPhone, coEmail, state) {
  return [
    new Paragraph({
      spacing: { before: 0, after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 14, color: NAVY } },
      children: [run(coName || 'YOUR COMPANY', { font: 'Arial', size: 18, bold: true, color: NAVY })],
    }),
    p([
      ...(coPhone ? [run(coPhone + '  ·  ', { font: 'Arial', size: 10, color: GRAY })] : []),
      ...(coEmail ? [run(coEmail + '  ·  ', { font: 'Arial', size: 10, color: GRAY })] : []),
      run(state || 'SC', { font: 'Arial', size: 10, color: GRAY }),
    ], { before: 80, after: 200 }),
  ]
}

// ── Main export ───────────────────────────────────────────────────────
export async function generateAndDownloadPacket(contractTemplate, settings) {
  const tpl = contractTemplate || {}
  const co  = settings || {}
  const cd  = co.contractDefaults || {}

  const coName  = co.coName   || 'YOUR COMPANY LLC'
  const coPhone = co.coPhone  || ''
  const coEmail = co.coEmail  || ''
  const state   = co.primaryState || 'SC'
  const today   = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const payMethods = Object.entries(co.paymentConfig || {})
    .filter(([, v]) => v?.enabled).map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)).join(', ') || 'Check, Zelle, ACH'

  const firstScope  = tpl.scopeTemplates?.[0]?.scope || ''
  const scopeBoiler = tpl.scopeBoilerplate || ''
  const sampleScope = [scopeBoiler, firstScope].filter(Boolean).join('\n\n')
    || '[Contractor will furnish all labor, materials, and equipment necessary to complete the Work in a workmanlike manner per applicable codes.]'

  const firstMaint = tpl.maintenanceTemplates?.[0]
  const maintText  = firstMaint
    ? (Array.isArray(firstMaint.requirements) ? firstMaint.requirements.join('\n\n') : (firstMaint.requirements || ''))
    : 'Customer shall maintain the Work per industry-standard practices for the materials installed.'

  const shared = {
    contractNum: 'CON-XXXX', estimateNum: 'EST-XXXX',
    customerName: '[CUSTOMER FULL LEGAL NAME]', coCustomerName: '',
    customerAddress: '[CUSTOMER ADDRESS]', customerPhone: '[CUSTOMER PHONE]', customerEmail: '[CUSTOMER EMAIL]',
    projectAddress: '[PROJECT SITE ADDRESS]',
    workType: tpl.tradeLabel || tpl.trade || co.jobTypes?.[0] || 'Residential Improvement',
    scope: sampleScope, price: 0, deposit: 0, depositAmount: 0,
    paymentVersion: 'A', startDate: '', estimatedCompletion: '[To be mutually agreed upon at scheduling]',
    durationDays: 'X', warrantyYears: 5, maintenanceItems: maintText, paymentMethods: payMethods,
    lateFee: cd.lateFee || 1.5, adminFee: cd.adminFee || 75, responseDays: cd.coResponseDays || 5,
    disputeMethod: cd.disputeMethod || 'mediation_arbitration', includePermits: false, includeHOA: false,
    curePeriod: cd.curePeriod || 10, insurancePerOccurrence: '1,000,000', insuranceAggregate: '2,000,000',
    projectState: state, lienDays: cd.lienDays || 90, milestones: [], expiryDate: '', exclusions: '',
    finalPaymentAmount: 0, notes: '', originalContractNum: 'CON-XXXX', coNum: 'CO-XXXX',
    description: '[Change order description]', conditionDescription: '[Condition discovered during work]',
    correctiveWork: '[Required corrective work]',
    consequences: '[Work cannot proceed without correction. All prior payments non-refundable.]',
    warrantyImpactDescription: '[No warranty on affected portion if declined]',
    coAmount: 0, materialsDeposit: 0, scheduleImpact: false, scheduleDays: 0,
    newCompletion: '', totalPaidToDate: 0, originalContractPrice: 0,
    lifeSafety: true, structural: false, codeViolation: false,
    permitFeesIncluded: false, contractorPullsPermits: false,
  }

  // Inject AI CO scenarios
  if (tpl.commonChangeOrders?.length) {
    const co02  = tpl.commonChangeOrders.find(c => c.type === 'customer')
    const co03a = tpl.commonChangeOrders.find(c => c.type === 'required_a')
    const co03b = tpl.commonChangeOrders.find(c => c.type === 'required_b')
    if (co02)  shared.description         = co02.descriptionTemplate  || shared.description
    if (co03a) { shared.conditionDescription = co03a.conditionTemplate || shared.conditionDescription; shared.correctiveWork = co03a.correctiveTemplate || shared.correctiveWork; shared.consequences = co03a.consequenceTemplate || shared.consequences }
    if (co03b) { shared.conditionDescription = co03b.conditionTemplate || shared.conditionDescription; shared.correctiveWork = co03b.correctiveTemplate || shared.correctiveWork; shared.warrantyImpactDescription = co03b.warrantyImpactTemplate || shared.warrantyImpactDescription }
  }

  const docs = [
    { num: 1, n: 8, title: 'Estimate / Proposal', sub: 'Sent to customer before a contract is signed.', text: generateEstimateText({ ...shared, scope: firstScope || sampleScope }, co) },
    { num: 2, n: 8, title: 'Residential Construction Contract — Version A', sub: 'Payment: Materials deposit + full balance at completion.', text: generateContractText({ ...shared, paymentVersion: 'A' }, co) },
    { num: 3, n: 8, title: 'Residential Construction Contract — Version B', sub: 'Payment: Materials deposit + weekly labor draws.', text: generateContractText({ ...shared, paymentVersion: 'B' }, co) },
    { num: 4, n: 8, title: 'Residential Construction Contract — Version C', sub: 'Payment: Materials deposit + milestone-based draws.', text: generateContractText({ ...shared, paymentVersion: 'C', milestones: [{ description: '[Milestone 1 — e.g., demolition and prep]', amount: 0 }, { description: '[Milestone 2 — e.g., installation complete]', amount: 0 }] }, co) },
    { num: 5, n: 8, title: 'Change Order — Customer Requested (CO-02)', sub: 'Issued when a customer requests additional scope.', text: generateCO02Text(shared) },
    { num: 6, n: 8, title: 'Required Change Order — Life/Safety/Code (CO-03A)', sub: 'Issued when a field condition prevents safe continuation.', text: generateCO03AText(shared) },
    { num: 7, n: 8, title: 'Required Change Order — Warranty Impact (CO-03B)', sub: 'Issued when a field condition voids warranty if uncorrected.', text: generateCO03BText(shared) },
    { num: 8, n: 8, title: 'Final Unconditional Lien Waiver', sub: 'Issued after all invoices are paid in full.', text: generateLienWaiverText(shared, co) },
  ]

  // ── Build document sections ─────────────────────────────────────────
  const allChildren = []

  // Cover page
  allChildren.push(
    p('', { after: 720 }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [run(coName.toUpperCase(), { font: 'Arial', size: 24, bold: true, color: NAVY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 480 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: NAVY } },
      children: [run('Attorney Review Document Packet', { font: 'Arial', size: 16, color: GRAY })],
    }),
    empty(200),
    ...[['Company', coName], ['Primary State', state], ['Trade', tpl.tradeLabel || tpl.trade || '—'], ['Generated', today], ['Status', 'Confidential — Not for execution']].map(([k, v]) =>
      new Paragraph({
        spacing: { before: 0, after: 80 },
        tabStops: [{ type: 'left', position: 2160 }],
        children: [run(k + ':', { font: 'Arial', size: 10, bold: true, color: GRAY }), new TextRun({ text: '\t' + v, font: 'Arial', size: PT(10) })],
      })
    ),
    empty(200),
    amberBox('⚖ Purpose of this packet', [
      'This packet contains every document customers and this company are asked to sign during a job.',
      'AI-generated trade-specific language is integrated into each document where it actually appears.',
      'The attorney reviews complete documents — not just AI additions in isolation.',
    ]),
    empty(240),
    h2('Documents included in this packet'),
    ...[
      ['1', 'Estimate / Proposal', 'Sent to customer before a contract is signed'],
      ['2', 'Contract — Version A', 'Materials deposit + balance at completion'],
      ['3', 'Contract — Version B', 'Materials deposit + weekly labor draws'],
      ['4', 'Contract — Version C', 'Materials deposit + milestone draws'],
      ['5', 'Change Order CO-02', 'Customer-requested scope change'],
      ['6', 'Change Order CO-03A', 'Required — Life/Safety/Code'],
      ['7', 'Change Order CO-03B', 'Required — Warranty impact'],
      ['8', 'Final Lien Waiver', 'Issued after all invoices paid in full'],
    ].map(([num, name, desc]) =>
      p([
        run(`${num}.  `, { font: 'Arial', size: 11, bold: true, color: NAVY }),
        run(name + '  ', { font: 'Arial', size: 11, bold: true }),
        run('— ' + desc, { font: 'Arial', size: 10, color: GRAY }),
      ], { after: 80 })
    ),
  )

  // Each document
  for (const doc of docs) {
    allChildren.push(
      pg(),
      // Document label bar
      new Paragraph({
        spacing: { before: 0, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' } },
        children: [
          run(`DOCUMENT ${doc.num} OF ${doc.n}  `, { font: 'Arial', size: 8, bold: true, color: AMBER, caps: true }),
          run('ATTORNEY REVIEW DRAFT — NOT FOR EXECUTION', { font: 'Arial', size: 8, color: AMBER }),
        ],
      }),
      p([run(doc.title, { font: 'Arial', size: 15, bold: true, color: NAVY })], { before: 120, after: 40 }),
      p([run(doc.sub, { font: 'Arial', size: 10, color: GRAY, italic: true })], { before: 0, after: 200 }),
      // Company header
      ...companyHeader(coName, coPhone, coEmail, state),
      // Contract body
      ...renderContractBody(doc.text, coName),
    )
  }

  // Authorization page
  allChildren.push(
    pg(),
    new Paragraph({
      spacing: { before: 0, after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 14, color: NAVY } },
      children: [run('Attorney Authorization Page', { font: 'Arial', size: 18, bold: true, color: NAVY })],
    }),
    p([run(`${coName}  ·  Generated ${today}  ·  Complete ONE option below and return this page.`, { font: 'Arial', size: 10, color: GRAY })], { before: 80, after: 200 }),
    p([run('The undersigned has reviewed the complete document packet above, including all 8 documents and all AI-generated trade-specific language. Complete Option A if reviewed by a licensed attorney, or Option B to self-authorize use without attorney review.', { serif: true, size: 11 })], { before: 0, after: 160 }),
    empty(60),
    // Option A
    amberBox('✅ OPTION A — Attorney Reviewed and Approved', [
      'By signing below, the undersigned licensed attorney confirms they have reviewed the complete packet and that in their professional judgment all language is legally sufficient for use in the state(s) indicated.',
    ]),
    empty(120),
    ...sigLine('', false), twoCaption('Attorney signature', 'Date reviewed'),
    ...sigLine('', false), twoCaption('Printed name', 'Bar number'),
    ...sigLine('law firm', true), // wide
    p([run('Law firm / practice name', { font: 'Arial', size: 9, color: GRAY })], { before: 40, after: 120 }),
    ...sigLine('states', true),
    p([run('State(s) in which these documents are approved for use', { font: 'Arial', size: 9, color: GRAY })], { before: 40, after: 120 }),
    ...sigLine('conditions', true),
    p([run('Conditions or required modifications (attach addendum if needed)', { font: 'Arial', size: 9, color: GRAY })], { before: 40, after: 240 }),
    // Option B
    amberBox('⚠ OPTION B — Self-Authorization Without Attorney Review', [
      'LEGAL DISCLAIMER — READ CAREFULLY:',
      '(1) I have NOT had these documents reviewed by a licensed attorney.',
      '(2) I am using these documents entirely at my own risk.',
      '(3) These documents contain AI-generated language not independently verified for legal sufficiency.',
      '(4) Proline Field OS bears NO liability for any legal outcome from use of these documents.',
      '(5) I release and hold harmless Proline Field OS from any claim arising from use without attorney review.',
      '(6) I strongly acknowledge I should consult a licensed attorney before using these with customers.',
    ]),
    empty(120),
    ...sigLine('', false), twoCaption('Account owner signature', 'Date'),
    ...sigLine('name', true),
    p([run('Printed full legal name', { font: 'Arial', size: 9, color: GRAY })], { before: 40, after: 120 }),
    ...sigLine('company', true),
    p([run('Company name', { font: 'Arial', size: 9, color: GRAY })], { before: 40, after: 240 }),
    // Footer
    empty(200),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' } },
      spacing: { before: 0, after: 0 },
      children: [run(`ATTORNEY REVIEW PACKET  ·  ${coName.toUpperCase()}  ·  ${today.toUpperCase()}  ·  CONFIDENTIAL`, { font: 'Arial', size: 8, color: GRAY, caps: true })],
    }),
  )

  // ── Assemble and download ─────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Times New Roman', size: PT(11) } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: PT(16), bold: true, font: 'Arial', color: NAVY },
          paragraph: { spacing: { before: 280, after: 100 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: PT(10), bold: true, font: 'Arial', color: NAVY },
          paragraph: { spacing: { before: 200, after: 60 }, outlineLevel: 1 } },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      headers: {
        default: new Header({ children: [
          new Paragraph({
            spacing: { before: 0, after: 80 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' } },
            children: [
              run(coName + '  ·  Attorney Review Packet', { font: 'Arial', size: 9, bold: true, color: NAVY }),
              run('  ·  Confidential', { font: 'Arial', size: 9, color: GRAY }),
            ],
          }),
        ]}),
      },
      footers: {
        default: new Footer({ children: [
          new Paragraph({
            spacing: { before: 80, after: 0 },
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' } },
            tabStops: [{ type: 'right', position: CONTENT }],
            children: [
              run('DRAFT — NOT FOR EXECUTION', { font: 'Arial', size: 8, color: AMBER }),
              new TextRun({ text: '\tPage ', font: 'Arial', size: PT(9), color: GRAY }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: PT(9), color: GRAY }),
            ],
          }),
        ]}),
      },
      children: allChildren,
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${coName.replace(/[^a-zA-Z0-9]/g, '_')}_Attorney_Review_Packet.docx`
  a.click()
  URL.revokeObjectURL(url)
}
