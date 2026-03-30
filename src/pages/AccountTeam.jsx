import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendInviteEmail } from '../lib/sendEmail'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { TopNav } from '../components/layout/AppShell'
import { Card, SectionTitle, Badge, Empty, FormGroup, Input, Select, Button, Modal } from '../components/ui'
import { toast } from '../components/ui'
import { cn } from '../lib/utils'

const ROLE_META = {
  owner:   { label: 'Owner',   color: 'blue',   icon: '👑', desc: 'Full access — same as the account creator. Multiple owners allowed.' },
  office:  { label: 'Office',  color: 'purple', icon: '💼', desc: 'Full operational access — permissions customizable in Admin → Roles' },
  foreman: { label: 'Foreman', color: 'amber',  icon: '🦺', desc: 'Field supervisors — permissions customizable in Admin → Roles' },
  crew:    { label: 'Crew',    color: 'gray',   icon: '👷', desc: 'Field workers — permissions customizable in Admin → Roles' },
}

export default function AccountTeam() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { accountTeam, addTeamMember, removeTeamMember, updateTeamMember, settings, updateSettings, syncToSupabase } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'owner' })
  const [transferTarget, setTransferTarget] = useState('')
  const [transferConfirm, setTransferConfirm] = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const doSync = () => { if (user?.id) syncToSupabase(user.id) }

  // Primary account holder — always an owner
  const primaryEmail = user?.email || ''
  const primaryName = settings?.adminSettings?.ownerName || user?.email || 'Account owner'

  // All owners = primary + any team members with owner role
  const coOwners = accountTeam.filter(m => m.role === 'owner')
  const otherMembers = accountTeam.filter(m => m.role !== 'owner')

  const addMember = () => {
    if (!form.name.trim() || !form.email.trim()) { toast('Name and email required', 'error'); return }
    if (form.email.toLowerCase() === primaryEmail.toLowerCase()) {
      toast('That email is already the primary account owner', 'error'); return
    }
    if (accountTeam.some(m => m.email === form.email.toLowerCase())) {
      toast('That email is already on the team', 'error'); return
    }
    addTeamMember({ name: form.name.trim(), email: form.email.trim().toLowerCase(), role: form.role })
    doSync()
    toast(`${form.name} added as ${ROLE_META[form.role].label}`)
    setForm({ name: '', email: '', role: 'owner' })
    setShowAdd(false)
  }

  const removeMember = (id, name) => {
    removeTeamMember(id)
    doSync()
    toast(`${name} removed from team`)
  }

  const changeRole = (id, newRole) => {
    // updateTeamMember patches the member in the store
    const member = accountTeam.find(m => m.id === id)
    if (!member) return
    removeTeamMember(id)
    addTeamMember({ ...member, role: newRole })
    doSync()
    toast(`Role updated to ${ROLE_META[newRole]?.label}`)
  }

  const handleTransfer = () => {
    if (transferConfirm !== 'TRANSFER') { toast('Type TRANSFER to confirm', 'error'); return }
    if (!transferTarget.trim()) { toast('Select the new primary owner', 'error'); return }
    // Update primary owner name in settings
    const target = accountTeam.find(m => m.id === transferTarget)
    if (!target) return
    updateSettings({ coEmail: target.email, adminSettings: { ...settings.adminSettings, ownerName: target.name } })
    doSync()
    toast('Primary owner updated — contact support to transfer the billing seat')
    setShowTransfer(false)
    setTransferTarget('')
    setTransferConfirm('')
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <TopNav title="Account & Team" onBack={() => navigate('/admin')}
        actions={
          <button onClick={() => setShowAdd(true)}
            className="text-xs font-bold text-white bg-brand rounded-lg px-3 py-1.5">
            + Add
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">

        {/* ── Owners section ── */}
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Owners ({1 + coOwners.length})</SectionTitle>
          <div className="flex items-center gap-2">
            <button onClick={() => { setForm(f => ({...f, role: 'owner'})); setShowAdd(true) }}
              className="text-xs font-semibold text-brand">+ Add co-owner</button>
            {coOwners.length > 0 && (
              <button onClick={() => setShowTransfer(true)}
                className="text-xs text-gray-400 hover:text-gray-600 ml-1">
                Change primary →
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2.5 mb-5">
          {/* Primary owner — always first */}
          <Card>
            <div className="flex items-center gap-3">
              <span className="text-xl">👑</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-navy">{primaryName}</p>
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">Primary</span>
                </div>
                <p className="text-xs text-gray-400">{primaryEmail}</p>
                <p className="text-xs text-gray-400 mt-0.5">Billing seat · Full access</p>
              </div>
              <Badge variant="blue">Owner</Badge>
            </div>
          </Card>

          {/* Co-owners */}
          {coOwners.map(m => (
            <Card key={m.id}>
              <div className="flex items-center gap-3">
                <span className="text-xl">👑</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-navy">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Co-owner · Full access</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="blue">Owner</Badge>
                  <button onClick={() => removeMember(m.id, m.name)}
                    className="text-gray-300 hover:text-red-400 text-base leading-none ml-1">×</button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Other team members ── */}
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Team members ({otherMembers.length})</SectionTitle>
          <button onClick={() => { setForm(f => ({...f, role: 'foreman'})); setShowAdd(true) }}
            className="text-xs font-semibold text-brand">+ Add member</button>
        </div>

        {otherMembers.length === 0 ? (
          <Empty icon="👥" title="No team members yet"
            description="Use the Add member button above to add a foreman, crew member, or office staff." />
        ) : (
          <div className="space-y-2.5 mb-6">
            {otherMembers.map(m => {
              const meta = ROLE_META[m.role] || ROLE_META.crew
              return (
                <Card key={m.id}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{meta.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-navy">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Inline role change */}
                      <select value={m.role}
                        onChange={e => changeRole(m.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white">
                        {Object.entries(ROLE_META).map(([id, r]) => (
                          <option key={id} value={id}>{r.label}</option>
                        ))}
                      </select>
                      <button onClick={() => removeMember(m.id, m.name)}
                        className="text-gray-300 hover:text-red-400 text-base leading-none">×</button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* ── Role guide ── */}
        <SectionTitle className="mb-3">Role guide</SectionTitle>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
          <p className="text-xs font-semibold text-blue-800 mb-1">Multiple owners</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            You can have multiple people with Owner access. All owners have identical permissions.
            "Transfer ownership" changes the <em>primary account holder</em> — the person responsible for billing — but all owners retain full access.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {Object.entries(ROLE_META).map(([id, meta], i) => (
            <div key={id} className={cn('flex items-start gap-3 px-4 py-3', i > 0 && 'border-t border-gray-50')}>
              <span className="text-lg mt-0.5">{meta.icon}</span>
              <div>
                <p className="font-semibold text-xs text-navy">{meta.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{meta.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-4 leading-relaxed text-center">
          Full multi-user login enforcement is coming in a future update.
          For now this registers team members for role-based view testing and notification purposes.
        </p>
      </div>

      {/* ── Add member modal ── */}
      <Modal open={showAdd} title="Add team member" onClose={() => setShowAdd(false)}>
          <div className="space-y-3 p-4">
            <FormGroup label="Name">
              <Input value={form.name} onChange={set('name')} placeholder="Full name" />
            </FormGroup>
            <FormGroup label="Email">
              <Input value={form.email} onChange={set('email')} type="email" placeholder="email@example.com" />
            </FormGroup>
            <FormGroup label="Role">
              <Select value={form.role} onChange={set('role')}>
                <option value="owner">Owner — full access, co-owner</option>
                <option value="office">Office — operational access (customizable)</option>
                <option value="foreman">Foreman — jobs, docs, comms (customizable)</option>
                <option value="crew">Crew — view-only on assigned jobs (customizable)</option>
              </Select>
            </FormGroup>
            {form.role === 'owner' && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-700 leading-relaxed">
                  Co-owners have the same access as the primary owner. The primary owner is the billing seat —
                  use "Change primary" on the team page to reassign it.
                </p>
              </div>
            )}
            <p className="text-xs text-gray-400 leading-relaxed">
              Office, Foreman, and Crew permissions are customizable in Admin → Roles.
            </p>
            <Button variant="primary" className="w-full" onClick={addMember}>
              Add {ROLE_META[form.role]?.label}
            </Button>
          </div>
      </Modal>

      {/* ── Change primary owner modal ── */}
      <Modal open={showTransfer} title="Change primary owner" onClose={() => setShowTransfer(false)}>
          <div className="space-y-3 p-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">⚠ Billing seat change</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                The primary owner controls the subscription billing.
                This updates who is recorded as primary — contact support to complete the auth and billing transfer.
                All owners retain full access.
              </p>
            </div>
            <FormGroup label="New primary owner" hint="Must already be a co-owner on this account">
              <Select value={transferTarget} onChange={e => setTransferTarget(e.target.value)}>
                <option value="">— Select a co-owner —</option>
                {coOwners.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                ))}
              </Select>
            </FormGroup>
            {coOwners.length === 0 && (
              <p className="text-xs text-red-500">Add a co-owner first before changing the primary.</p>
            )}
            <FormGroup label='Type TRANSFER to confirm'>
              <Input value={transferConfirm} onChange={e => setTransferConfirm(e.target.value)}
                placeholder="TRANSFER" />
            </FormGroup>
            <Button variant="primary" className="w-full"
              disabled={coOwners.length === 0}
              onClick={handleTransfer}>
              Update primary owner
            </Button>
          </div>
      </Modal>
    </div>
  )
}
