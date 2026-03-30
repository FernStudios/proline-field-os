// db.js — Relational write helpers (Phase A: parallel writes)
// Every write goes to BOTH the Zustand blob sync AND these individual table writes.
// Reads still come from Zustand (blob). Phase B flips reads to these tables.
// All functions are fire-and-forget — they do not block the UI.

import { supabase } from './supabase'

// ── Account bootstrap ────────────────────────────────────────────────────────
// Call once on login. Creates account, member, settings, counters rows if needed.
// Returns the account_id for this user.
export async function bootstrapAccount(userId, email = '', name = '') {
  if (!supabase || !userId) return null
  try {
    const { data, error } = await supabase.rpc('bootstrap_account', {
      p_user_id: userId,
      p_email: email,
      p_name: name,
    })
    if (error) { console.warn('bootstrap_account error:', error.message); return null }
    return data  // uuid
  } catch (e) {
    console.warn('bootstrapAccount:', e.message)
    return null
  }
}

// ── Resolve account_id for the current user ───────────────────────────────────
// Cached in module scope after first call — never changes within a session.
let _accountId = null
export async function getAccountId(userId) {
  if (_accountId) return _accountId
  if (!supabase || !userId) return null
  try {
    const { data } = await supabase
      .from('account_members')
      .select('account_id')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single()
    _accountId = data?.account_id || null
    return _accountId
  } catch { return null }
}
export function clearAccountIdCache() { _accountId = null }

// ── Helper: fire-and-forget upsert ───────────────────────────────────────────
async function upsert(table, row, conflict = 'id') {
  if (!supabase) return
  const { error } = await supabase.from(table).upsert(row, { onConflict: conflict })
  if (error) console.warn(`db.upsert(${table}):`, error.message)
}

async function remove(table, id) {
  if (!supabase) return
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) console.warn(`db.remove(${table}):`, error.message)
}

// ── Settings ────────────────────────────────────────────────────────────────
export async function writeSettings(accountId, settings) {
  if (!accountId) return
  await upsert('settings', {
    account_id:       accountId,
    co_name:          settings.coName           || '',
    co_phone:         settings.coPhone          || '',
    co_email:         settings.coEmail          || '',
    co_city:          settings.coCity           || '',
    license:          settings.license          || '',
    primary_state:    settings.primaryState     || 'SC',
    tagline:          settings.tagline          || '',
    contract_defaults: settings.contractDefaults || {},
    payment_config:   settings.paymentConfig    || {},
    job_types:        settings.jobTypes         || [],
    admin_settings:   settings.adminSettings    || {},
    role_permissions: settings.rolePermissions  || {},
    updated_at:       new Date().toISOString(),
  }, 'account_id')
}

// ── Jobs ────────────────────────────────────────────────────────────────────
export async function writeJob(accountId, job) {
  if (!accountId || !job?.id) return
  await upsert('jobs', {
    id:             job.id,
    account_id:     accountId,
    client:         job.client         || '',
    address:        job.address        || '',
    phone:          job.phone          || '',
    email:          job.email          || '',
    type:           job.type           || '',
    state:          job.state          || 'SC',
    contract_value: job.contractValue  || 0,
    kb_status:      job.kbStatus       || 'new_lead',
    prev_kb_status: job.prevKbStatus   || null,
    status:         job.status         || 'active',
    portal_token:   job.portalToken    || null,
    start_date:     job.startDate      || null,
    end_date:       job.endDate        || null,
    notes:          job.notes          || '',
    tasks:          job.tasks          || [],
    comm_log:       job.commLog        || [],
    materials:      job.materials      || [],
    assigned_crew:  job.assignedCrew   || [],
    updated_at:     new Date().toISOString(),
  })
}
export async function deleteJob(id) { await remove('jobs', id) }

// ── Estimates ────────────────────────────────────────────────────────────────
export async function writeEstimate(accountId, est) {
  if (!accountId || !est?.id) return
  await upsert('estimates', {
    id:             est.id,
    account_id:     accountId,
    job_id:         est.jobId         || null,
    num:            est.num           || '',
    total:          est.total         || 0,
    deposit_amount: est.depositAmount || 0,
    scope_of_work:  est.scopeOfWork   || '',
    exclusions:     est.exclusions    || '',
    expiry_date:    est.expiryDate    || null,
    portal_token:   est.portalToken   || null,
    status:         est.status        || 'draft',
    attorney_ack:   est.attorneyAck   || null,
    document_text:  est.documentText  || '',
    generated_text: est.generatedText || '',
    project_state:  est.projectState  || null,
    updated_at:     new Date().toISOString(),
  })
}
export async function deleteEstimate(id) { await remove('estimates', id) }

// ── Contracts ────────────────────────────────────────────────────────────────
export async function writeContract(accountId, contract) {
  if (!accountId || !contract?.id) return
  await upsert('contracts', {
    id:                contract.id,
    account_id:        accountId,
    job_id:            contract.jobId          || null,
    num:               contract.num            || '',
    status:            contract.status         || 'draft',
    payment_version:   contract.paymentVersion || null,
    contract_value:    contract.contractValue  || 0,
    deposit_amount:    contract.depositAmount  || 0,
    warranty_years:    contract.warrantyYears  || 1,
    project_state:     contract.projectState   || null,
    attorney_ack:      contract.attorneyAck    || null,
    document_text:     contract.documentText   || '',
    generated_text:    contract.generatedText  || '',
    version_timestamp: contract.versionTimestamp || null,
    updated_at:        new Date().toISOString(),
  })
}
export async function deleteContract(id) { await remove('contracts', id) }

// ── Change Orders ────────────────────────────────────────────────────────────
export async function writeChangeOrder(accountId, co) {
  if (!accountId || !co?.id) return
  await upsert('change_orders', {
    id:                co.id,
    account_id:        accountId,
    job_id:            co.jobId         || null,
    num:               co.num           || '',
    co_type:           co.coType        || 'customer',
    status:            co.status        || 'pending',
    amount:            co.amount        || 0,
    deposit_amount:    co.depositAmount || 0,
    description:       co.description   || '',
    document_text:     co.documentText  || '',
    generated_text:    co.generatedText || '',
    attorney_ack:      co.attorneyAck   || null,
    version_timestamp: co.versionTimestamp || null,
    updated_at:        new Date().toISOString(),
  })
}
export async function deleteChangeOrder(id) { await remove('change_orders', id) }

// ── Invoices ────────────────────────────────────────────────────────────────
export async function writeInvoice(accountId, inv) {
  if (!accountId || !inv?.id) return
  await upsert('invoices', {
    id:          inv.id,
    account_id:  accountId,
    job_id:      inv.jobId      || null,
    num:         inv.num        || '',
    amount:      inv.amount     || 0,
    status:      inv.status     || 'unpaid',
    due_date:    inv.dueDate    || null,
    notes:       inv.notes      || '',
    client_name: inv.clientName || '',
    updated_at:  new Date().toISOString(),
  })
  // Write all payments for this invoice
  for (const p of (inv.payments || [])) {
    await writePayment(accountId, inv.id, p)
  }
}

// ── Payments ────────────────────────────────────────────────────────────────
export async function writePayment(accountId, invoiceId, payment) {
  if (!accountId || !invoiceId || !payment?.id) return
  await upsert('payments', {
    id:         payment.id,
    account_id: accountId,
    invoice_id: invoiceId,
    amount:     payment.amount || 0,
    method:     payment.method || 'Other',
    memo:       payment.memo   || '',
    paid_date:  payment.date   || null,
  })
}

// ── Expenses ────────────────────────────────────────────────────────────────
export async function writeExpense(accountId, exp) {
  if (!accountId || !exp?.id) return
  await upsert('expenses', {
    id:           exp.id,
    account_id:   accountId,
    job_id:       exp.jobId      || null,
    category:     exp.category   || 'Other',
    description:  exp.description || '',
    amount:       exp.amount     || 0,
    expense_date: exp.date       || null,
  })
}
export async function deleteExpense(id) { await remove('expenses', id) }

// ── Crew ────────────────────────────────────────────────────────────────────
export async function writeCrew(accountId, member) {
  if (!accountId || !member?.id) return
  await upsert('crew', {
    id:         member.id,
    account_id: accountId,
    name:       member.name     || '',
    role:       member.role     || 'crew',
    phone:      member.phone    || '',
    email:      member.email    || '',
    pay_type:   member.payType  || 'daily',
    pay_rate:   member.payRate  || 0,
    active:     member.active !== false,
  })
}
export async function deleteCrew(id) { await remove('crew', id) }

// ── Payroll Runs ─────────────────────────────────────────────────────────────
export async function writePayrollRun(accountId, run) {
  if (!accountId || !run?.id) return
  await upsert('payroll_runs', {
    id:          run.id,
    account_id:  accountId,
    run_date:    run.date        || new Date().toISOString().split('T')[0],
    total_labor: run.totalLabor  || 0,
    owner_draw:  run.ownerDraw   || 0,
    entries:     run.entries     || [],
    notes:       run.notes       || '',
  })
}

// ── Leads ────────────────────────────────────────────────────────────────────
export async function writeLead(accountId, lead) {
  if (!accountId || !lead?.id) return
  await upsert('leads', {
    id:                lead.id,
    account_id:        accountId,
    client:            lead.client       || '',
    phone:             lead.phone        || '',
    email:             lead.email        || '',
    address:           lead.address      || '',
    stage:             lead.stage        || 'new',
    source:            lead.source       || '',
    notes:             lead.notes        || '',
    follow_up_date:    lead.followUpDate || null,
    converted_job_id:  lead.convertedJobId || null,
    updated_at:        new Date().toISOString(),
  })
}
export async function deleteLead(id) { await remove('leads', id) }

// ── Custom Templates ─────────────────────────────────────────────────────────
export async function writeCustomTemplate(accountId, type, template) {
  if (!accountId || !type) return
  await upsert('custom_templates', {
    id:            template.id || type,
    account_id:    accountId,
    type,
    name:          template.name         || '',
    template_text: template.text         || '',
    file_name:     template.fileName     || '',
    active:        template.active       || false,
    updated_at:    new Date().toISOString(),
  }, 'account_id, type')
}
export async function deleteCustomTemplate(accountId, type) {
  if (!supabase || !accountId) return
  await supabase.from('custom_templates')
    .delete()
    .eq('account_id', accountId)
    .eq('type', type)
}

// ── Snapshots ────────────────────────────────────────────────────────────────
// Called from syncToSupabase to capture a point-in-time backup of the full blob.
// Cleanup of old snapshots (keep last 30) is handled by the DB function.
export async function writeSnapshot(accountId, blobData) {
  if (!supabase || !accountId) return
  const { error } = await supabase
    .from('snapshots')
    .insert({ account_id: accountId, snapshot: blobData })
  if (error) console.warn('writeSnapshot:', error.message)
  // Fire-and-forget cleanup (non-blocking)
  supabase.rpc('cleanup_old_snapshots').then(() => {}).catch(() => {})
}

// ── Audit Log ────────────────────────────────────────────────────────────────
export async function writeAuditEntry(accountId, action, description, jobId = null) {
  if (!supabase || !accountId) return
  await supabase.from('audit_log').insert({
    account_id:  accountId,
    job_id:      jobId || null,
    action,
    description,
  })
}
