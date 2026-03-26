// Full contractor customer lifecycle stages
// Each stage has an id, label, color, phase, and what actions are available/triggered

export const LIFECYCLE_STAGES = [
  // Phase 1 — Pre-sale
  { id: 'new_lead',             label: 'New lead',              phase: 'presale',   color: 'gray',    badge: 'badge-gray'   },
  { id: 'consultation_sched',   label: 'Consult scheduled',     phase: 'presale',   color: 'amber',   badge: 'badge-amber'  },
  { id: 'estimate_pending',     label: 'Estimate pending',      phase: 'presale',   color: 'amber',   badge: 'badge-amber'  },
  { id: 'estimate_sent',        label: 'Estimate sent',         phase: 'presale',   color: 'blue',    badge: 'badge-blue'   },
  { id: 'estimate_approved',    label: 'Estimate approved',     phase: 'presale',   color: 'green',   badge: 'badge-green'  },
  // Phase 2 — Contract
  { id: 'contract_pending',     label: 'Contract pending',      phase: 'contract',  color: 'amber',   badge: 'badge-amber'  },
  { id: 'contract_signed',      label: 'Contract signed',       phase: 'contract',  color: 'blue',    badge: 'badge-blue'   },
  { id: 'deposit_received',     label: 'Deposit received',      phase: 'contract',  color: 'green',   badge: 'badge-green'  },
  // Phase 3 — Execution
  { id: 'scheduled',            label: 'Scheduled',             phase: 'execution', color: 'blue',    badge: 'badge-blue'   },
  { id: 'in_progress',          label: 'In progress',           phase: 'execution', color: 'blue',    badge: 'badge-blue'   },
  { id: 'punch_list',           label: 'Punch list',            phase: 'execution', color: 'amber',   badge: 'badge-amber'  },
  // Phase 4 — Close
  { id: 'final_invoice',        label: 'Final invoice',         phase: 'close',     color: 'amber',   badge: 'badge-amber'  },
  { id: 'paid',                 label: 'Paid in full',          phase: 'close',     color: 'green',   badge: 'badge-green'  },
  { id: 'lien_waiver_issued',   label: 'Lien waiver issued',    phase: 'close',     color: 'green',   badge: 'badge-green'  },
  { id: 'closed',               label: 'Closed',                phase: 'close',     color: 'gray',    badge: 'badge-gray'   },
  // Other
  { id: 'on_hold',              label: 'On hold',               phase: 'other',     color: 'amber',   badge: 'badge-amber'  },
  { id: 'declined',             label: 'Declined / Lost',       phase: 'other',     color: 'red',     badge: 'badge-red'    },
]

export const LIFECYCLE_MAP = Object.fromEntries(LIFECYCLE_STAGES.map(s => [s.id, s]))

// Map old kbStatus strings to new lifecycle ids
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
  // Handle both new ids and legacy strings
  const mapped = LEGACY_STATUS_MAP[stageId] || stageId
  return LIFECYCLE_MAP[mapped] || { id: stageId, label: stageId, badge: 'badge-gray' }
}

export const PHASES = [
  { id: 'presale',   label: 'Pre-sale',  stages: ['new_lead','consultation_sched','estimate_pending','estimate_sent','estimate_approved'] },
  { id: 'contract',  label: 'Contract',  stages: ['contract_pending','contract_signed','deposit_received'] },
  { id: 'execution', label: 'Execution', stages: ['scheduled','in_progress','punch_list'] },
  { id: 'close',     label: 'Close',     stages: ['final_invoice','paid','lien_waiver_issued','closed'] },
  { id: 'other',     label: 'Other',     stages: ['on_hold','declined'] },
]
