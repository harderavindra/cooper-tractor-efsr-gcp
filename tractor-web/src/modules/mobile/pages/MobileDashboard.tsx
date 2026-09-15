import { useEffect, useState } from 'react'
import { Handshake } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import { useAuth } from '../../../shared/context/AuthContext'
import { Avatar } from '../../../shared/components/Avatar'
import type { MobileDashboardData } from '../../../shared/data/types'
import { ActiveTaskSection } from '../components/ActiveTaskSection'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function MobileDashboard() {
  const { userId, name, role, dealerName, profilePic } = useAuth()
  const [data, setData] = useState<MobileDashboardData | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  function reloadDashboard() {
    return api.get<MobileDashboardData>('/api/me/dashboard').then(setData).catch(() => setData(null))
  }

  useEffect(() => {
    reloadDashboard()
  }, [])

  function selectMember(id: string) {
    setSelectedMemberId(prev => (prev === id ? null : id))
  }

  const activeEntries = data?.activeTasks ?? []
  const completedEntries = data?.recentCompleted ?? []
  const teamMembers = data?.team ?? []
  const myActiveCount = data?.summary?.myActive ?? data?.counts.active ?? 0
  const hasTeam = teamMembers.length > 0

  const filteredActive = selectedMemberId ? activeEntries.filter(e => e.assignedTo.userId === selectedMemberId) : activeEntries
  const filteredCompleted = selectedMemberId ? completedEntries.filter(e => e.assignedTo.userId === selectedMemberId) : completedEntries

  const selectedMember = teamMembers.find(m => m._id === selectedMemberId)
  const selectedIsMe = hasTeam && selectedMemberId === userId
  const filterLabel = selectedMember
    ? (selectedMember.role === 'dealer' ? (selectedMember.dealerName || selectedMember.name) : selectedMember.name.split(' ')[0])
    : selectedIsMe
      ? 'You'
      : undefined

  return (
    <div className="px-4 py-5 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Avatar name={name ?? '?'} role={role ?? undefined} dealerName={dealerName ?? undefined} photo={profilePic ?? undefined} userId={userId ?? undefined} size="lg" showPopover={false} />
        <div>
          <p className="text-sm text-gray-400">{greeting()} !</p>
          <p className="text-base font-bold text-gray-900">{name}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-3xl text-gray-400 leading-tight">
            You have <span className="font-bold text-gray-900">{myActiveCount}</span>
          </p>
          <p className="text-3xl font-bold text-gray-900 leading-tight">active Tasks</p>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 pt-1 pl-1">
          <button
            onClick={() => hasTeam && userId && selectMember(userId)}
            className={`flex flex-col items-center gap-1 shrink-0 ${hasTeam ? 'cursor-pointer' : ''}`}
          >
            <div className="relative">
              <div className={`rounded-full transition-all ${selectedIsMe ? 'ring-2 ring-[#E76124] ring-offset-2' : ''}`}>
                <Avatar name={name ?? '?'} photo={profilePic ?? undefined} userId={userId ?? undefined} size="xl" showPopover={false} />
              </div>
              {myActiveCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-[#E76124] text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none ring-1 ring-white">
                  {myActiveCount}
                </span>
              )}
            </div>
            <p className={`text-[10px] font-bold ${selectedIsMe ? 'text-[#E76124]' : 'text-gray-400'}`}>You</p>
          </button>

          {teamMembers.map(m => {
            const count = m.activeCount
            const isMemberDealer = m.role === 'dealer'
            const displayName = isMemberDealer ? (m.dealerName || m.name) : m.name.split(' ')[0]
            const isSelected = selectedMemberId === m._id
            return (
              <button key={m._id} onClick={() => selectMember(m._id)} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer">
                <div className="relative">
                  <div className={`rounded-full transition-all ${isSelected ? 'ring-2 ring-[#1E1951] ring-offset-2' : ''}`}>
                    <Avatar name={m.dealerName || m.name} role={m.role} photo={m.profilePic} userId={m._id} size="xl" showPopover={false} />
                  </div>
                  {isMemberDealer && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center bg-indigo-800">
                      <Handshake size={14} className="text-white" />
                    </span>
                  )}
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-[#E76124] text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none ring-1 ring-white">
                      {count}
                    </span>
                  )}
                </div>
                <p className={`text-[10px] font-medium max-w-[52px] truncate text-center ${isSelected ? 'text-[#1E1951] font-bold' : 'text-gray-500'}`}>
                  {displayName}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      <ActiveTaskSection
        activePdi={filteredActive}
        recentCompletedPdi={filteredCompleted}
        onActionComplete={reloadDashboard}
        filterLabel={filterLabel}
        onClearFilter={() => setSelectedMemberId(null)}
      />
    </div>
  )
}
