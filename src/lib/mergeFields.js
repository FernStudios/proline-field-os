// mergeFields.js — Custom template merge field system
// Defines all available merge fields and their descriptions for the UI
// Performs text replacement in uploaded template content

export const MERGE_FIELDS = [
  // Company fields
  { field: '{{company_name}}',       label: 'Company name',              group: 'Company',  example: 'Proline Residential Services LLC' },
  { field: '{{company_phone}}',      label: 'Company phone',             group: 'Company',  example: '(864) 559-8664' },
  { field: '{{company_email}}',      label: 'Company email',             group: 'Company',  example: 'ProlineResidential@Gmail.com' },
  { field: '{{company_license}}',    label: 'License number',            group: 'Company',  example: 'SC-GC-009241' },
  { field: '{{company_state}}',      label: 'Primary state',             group: 'Company',  example: 'SC' },
  // Contract fields
  { field: '{{contract_number}}',    label: 'Contract number',           group: 'Contract', example: 'CON-1001' },
  { field: '{{contract_date}}',      label: 'Contract date',             group: 'Contract', example: 'March 29, 2026' },
  { field: '{{contract_value}}',     label: 'Contract value ($)',        group: 'Contract', example: '$4,800.00' },
  { field: '{{deposit_amount}}',     label: 'Deposit amount ($)',        group: 'Contract', example: '$1,200.00' },
  { field: '{{balance_due}}',        label: 'Balance due ($)',           group: 'Contract', example: '$3,600.00' },
  { field: '{{payment_version}}',    label: 'Payment structure',         group: 'Contract', example: 'Deposit + balance at completion' },
  { field: '{{warranty_years}}',     label: 'Warranty years',            group: 'Contract', example: '5' },
  { field: '{{work_type}}',          label: 'Work type',                 group: 'Contract', example: 'Gutter Installation' },
  { field: '{{start_date}}',         label: 'Start date',                group: 'Contract', example: 'April 1, 2026' },
  // Customer fields
  { field: '{{customer_name}}',      label: 'Customer full name',        group: 'Customer', example: 'John and Jane Henderson' },
  { field: '{{customer_address}}',   label: 'Customer address',          group: 'Customer', example: '412 Oak Ridge Dr, Greenville SC 29607' },
  { field: '{{customer_phone}}',     label: 'Customer phone',            group: 'Customer', example: '(864) 555-0142' },
  { field: '{{customer_email}}',     label: 'Customer email',            group: 'Customer', example: 'henderson@email.com' },
  // Project fields
  { field: '{{project_address}}',    label: 'Project site address',      group: 'Project',  example: '412 Oak Ridge Dr, Greenville SC 29607' },
  { field: '{{project_state}}',      label: 'Project state',             group: 'Project',  example: 'SC' },
  { field: '{{scope_of_work}}',      label: 'Scope of work',             group: 'Project',  example: 'Install 120 LF of 6-inch seamless aluminum gutters...' },
  // Legal fields  
  { field: '{{late_fee_pct}}',       label: 'Late fee % per month',      group: 'Legal',    example: '1.5' },
  { field: '{{admin_fee}}',          label: 'CO admin fee ($)',          group: 'Legal',     example: '$75.00' },
  { field: '{{cure_period_days}}',   label: 'Right-to-cure days',        group: 'Legal',     example: '10' },
  { field: '{{co_response_days}}',   label: 'CO response deadline',      group: 'Legal',     example: '5' },
  { field: '{{governing_state}}',    label: 'Governing state (full)',    group: 'Legal',      example: 'South Carolina' },
  { field: '{{today}}',              label: 'Today\'s date',             group: 'Other',     example: 'March 29, 2026' },
]

export const MERGE_GROUPS = [...new Set(MERGE_FIELDS.map(f => f.group))]

// Build merge values from job + settings data
export function buildMergeValues(job, contract, settings) {
  const cd = settings?.contractDefaults || {}
  const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''
  const fmtM = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
  const STATES = { SC: 'South Carolina', NC: 'North Carolina', GA: 'Georgia', TN: 'Tennessee', VA: 'Virginia' }
  const pvLabels = { deposit_completion: 'Materials deposit + balance at completion', deposit_draws: 'Materials deposit + weekly labor draws', deposit_milestone: 'Materials deposit + milestone draws' }

  const deposit = contract?.wizardData?.deposit || 0
  const price   = contract?.wizardData?.price || job?.contractValue || 0

  return {
    '{{company_name}}':     settings?.coName    || '',
    '{{company_phone}}':    settings?.coPhone   || '',
    '{{company_email}}':    settings?.coEmail   || '',
    '{{company_license}}':  settings?.license   || '',
    '{{company_state}}':    settings?.primaryState || 'SC',
    '{{contract_number}}':  contract?.num       || '',
    '{{contract_date}}':    fmtDate(contract?.created?.split('T')[0]) || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    '{{contract_value}}':   fmtM(price),
    '{{deposit_amount}}':   fmtM(deposit),
    '{{balance_due}}':      fmtM(price - deposit),
    '{{payment_version}}':  pvLabels[contract?.wizardData?.paymentVersion] || pvLabels[cd.defaultPayment] || 'Materials deposit + balance at completion',
    '{{warranty_years}}':   String(contract?.wizardData?.warrantyYears || 5),
    '{{work_type}}':        job?.type           || '',
    '{{start_date}}':       fmtDate(job?.startDate),
    '{{customer_name}}':    job?.client         || '',
    '{{customer_address}}': job?.address        || '',
    '{{customer_phone}}':   job?.phone          || '',
    '{{customer_email}}':   job?.email          || '',
    '{{project_address}}':  job?.address        || '',
    '{{project_state}}':    job?.state          || settings?.primaryState || 'SC',
    '{{scope_of_work}}':    contract?.wizardData?.scope || '',
    '{{late_fee_pct}}':     String(cd.lateFee || 1.5),
    '{{admin_fee}}':        fmtM(cd.adminFee || 75),
    '{{cure_period_days}}': String(cd.curePeriod || 10),
    '{{co_response_days}}': String(cd.coResponseDays || 5),
    '{{governing_state}}':  STATES[job?.state || settings?.primaryState || 'SC'] || 'South Carolina',
    '{{today}}':            new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  }
}

// Apply merge values to a text string
export function applyMergeFields(text, mergeValues) {
  let result = text
  for (const [field, value] of Object.entries(mergeValues)) {
    result = result.replaceAll(field, value || '')
  }
  return result
}
