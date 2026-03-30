// All merge fields available in document templates
// Format in document: {{field_key}}

export const MERGE_FIELDS = [
  // ── Company ──────────────────────────────────────────────────
  { key: 'company_name',    label: 'Company name',      group: 'Company',  sample: 'Proline Residential Services LLC' },
  { key: 'company_phone',   label: 'Company phone',     group: 'Company',  sample: '(864) 559-8664' },
  { key: 'company_email',   label: 'Company email',     group: 'Company',  sample: 'ProlineResidential@gmail.com' },
  { key: 'company_license', label: 'License number',    group: 'Company',  sample: 'SC-GC-009241' },
  { key: 'company_state',   label: 'Primary state',     group: 'Company',  sample: 'South Carolina' },

  // ── Customer ─────────────────────────────────────────────────
  { key: 'client_name',     label: 'Customer name',     group: 'Customer', sample: 'John & Jane Smith' },
  { key: 'client_address',  label: 'Customer address',  group: 'Customer', sample: '412 Oak Ridge Dr, Greenville SC 29607' },
  { key: 'client_phone',    label: 'Customer phone',    group: 'Customer', sample: '(864) 555-0142' },
  { key: 'client_email',    label: 'Customer email',    group: 'Customer', sample: 'john@email.com' },

  // ── Project ──────────────────────────────────────────────────
  { key: 'project_address', label: 'Project address',   group: 'Project',  sample: '412 Oak Ridge Dr, Greenville SC 29607' },
  { key: 'project_state',   label: 'Project state',     group: 'Project',  sample: 'South Carolina' },
  { key: 'work_type',       label: 'Work type',         group: 'Project',  sample: 'Gutter Installation' },
  { key: 'start_date',      label: 'Start date',        group: 'Project',  sample: 'April 15, 2026' },

  // ── Contract ─────────────────────────────────────────────────
  { key: 'contract_number', label: 'Contract number',   group: 'Contract', sample: 'CON-1001' },
  { key: 'contract_date',   label: 'Contract date',     group: 'Contract', sample: 'April 1, 2026' },
  { key: 'contract_value',  label: 'Contract total',    group: 'Contract', sample: '$4,800.00' },
  { key: 'deposit_amount',  label: 'Deposit amount',    group: 'Contract', sample: '$1,200.00' },
  { key: 'balance_amount',  label: 'Balance due',       group: 'Contract', sample: '$3,600.00' },
  { key: 'warranty_years',  label: 'Warranty years',    group: 'Contract', sample: '5' },
  { key: 'scope_of_work',   label: 'Scope of work',     group: 'Contract', sample: '[Scope of work as described in estimate]' },
  { key: 'payment_terms',   label: 'Payment terms',     group: 'Contract', sample: 'Materials deposit + balance at completion' },
  { key: 'late_fee',        label: 'Late fee %',        group: 'Contract', sample: '1.5' },
  { key: 'cure_period',     label: 'Right-to-cure days',group: 'Contract', sample: '10' },
  { key: 'lien_days',       label: 'Lien filing days',  group: 'Contract', sample: '90' },
  { key: 'admin_fee',       label: 'CO admin fee',      group: 'Contract', sample: '$75.00' },

  // ── Estimate ─────────────────────────────────────────────────
  { key: 'estimate_number', label: 'Estimate number',   group: 'Estimate', sample: 'EST-1001' },
  { key: 'estimate_date',   label: 'Estimate date',     group: 'Estimate', sample: 'April 1, 2026' },
  { key: 'estimate_total',  label: 'Estimate total',    group: 'Estimate', sample: '$4,800.00' },
  { key: 'expiry_date',     label: 'Estimate expires',  group: 'Estimate', sample: 'May 1, 2026' },

  // ── Change Order ─────────────────────────────────────────────
  { key: 'co_number',       label: 'CO number',         group: 'Change Order', sample: 'CO-1001' },
  { key: 'co_date',         label: 'CO date',           group: 'Change Order', sample: 'April 1, 2026' },
  { key: 'co_amount',       label: 'CO amount',         group: 'Change Order', sample: '$500.00' },
  { key: 'co_description',  label: 'CO description',    group: 'Change Order', sample: '[Description of change]' },
  { key: 'co_deposit',      label: 'CO deposit',        group: 'Change Order', sample: '$200.00' },
  { key: 'original_price',  label: 'Original contract price', group: 'Change Order', sample: '$4,800.00' },
  { key: 'revised_price',   label: 'Revised contract price',  group: 'Change Order', sample: '$5,300.00' },
  { key: 'response_days',   label: 'Response deadline days',  group: 'Change Order', sample: '5' },

  // ── Lien Waiver ──────────────────────────────────────────────
  { key: 'final_payment',   label: 'Final payment amount', group: 'Lien Waiver', sample: '$4,800.00' },
]

export const FIELD_GROUPS = [...new Set(MERGE_FIELDS.map(f => f.group))]

// Build a sample data object for previewing a template
export function buildSampleData(settings = {}) {
  return {
    company_name:    settings.coName    || 'Proline Residential Services LLC',
    company_phone:   settings.coPhone   || '(864) 559-8664',
    company_email:   settings.coEmail   || 'ProlineResidential@gmail.com',
    company_license: settings.license   || '',
    company_state:   'South Carolina',
    client_name:     'John & Jane Smith',
    client_address:  '412 Oak Ridge Dr, Greenville SC 29607',
    client_phone:    '(864) 555-0142',
    client_email:    'john@email.com',
    project_address: '412 Oak Ridge Dr, Greenville SC 29607',
    project_state:   'South Carolina',
    work_type:       'Gutter Installation',
    start_date:      'April 15, 2026',
    contract_number: 'CON-1001',
    contract_date:   new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}),
    contract_value:  '$4,800.00',
    deposit_amount:  '$1,200.00',
    balance_amount:  '$3,600.00',
    warranty_years:  '5',
    scope_of_work:   '[Install 120 LF of 6-inch seamless aluminum gutters in Musket Brown with 6 downspouts]',
    payment_terms:   'Materials deposit + balance at completion',
    late_fee:        String(settings.contractDefaults?.lateFee || 1.5),
    cure_period:     String(settings.contractDefaults?.curePeriod || 10),
    lien_days:       String(settings.contractDefaults?.lienDays || 90),
    admin_fee:       '$' + (settings.contractDefaults?.adminFee || 75) + '.00',
    estimate_number: 'EST-1001',
    estimate_date:   new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}),
    estimate_total:  '$4,800.00',
    expiry_date:     new Date(Date.now()+30*86400000).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}),
    co_number:       'CO-1001',
    co_date:         new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}),
    co_amount:       '$500.00',
    co_description:  '[Customer requested 4 additional downspout extensions]',
    co_deposit:      '$200.00',
    original_price:  '$4,800.00',
    revised_price:   '$5,300.00',
    response_days:   String(settings.contractDefaults?.coResponseDays || 5),
    final_payment:   '$4,800.00',
  }
}

// Build real merge data from job + contract data
export function buildMergeData(job, docData, settings = {}) {
  const fmtM = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0)
  const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : ''
  const cd = settings.contractDefaults || {}
  return {
    company_name:    settings.coName    || '',
    company_phone:   settings.coPhone   || '',
    company_email:   settings.coEmail   || '',
    company_license: settings.license   || '',
    company_state:   {SC:'South Carolina',NC:'North Carolina',GA:'Georgia',TN:'Tennessee',VA:'Virginia'}[settings.primaryState||'SC'] || '',
    client_name:     job?.client        || docData?.customerName || '',
    client_address:  job?.address       || docData?.customerAddress || '',
    client_phone:    job?.phone         || docData?.customerPhone || '',
    client_email:    job?.email         || docData?.customerEmail || '',
    project_address: job?.address       || docData?.projectAddress || '',
    project_state:   {SC:'South Carolina',NC:'North Carolina',GA:'Georgia',TN:'Tennessee',VA:'Virginia'}[job?.state||docData?.projectState||'SC'] || '',
    work_type:       job?.type          || docData?.workType || '',
    start_date:      fmtD(job?.startDate || docData?.startDate),
    contract_number: docData?.contractNum || docData?.num || '',
    contract_date:   new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}),
    contract_value:  fmtM(docData?.price || job?.contractValue),
    deposit_amount:  fmtM(docData?.deposit),
    balance_amount:  fmtM((docData?.price||0)-(docData?.deposit||0)),
    warranty_years:  String(docData?.warrantyYears || 5),
    scope_of_work:   docData?.scope || '',
    payment_terms:   docData?.paymentVersion==='A' ? 'Materials deposit + balance at completion'
                   : docData?.paymentVersion==='B' ? 'Materials deposit + weekly labor draws'
                   : 'Materials deposit + milestone draws',
    late_fee:        String(docData?.lateFee || cd.lateFee || 1.5),
    cure_period:     String(docData?.curePeriod || cd.curePeriod || 10),
    lien_days:       String(docData?.lienDays || cd.lienDays || 90),
    admin_fee:       fmtM(docData?.adminFee || cd.adminFee || 75),
    estimate_number: docData?.estimateNum || docData?.num || '',
    estimate_date:   new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}),
    estimate_total:  fmtM(docData?.price),
    expiry_date:     fmtD(docData?.expiryDate),
    co_number:       docData?.coNum || docData?.num || '',
    co_date:         new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}),
    co_amount:       fmtM(docData?.coAmount || docData?.amount),
    co_description:  docData?.description || '',
    co_deposit:      fmtM(docData?.materialsDeposit),
    original_price:  fmtM(docData?.originalContractPrice),
    revised_price:   fmtM((docData?.originalContractPrice||0)+(docData?.coAmount||0)),
    response_days:   String(docData?.responseDays || cd.coResponseDays || 5),
    final_payment:   fmtM(docData?.finalPaymentAmount),
  }
}

// Apply merge fields to template text
export function applyMergeFields(templateText, data) {
  return templateText.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match
  })
}
