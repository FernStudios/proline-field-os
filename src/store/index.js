import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { uid } from '../lib/utils'
import {
  bootstrapAccount, getAccountId, clearAccountIdCache,
  writeSettings, writeJob, deleteJob as dbDeleteJob,
  writeEstimate, deleteEstimate as dbDeleteEstimate,
  writeContract, deleteContract as dbDeleteContract,
  writeChangeOrder, deleteChangeOrder as dbDeleteChangeOrder,
  writeInvoice, writePayment,
  writeExpense, deleteExpense as dbDeleteExpense,
  writeCrew, deleteCrew as dbDeleteCrew,
  writePayrollRun, writeLead, deleteLead as dbDeleteLead,
  writeCustomTemplate, deleteCustomTemplate as dbDeleteCustomTemplate,
  writeSnapshot, writeAuditEntry,
} from '../lib/db'

const INITIAL_STATE = {
  jobs: [],
  contracts: [],
  changeOrders: [],
  invoices: [],
  expenses: [],
  crew: [],
  payrollRuns: [],
  contacts: [],
  leads: [],
  estimates: [],
  materials: [],
  audit: [],
  settings: {
    coName: '',
    coPhone: '',
    coEmail: '',
    coCity: '',
    license: '',
    primaryState: 'SC',
    tagline: '',
    brandColor: '#0a3ef8',
    contractDefaults: {
      lateFee: 1.5,
      curePeriod: 10,
      lienDays: 90,
      defaultPayment: 'deposit_completion',
      governingState: 'SC',
      disputeMethod: 'mediation_arbitration',
      adminFee: 75,
      coResponseDays: 5,
    },
    paymentConfig: {
      check: { enabled: true, handle: '' },
      zelle: { enabled: false, handle: '' },
      ach: { enabled: false, handle: '' },
      venmo: { enabled: false, handle: '' },
      cashapp: { enabled: false, handle: '' },
      paypal: { enabled: false, handle: '' },
    },
    jobTypes: [],
    adminSettings: { ownerName: '', ownerPayPct: 60, retainPct: 20 },
    brevo: '',
  },
  isDemoMode: false,
  viewAsRole: 'owner', // owner | office | foreman | crew | customer
  _hydrated: true,
  contractTemplate: null,
  contractTemplateMeta: null,
  templateGenerationCount: 0,
  _nextCon: 1001,
  _nextCO: 1001,
  _nextInv: 1001,
  _nextEst: 1001,
  schemaVersion: 2,
  _userId: null,      // set on login via setUserId()
  accountId: null,    // set after bootstrapAccount resolves
  rolePermissions: {
    // Owner always has full access — not stored here, always true
    office: {
      dashboard: true,
      jobs_view: true,
      jobs_edit: true,
      kanban: true,
      estimates: true,
      contracts: true,
      change_orders: true,
      materials_view: true,
      materials_storage: true,  // storage locations
      comms_log: true,
      invoices_view: true,
      invoices_edit: true,
      payments: true,
      leads: true,
      expenses_view: true,
      expenses_edit: true,      // own only vs all
      payroll: false,           // payroll is owner-only by default
      pl: true,
      schedule: true,
      crew_view: true,
      admin: false,
      template_setup: false,
    },
    foreman: {
      dashboard: true,
      jobs_view: true,
      jobs_edit: true,
      kanban: true,
      estimates: true,
      contracts: true,
      change_orders: true,
      materials_view: true,
      materials_storage: false,
      comms_log: true,
      invoices_view: false,
      invoices_edit: false,
      payments: false,
      leads: true,
      expenses_view: false,
      expenses_edit: false,
      payroll: false,
      pl: false,
      schedule: true,
      crew_view: true,
      admin: false,
      template_setup: false,
    },
    crew: {
      dashboard: true,
      jobs_view: true,
      jobs_edit: false,
      kanban: true,
      estimates: false,
      contracts: false,
      change_orders: false,
      materials_view: true,
      materials_storage: false,
      comms_log: false,
      invoices_view: false,
      invoices_edit: false,
      payments: false,
      leads: false,
      expenses_view: false,
      expenses_edit: false,
      payroll: false,
      pl: false,
      schedule: true,
      crew_view: false,
      admin: false,
      template_setup: false,
    },
  },
  supportTickets: [],
  customDocuments: [],
  customTemplates: {
    // keyed by type: 'contract_a' | 'contract_b' | 'contract_c' | 'estimate' | 'co_02' | 'co_03a' | 'co_03b' | 'lien_waiver'
    // each value: { id, name, type, text, fileName, createdAt, active }
  }, // [{id, name, type:'contract'|'co'|'signed'|'other', jobId, uploadedAt, notes, fileData, fileName, fileSize}]          // submitted by this account to platform support
  accountTeam: [],             // [{id, name, email, role:'owner'|'office'|'foreman'|'crew', addedAt}]
  subscription: {              // subscription/billing metadata
    plan: 'trial',             // trial | solo | crew | company
    trialStartDate: null,      // ISO date — set at signup
    billingCycleStart: null,   // ISO date — when paid subscription started
    renewalDate: null,         // ISO date — next renewal
    canceledAt: null,          // ISO date — if canceled
  },
}

export const useStore = create(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      // ── Jobs ──────────────────────────────────────────────────────
      addJob: (job) => {
        const newJob = { id: uid(), created: new Date().toISOString(), status: 'active', kbStatus: 'new_lead', portalToken: uid() + uid(), ...job }
        set((s) => ({ jobs: [...s.jobs, newJob] }))
        get().auditLog('job_created', `Job created: ${newJob.client}`, newJob.id)
        getAccountId(get()._userId).then(aid => { if (aid) writeJob(aid, newJob) })
        return newJob
      },
      updateJob: (id, patch) => {
        set((s) => ({
          jobs: s.jobs.map((j) => j.id === id ? { ...j, ...patch, updated: new Date().toISOString() } : j)
        }))
        getAccountId(get()._userId).then(aid => {
          const job = get().jobs.find(j => j.id === id)
          if (aid && job) writeJob(aid, job)
        })
      },
      deleteJob: (id) => {
        set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) }))
        dbDeleteJob(id)
      },
      getJob: (id) => get().jobs.find((j) => j.id === id),

      // ── Contracts ─────────────────────────────────────────────────
      addContract: (contract) => {
        const num = `CON-${String(get()._nextCon).padStart(4, '0')}`
        const rec = { id: uid(), num, status: 'draft', created: new Date().toISOString(), versionTimestamp: new Date().toISOString(), ...contract }
        set((s) => ({ contracts: [...s.contracts, rec], _nextCon: s._nextCon + 1 }))
        get().auditLog('contract_created', `Contract ${num} created`, contract.jobId)
        getAccountId(get()._userId).then(aid => { if (aid) writeContract(aid, rec) })
        return rec
      },
      updateContract: (id, patch) => {
        set((s) => ({ contracts: s.contracts.map((c) => c.id === id ? { ...c, ...patch } : c) }))
        getAccountId(get()._userId).then(aid => {
          const doc = get().contracts.find(c => c.id === id)
          if (aid && doc) writeContract(aid, doc)
        })
      },
      deleteContract: (id) => {
        set((s) => ({ contracts: s.contracts.filter((c) => c.id !== id) }))
        dbDeleteContract(id)
      },

      // ── Change Orders ─────────────────────────────────────────────
      addChangeOrder: (co) => {
        const num = `CO-${String(get()._nextCO).padStart(4, '0')}`
        const rec = { id: uid(), num, status: 'pending', created: new Date().toISOString(), versionTimestamp: new Date().toISOString(), ...co }
        set((s) => ({ changeOrders: [...s.changeOrders, rec], _nextCO: s._nextCO + 1 }))
        // Auto-advance job lifecycle based on CO type
        if (co.jobId) {
          const job = get().jobs.find(j => j.id === co.jobId)
          if (job) {
            const prevStage = job.kbStatus
            let newStage = prevStage
            if (co.coType === 'required_a') newStage = 'work_stopped'
            else if (co.coType === 'required_b' || co.coType === 'customer') newStage = 'co_pending_approval'
            get().updateJob(co.jobId, { kbStatus: newStage, prevKbStatus: prevStage })
          }
        }
        get().auditLog('co_created', `Change Order ${num} created`, co.jobId)
        getAccountId(get()._userId).then(aid => { if (aid) writeChangeOrder(aid, rec) })
        return rec
      },
      updateChangeOrder: (id, patch) => {
        set((s) => ({
          changeOrders: s.changeOrders.map((c) => c.id === id ? { ...c, ...patch } : c)
        }))
        getAccountId(get()._userId).then(aid => {
          const doc = get().changeOrders.find(c => c.id === id)
          if (aid && doc) writeChangeOrder(aid, doc)
        })
        // When CO is approved/declined, restore job to appropriate stage
        if (patch.status === 'approved' || patch.status === 'declined') {
          const co = get().changeOrders.find(c => c.id === id)
          if (co?.jobId) {
            const job = get().jobs.find(j => j.id === co.jobId)
            if (job) {
              let resumeStage = job.prevKbStatus || 'in_progress'
              if (patch.status === 'approved') resumeStage = 'in_progress'
              else if (patch.status === 'declined' && co.coType === 'required_a') resumeStage = 'work_stopped'
              else if (patch.status === 'declined') resumeStage = 'in_progress'
              get().updateJob(co.jobId, { kbStatus: resumeStage })
            }
          }
        }
      },

      // ── Invoices ──────────────────────────────────────────────────
      addInvoice: (inv) => {
        const num = `INV-${String(get()._nextInv).padStart(4, '0')}`
        const rec = { id: uid(), num, status: 'unpaid', payments: [], created: new Date().toISOString(), ...inv }
        set((s) => ({ invoices: [...s.invoices, rec], _nextInv: s._nextInv + 1 }))
        getAccountId(get()._userId).then(aid => { if (aid) writeInvoice(aid, rec) })
        return rec
      },
      addPayment: (invoiceId, payment) => {
        const pid = payment.id || uid()
        set((s) => ({
        invoices: s.invoices.map((inv) => {
          if (inv.id !== invoiceId) return inv
          const payments = [...(inv.payments || []), { id: pid, ...payment, date: payment.date || new Date().toISOString() }]
          const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
          const status = totalPaid >= inv.amount ? 'paid' : 'partial'
          return { ...inv, payments, status }
        })
      }))
        getAccountId(get()._userId).then(aid => {
          if (aid) writePayment(aid, invoiceId, { id: pid, ...payment })
        })
      },

      // ── Expenses ──────────────────────────────────────────────────
      addExpense: (exp) => {
        const rec = { id: uid(), date: new Date().toISOString(), ...exp }
        set((s) => ({ expenses: [...s.expenses, rec] }))
        getAccountId(get()._userId).then(aid => { if (aid) writeExpense(aid, rec) })
      },
      deleteExpense: (id) => {
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }))
        dbDeleteExpense(id)
      },

      // ── Crew ──────────────────────────────────────────────────────
      addCrew: (member) => {
        const rec = { id: uid(), ...member }
        set((s) => ({ crew: [...s.crew, rec] }))
        getAccountId(get()._userId).then(aid => { if (aid) writeCrew(aid, rec) })
      },
      updateCrew: (id, patch) => {
        set((s) => ({ crew: s.crew.map((c) => c.id === id ? { ...c, ...patch } : c) }))
        getAccountId(get()._userId).then(aid => {
          const m = get().crew.find(c => c.id === id)
          if (aid && m) writeCrew(aid, m)
        })
      },
      deleteCrew: (id) => {
        set((s) => ({ crew: s.crew.filter((c) => c.id !== id) }))
        dbDeleteCrew(id)
      },

      // ── Payroll ───────────────────────────────────────────────────
      addPayrollRun: (run) => {
        const rec = { id: uid(), ...run, date: run.date || new Date().toISOString() }
        set((s) => ({ payrollRuns: [...s.payrollRuns, rec] }))
        getAccountId(get()._userId).then(aid => { if (aid) writePayrollRun(aid, rec) })
      },

      // ── Leads ─────────────────────────────────────────────────────
      addLead: (lead) => {
        const rec = { id: uid(), created: new Date().toISOString(), ...lead }
        set((s) => ({ leads: [...s.leads, rec] }))
        getAccountId(get()._userId).then(aid => { if (aid) writeLead(aid, rec) })
      },
      updateLead: (id, patch) => {
        set((s) => ({ leads: s.leads.map((l) => l.id === id ? { ...l, ...patch } : l) }))
        getAccountId(get()._userId).then(aid => {
          const lead = get().leads.find(l => l.id === id)
          if (aid && lead) writeLead(aid, lead)
        })
      },
      deleteLead: (id) => {
        set((s) => ({ leads: s.leads.filter((l) => l.id !== id) }))
        dbDeleteLead(id)
      },

      // ── Estimates ─────────────────────────────────────────────────
      addEstimate: (est) => {
        set((s) => ({ estimates: [...s.estimates, est], _nextEst: (s._nextEst || 1001) + 1 }))
        getAccountId(get()._userId).then(aid => { if (aid) writeEstimate(aid, est) })
      },
      updateEstimate: (id, patch) => {
        set((s) => ({ estimates: s.estimates.map((e) => e.id === id ? { ...e, ...patch } : e) }))
        getAccountId(get()._userId).then(aid => {
          const est = get().estimates.find(e => e.id === id)
          if (aid && est) writeEstimate(aid, est)
        })
      },
      deleteEstimate: (id) => {
        set((s) => ({ estimates: s.estimates.filter((e) => e.id !== id) }))
        dbDeleteEstimate(id)
      },
      deleteChangeOrder: (id) => {
        set((s) => ({ changeOrders: s.changeOrders.filter((c) => c.id !== id) }))
        dbDeleteChangeOrder(id)
      },

      // ── Settings ──────────────────────────────────────────────────
      updateSettings: (patch) => {
        set((s) => ({ settings: { ...s.settings, ...patch } }))
        getAccountId(get()._userId).then(aid => {
          if (aid) writeSettings(aid, get().settings)
        })
      },
      updateContractDefaults: (patch) => {
        set((s) => ({
        settings: { ...s.settings, contractDefaults: { ...s.settings.contractDefaults, ...patch } }
        }))
        getAccountId(get()._userId).then(aid => { if (aid) writeSettings(aid, get().settings) })
      },

      // ── Contract Template ─────────────────────────────────────────
      setContractTemplate: (tpl, meta) => {
        set(s => ({ contractTemplate: tpl, contractTemplateMeta: { ...meta, status: 'draft', unlockedAt: null, reviewType: null, reviewedBy: null, reviewDate: null }, templateGenerationCount: (s.templateGenerationCount || 0) + 1 }))
        // Apply template defaults to settings
        if (tpl?.defaultSettings) {
          const d = tpl.defaultSettings
          set((s) => ({
            settings: {
              ...s.settings,
              contractDefaults: {
                ...s.settings.contractDefaults,
                ...(d.lateFee && { lateFee: d.lateFee }),
                ...(d.adminFee && { adminFee: d.adminFee }),
                ...(d.curePeriodDays && { curePeriod: d.curePeriodDays }),
                ...(d.coResponseDays && { coResponseDays: d.coResponseDays }),
                ...(d.defaultPaymentVersion && {
                  defaultPayment: d.defaultPaymentVersion === 'A' ? 'deposit_completion'
                    : d.defaultPaymentVersion === 'B' ? 'deposit_draws' : 'deposit_milestone'
                }),
              }
            }
          }))
        }
      },

      loadTemplateFromSupabase: async (userId) => {
        if (!supabase || !userId) return
        try {
          const { data } = await supabase
            .from('contract_templates')
            .select('template_data, trade, generated_at')
            .eq('user_id', userId)
            .order('generated_at', { ascending: false })
            .limit(1)
            .single()
          if (data?.template_data) {
            get().setContractTemplate(data.template_data, { trade: data.trade, generatedAt: data.generated_at })
          }
        } catch (e) {
          console.warn('Template load:', e.message)
        }
      },

      // ── Audit Log ─────────────────────────────────────────────────
      auditLog: (action, description, jobId) => set((s) => ({
        audit: [
          { id: uid(), action, description, jobId, timestamp: new Date().toISOString() },
          ...s.audit.slice(0, 499),
        ]
      })),

      // ── Supabase Sync ─────────────────────────────────────────────
      syncToSupabase: async (userId) => {
        if (!supabase || !userId) return
        const state = get()
        const row = {
          user_id: userId,
          db: {
            jobs: state.jobs, contracts: state.contracts, changeOrders: state.changeOrders,
            invoices: state.invoices, expenses: state.expenses, crew: state.crew,
            payrollRuns: state.payrollRuns, contacts: state.contacts, leads: state.leads,
            estimates: state.estimates, schemaVersion: 2,
            supportTickets: state.supportTickets || [],
            accountTeam: state.accountTeam || [],
            subscription: state.subscription || {},
            rolePermissions: state.rolePermissions,
            customDocuments: state.customDocuments || [],
            customTemplates: state.customTemplates || {},
            materials: state.materials,
            settings: state.settings,
            _nextCon: state._nextCon, _nextCO: state._nextCO, _nextInv: state._nextInv,
          },
          profile: { name: state.settings.adminSettings?.ownerName || '' },
        }
        // onConflict ensures upsert works on the user_id unique key
        const { error } = await supabase
          .from('user_data')
          .upsert(row, { onConflict: 'user_id' })
        if (error) console.warn('Supabase sync error:', error.message, error.code)
        // Write snapshot to relational snapshots table for 30-day rollback
        const { accountId: aid } = get()
        if (aid) writeSnapshot(aid, row.db)
      },

      loadFromSupabase: async (userId) => {
        if (!supabase || !userId) return false
        try {
          const { data } = await supabase.from('user_data').select('db').eq('user_id', userId).single()
          if (data?.db) {
            const db = data.db
            // Schema version check: reject old prototype data (pre-v2)
            // Old data signatures: job ids like 'job_demo1', old settings keys like 'stripeKey'
            const hasOldJobs = (db.jobs||[]).some(j => j.id?.startsWith('job_demo'))
            const hasOldSettings = db.settings?.stripeKey !== undefined
            const isOldSchema = hasOldJobs || hasOldSettings || !db.schemaVersion
            if (isOldSchema) {
              console.warn('Supabase has stale prototype data — skipping load, will overwrite on next sync')
              return false
            }
            // Valid schema — load it
            set((s) => ({ ...s, ...db, rolePermissions: db.rolePermissions || s.rolePermissions }))
            return true
          }
        } catch (e) {
          console.warn('Load from Supabase:', e.message)
        }
        return false
      },

      // ── Demo Data ─────────────────────────────────────────────────
      loadDemoData: () => {
        // Clear any stale data before loading demo
        set({ ...INITIAL_STATE, isDemoMode: true })
        const now = new Date()
        const jobs = [
          { id: 'demo-j1', client: 'Henderson Family', address: '412 Oak Ridge Dr, Greenville SC 29607', phone: '(864) 555-0142', email: 'henderson@email.com', type: 'Gutter Installation', status: 'active', kbStatus: 'final_invoice', contractValue: 4800, state: 'SC', notes: 'Replace all gutters with 6-inch seamless aluminum in Musket Brown. 120 LF + 6 downspouts.', created: now.toISOString(), startDate: new Date(now.getTime() - 7*86400000).toISOString().split('T')[0], portalToken: 'demo-token-j1-portal-henderson', materials: [{ id: 'dm1', name: '6-inch aluminum gutter - Musket Brown', qty: 120, unit: 'LF', costPerUnit: 4.50, totalCost: 540, supplier: 'ABC Supply', storageLocation: 'Truck bed - covered', status: 'on_site', createdAt: now.toISOString() }, { id: 'dm2', name: 'K-style downspouts 10ft', qty: 6, unit: 'EA', costPerUnit: 12, totalCost: 72, supplier: 'ABC Supply', storageLocation: 'Truck bed', status: 'on_site', createdAt: now.toISOString() }] },
          { id: 'demo-j2', client: 'Martinez Property', address: '891 Pelham Rd, Greenville SC 29615', phone: '(864) 555-0187', email: 'martinez@email.com', type: 'Fascia & Soffit', status: 'active', kbStatus: 'in_progress', contractValue: 6200, state: 'SC', notes: 'Full fascia and soffit replacement. James Hardie fiber cement boards.', created: now.toISOString(), startDate: new Date(now.getTime() - 2*86400000).toISOString().split('T')[0], portalToken: 'demo-token-j2-portal-martinez', materials: [{ id: 'dm3', name: 'James Hardie Trim Board 5/4x6x12', qty: 40, unit: 'PC', costPerUnit: 28, totalCost: 1120, supplier: 'Home Depot', storageLocation: 'Customer garage - left wall', status: 'delivered', deliveredDate: new Date(now.getTime() - 1*86400000).toISOString().split('T')[0], createdAt: now.toISOString() }] },
          { id: 'demo-j3', client: 'Whitmore LLC', address: '234 Verdae Blvd, Greenville SC 29607', phone: '(864) 555-0209', email: 'whitmore@email.com', type: 'Gutter Guards', status: 'pending', kbStatus: 'estimate_sent', contractValue: 2400, state: 'SC', notes: 'Micro-mesh guards on existing gutters. Commercial property.', created: now.toISOString(), portalToken: 'demo-token-j3-portal-whitmore' },
        ]
        const invoices = [
          { id: 'demo-inv1', num: 'INV-1001', jobId: 'demo-j1', amount: 4800, status: 'partial', payments: [{ id: uid(), method: 'Check', amount: 1120, date: now.toISOString(), memo: 'Materials deposit' }], created: now.toISOString() },
          { id: 'demo-inv2', num: 'INV-1002', jobId: 'demo-j2', amount: 6200, status: 'unpaid', payments: [], created: now.toISOString() },
        ]
        set(s => ({ ...s, jobs, invoices, _nextCon: 1001, _nextCO: 1001, _nextInv: 1003 }))
      },

      setViewAsRole: (role) => set({ viewAsRole: role }),

      // Called from auth context on login — bootstraps account and caches IDs
      setUserId: async (userId, email, name) => {
        set({ _userId: userId })
        const accountId = await bootstrapAccount(userId, email, name)
        set({ accountId })
        return accountId
      },

      // Custom document templates
      saveCustomTemplate: (type, template) => {
        set((s) => ({
        customTemplates: {
          ...s.customTemplates,
          [type]: { ...template, id: type, updatedAt: new Date().toISOString() }
        }
      }))
        getAccountId(get()._userId).then(aid => { if (aid) writeCustomTemplate(aid, type, template) })
      },
      deleteCustomTemplate: (type) => {
        getAccountId(get()._userId).then(aid => { if (aid) dbDeleteCustomTemplate(aid, type) })
        set((s) => {
        const t = { ...s.customTemplates }
        delete t[type]
        return { customTemplates: t }
        })
      },

      // Custom documents (uploaded contracts, wet-signed docs, etc.)
      addCustomDocument: (doc) => set((s) => ({
        customDocuments: [{ id: uid(), uploadedAt: new Date().toISOString(), ...doc }, ...s.customDocuments]
      })),
      updateCustomDocument: (id, patch) => set((s) => ({
        customDocuments: s.customDocuments.map(d => d.id === id ? { ...d, ...patch } : d)
      })),
      deleteCustomDocument: (id) => set((s) => ({
        customDocuments: s.customDocuments.filter(d => d.id !== id)
      })),

      unlockTemplate: (reviewType, reviewedBy, reviewDate) => set((s) => ({
        contractTemplateMeta: {
          ...s.contractTemplateMeta,
          status: reviewType === 'attorney' ? 'active' : 'active_unreviewed',
          reviewType,          // 'attorney' | 'self'
          reviewedBy,          // attorney name or user name
          reviewDate,          // date string
          unlockedAt: new Date().toISOString(),
        }
      })),
      updateRolePermissions: (role, patch) => set((s) => ({
        rolePermissions: {
          ...s.rolePermissions,
          [role]: { ...s.rolePermissions[role], ...patch }
        }
      })),
      setRolePermission: (role, key, value) => set((s) => ({
        rolePermissions: {
          ...s.rolePermissions,
          [role]: { ...s.rolePermissions[role], [key]: value }
        }
      })),

      // Support tickets
      addSupportTicket: (ticket) => set((s) => ({
        supportTickets: [{ id: uid(), createdAt: new Date().toISOString(), status: 'open', ...ticket }, ...s.supportTickets]
      })),
      updateSupportTicket: (id, patch) => set((s) => ({
        supportTickets: s.supportTickets.map(t => t.id === id ? { ...t, ...patch } : t)
      })),

      // Account team / ownership
      addTeamMember: (member) => set((s) => ({
        accountTeam: [...s.accountTeam, { id: uid(), addedAt: new Date().toISOString(), ...member }]
      })),
      removeTeamMember: (id) => set((s) => ({
        accountTeam: s.accountTeam.filter(m => m.id !== id)
      })),
      updateTeamMember: (id, patch) => set((s) => ({
        accountTeam: s.accountTeam.map(m => m.id === id ? { ...m, ...patch } : m)
      })),
      updateSubscription: (patch) => set((s) => ({
        subscription: { ...s.subscription, ...patch }
      })),

      reset: () => {
        // Preserve settings, template, and auth state — only wipe operational data
        const s = get()
        set({
          ...INITIAL_STATE,
          settings: s.settings,            // keep company info, job types, contract defaults
          contractTemplate: s.contractTemplate,
          contractTemplateMeta: s.contractTemplateMeta,
          isDemoMode: s.isDemoMode,
        })
      },
    }),
    {
      name: 'proline-fieldos-v1',
      partialize: (s) => {
        const { loadTemplateFromSupabase, syncToSupabase, loadFromSupabase, loadDemoData, reset, addEstimate, updateEstimate, addLead, updateLead, deleteLead, addPayrollRun, ...rest } = s
        return rest
      },
    }
  )
)
