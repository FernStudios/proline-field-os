export const LIFECYCLE_STAGES = [
  // Pre-sale
  { id: 'new_lead',             label: 'New lead',              phase: 'presale',   badge: 'badge-gray',   kanban: true  },
  { id: 'consultation_sched',   label: 'Consult scheduled',     phase: 'presale',   badge: 'badge-amber',  kanban: true  },
  { id: 'estimate_pending',     label: 'Estimate pending',      phase: 'presale',   badge: 'badge-amber',  kanban: true  },
  { id: 'estimate_sent',        label: 'Estimate sent',         phase: 'presale',   badge: 'badge-blue',   kanban: true  },
  { id: 'estimate_approved',    label: 'Estimate approved',     phase: 'presale',   badge: 'badge-green',  kanban: true  },
  // Contract
  { id: 'contract_pending',     label: 'Contract pending',      phase: 'contract',  badge: 'badge-amber',  kanban: true  },
  { id: 'contract_signed',      label: 'Contract signed',       phase: 'contract',  badge: 'badge-blue',   kanban: true  },
  { id: 'deposit_pending',      label: 'Deposit pending',       phase: 'contract',  badge: 'badge-amber',  kanban: true  },
  { id: 'deposit_received',     label: 'Deposit received',      phase: 'contract',  badge: 'badge-green',  kanban: true  },
  // Materials
  { id: 'materials_ordered',    label: 'Materials ordered',     phase: 'materials', badge: 'badge-amber',  kanban: true  },
  { id: 'materials_ready',      label: 'Materials ready',       phase: 'materials', badge: 'badge-green',  kanban: true  },
  // Execution
  { id: 'scheduled',            label: 'Scheduled',             phase: 'execution', badge: 'badge-blue',   kanban: true  },
  { id: 'in_progress',          label: 'In progress',           phase: 'execution', badge: 'badge-blue',   kanban: true  },
  // CO stages
  { id: 'co_pending_approval',  label: 'CO pending',            phase: 'execution', badge: 'badge-amber',  kanban: true, coStage: true },
  { id: 'co_approved',          label: 'CO approved',           phase: 'execution', badge: 'badge-green',  coStage: true },
  { id: 'co_declined',          label: 'CO declined',           phase: 'execution', badge: 'badge-red',    coStage: true },
  { id: 'work_stopped',         label: 'Work stopped',          phase: 'execution', badge: 'badge-red',    kanban: true, coStage: true },
  { id: 'punch_list',           label: 'Punch list',            phase: 'execution', badge: 'badge-amber',  kanban: true  },
  // Close
  { id: 'final_invoice',        label: 'Final invoice',         phase: 'close',     badge: 'badge-amber',  kanban: true  },
  { id: 'paid',                 label: 'Paid in full',          phase: 'close',     badge: 'badge-green',  kanban: true  },
  { id: 'lien_waiver_issued',   label: 'Lien waiver issued',    phase: 'close',     badge: 'badge-green'                },
  { id: 'closed',               label: 'Closed',                phase: 'close',     badge: 'badge-gray',   kanban: true  },
  // Other
  { id: 'on_hold',              label: 'On hold',               phase: 'other',     badge: 'badge-amber',  kanban: true  },
  { id: 'declined',             label: 'Declined / Lost',       phase: 'other',     badge: 'badge-red',    kanban: true  },
]

export const LIFECYCLE_MAP = Object.fromEntries(LIFECYCLE_STAGES.map(s => [s.id, s]))

export const LEGACY_STATUS_MAP = {
  'New Lead': 'new_lead',
  'Estimate': 'estimate_pending',
  'Pending Contract': 'contract_pending',
  'Active': 'in_progress',
  'In Progress': 'in_progress',
  'Invoiced': 'final_invoice',
  'Complete': 'paid',
  'On Hold': 'on_hold',
  'Scheduled': 'scheduled',
}

export function getStageInfo(stageId) {
  if (!stageId) return { id: 'new_lead', label: 'New lead', badge: 'badge-gray', phase: 'presale' }
  const mapped = LEGACY_STATUS_MAP[stageId] || stageId
  return LIFECYCLE_MAP[mapped] || { id: stageId, label: stageId, badge: 'badge-gray', phase: 'presale' }
}

// Kanban columns — each is a group of related stages shown as one column
export const KANBAN_COLUMNS = [
  { id: 'presale',   label: 'Pre-sale',   stages: ['new_lead','consultation_sched','estimate_pending','estimate_sent','estimate_approved'], color: '#888780' },
  { id: 'contract',  label: 'Contract',   stages: ['contract_pending','contract_signed','deposit_pending','deposit_received'], color: '#0C447C' },
  { id: 'materials', label: 'Materials',  stages: ['materials_ordered','materials_ready'], color: '#854F0B' },
  { id: 'scheduled', label: 'Scheduled',  stages: ['scheduled'], color: '#185FA5' },
  { id: 'inprog',    label: 'In progress',stages: ['in_progress','co_pending_approval','work_stopped'], color: '#0a3ef8' },
  { id: 'punchlist', label: 'Punch list', stages: ['punch_list'], color: '#854F0B' },
  { id: 'invoiced',  label: 'Invoice',    stages: ['final_invoice'], color: '#92400e' },
  { id: 'closed',    label: 'Closed',     stages: ['paid','lien_waiver_issued','closed'], color: '#27500A' },
  { id: 'other',     label: 'On hold',    stages: ['on_hold','declined'], color: '#5F5E5A' },
]

export function getKanbanColumn(stageId) {
  const mapped = LEGACY_STATUS_MAP[stageId] || stageId
  return KANBAN_COLUMNS.find(col => col.stages.includes(mapped)) || KANBAN_COLUMNS[0]
}

export const PHASES = [
  { id: 'presale',   label: 'Pre-sale',  stages: ['new_lead','consultation_sched','estimate_pending','estimate_sent','estimate_approved'] },
  { id: 'contract',  label: 'Contract',  stages: ['contract_pending','contract_signed','deposit_pending','deposit_received'] },
  { id: 'materials', label: 'Materials', stages: ['materials_ordered','materials_ready'] },
  { id: 'execution', label: 'Execution', stages: ['scheduled','in_progress','co_pending_approval','co_approved','co_declined','work_stopped','punch_list'] },
  { id: 'close',     label: 'Close',     stages: ['final_invoice','paid','lien_waiver_issued','closed'] },
  { id: 'other',     label: 'Other',     stages: ['on_hold','declined'] },
]

// CO lifecycle
export const CO_LIFECYCLE = {
  customer:   { pending: 'co_pending_approval', approved: 'in_progress',   declined: 'in_progress'   },
  required_a: { pending: 'work_stopped',         approved: 'in_progress',   declined: 'work_stopped'  },
  required_b: { pending: 'co_pending_approval',  approved: 'in_progress',   declined: 'in_progress'   },
}

// Customer portal phases — what the customer sees
export const CUSTOMER_PHASES = [
  { key: 'estimate',   label: 'Estimate',    stages: ['estimate_sent','estimate_approved'] },
  { key: 'contract',   label: 'Contract',    stages: ['contract_pending','contract_signed','deposit_received'] },
  { key: 'inprogress', label: 'In progress', stages: ['materials_ordered','materials_ready','scheduled','in_progress','co_pending_approval','work_stopped','punch_list'] },
  { key: 'complete',   label: 'Complete',    stages: ['final_invoice','paid','closed'] },
]

export function customerPhaseIndex(stageId) {
  const mapped = LEGACY_STATUS_MAP[stageId] || stageId
  for (let i = 0; i < CUSTOMER_PHASES.length; i++) {
    if (CUSTOMER_PHASES[i].stages.includes(mapped)) return i
  }
  return 0
}
