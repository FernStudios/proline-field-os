import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { fmtDShort, cn } from '../lib/utils'
import { getStageInfo } from '../lib/lifecycle'
import { TopNav } from '../components/layout/AppShell'
import { Card, Badge, Empty } from '../components/ui'

export default function CrewView() {
  const navigate = useNavigate()
  const { crew, jobs, settings } = useStore()
  const [selectedCrew, setSelectedCrew] = useState(null)

  const member = crew.find(c => c.id === selectedCrew)

  // Get jobs assigned to a crew member
  const assignedJobs = selectedCrew
    ? jobs.filter(j => (j.assignedCrew || []).includes(selectedCrew) && j.status !== 'complete')
    : []

  const allActiveJobs = jobs.filter(j => j.status === 'active' || j.kbStatus === 'in_progress' || j.kbStatus === 'scheduled')

  if (selectedCrew && member) {
    return (
      <>
        <TopNav title={member.name} onBack={() => setSelectedCrew(null)} />
        <div className="px-4 pt-4">
          {/* Crew member card */}
          <div className="bg-navy rounded-2xl p-4 mb-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {member.name[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-white text-base">{member.name}</p>
              <p className="text-white/50 text-xs capitalize">{member.role} · {member.payType === 'daily' ? `$${member.rate}/day` : `$${member.rate}/hr`}</p>
              {member.phone && <a href={`tel:${member.phone}`} className="text-white/60 text-xs">{member.phone}</a>}
            </div>
          </div>

          {/* Assigned jobs */}
          <p className="section-title mb-2">Assigned jobs ({assignedJobs.length})</p>
          {assignedJobs.length === 0
            ? <Empty icon="🔨" title="No active assignments" description="This crew member has no active job assignments" />
            : <div className="space-y-2.5 mb-5">
                {assignedJobs.map(job => {
                  const stage = getStageInfo(job.kbStatus)
                  return (
                    <Card key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-navy">{job.client}</p>
                          <p className="text-xs text-gray-400">{job.type}</p>
                          <p className="text-xs text-gray-400 truncate">{job.address?.split(',').slice(0,2).join(',')}</p>
                          {job.startDate && <p className="text-xs text-gray-400">Start: {fmtDShort(job.startDate)}</p>}
                        </div>
                        <Badge variant={stage.badge?.replace('badge-','') || 'gray'}>{stage.label}</Badge>
                      </div>
                    </Card>
                  )
                })}
              </div>
          }

          {/* All active jobs they could be assigned to */}
          {assignedJobs.length < allActiveJobs.length && (
            <>
              <p className="section-title mb-2">Unassigned active jobs</p>
              <div className="space-y-2">
                {allActiveJobs.filter(j => !(j.assignedCrew||[]).includes(selectedCrew)).map(job => (
                  <button key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}
                    className="w-full text-left card-sm flex items-center justify-between opacity-60">
                    <div>
                      <p className="font-semibold text-xs text-navy">{job.client}</p>
                      <p className="text-[10px] text-gray-400">{job.type}</p>
                    </div>
                    <span className="text-xs text-gray-400">Assign →</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <TopNav title="Crew" onBack={() => navigate('/more')} />
      <div className="px-4 pt-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-400 mb-1">Total crew</p><p className="font-display font-bold text-navy text-lg">{crew.length}</p></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-400 mb-1">Active jobs</p><p className="font-display font-bold text-navy text-lg">{allActiveJobs.length}</p></div>
          <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xs text-gray-400 mb-1">Assigned</p><p className="font-display font-bold text-navy text-lg">{allActiveJobs.filter(j=>(j.assignedCrew||[]).length > 0).length}</p></div>
        </div>

        {crew.length === 0
          ? <Empty icon="👷" title="No crew members" description="Add crew in Payroll → Crew Roster" />
          : <div className="space-y-2.5">
              {crew.map(member => {
                const memberJobs = jobs.filter(j => (j.assignedCrew||[]).includes(member.id) && j.status !== 'complete')
                return (
                  <Card key={member.id} onClick={() => setSelectedCrew(member.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {member.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-navy">{member.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{member.role} · {member.payType === 'daily' ? `$${member.rate}/day` : `$${member.rate}/hr`}</p>
                        {memberJobs.length > 0 && (
                          <p className="text-xs text-brand mt-0.5">{memberJobs.length} active job{memberJobs.length > 1 ? 's' : ''}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {memberJobs.length > 0
                          ? <Badge variant="blue">{memberJobs.length} job{memberJobs.length>1?'s':''}</Badge>
                          : <Badge variant="gray">Unassigned</Badge>
                        }
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
        }
      </div>
    </>
  )
}
