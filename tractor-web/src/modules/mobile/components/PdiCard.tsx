import { useState } from 'react'
import { ClipboardCheck, Tag, Check, Play, CheckCheck, Loader2 } from 'lucide-react'
import type { PdiEntry } from '../../../shared/data/types'
import { Avatar } from '../../../shared/components/Avatar'
import { timeAgo } from '../../../shared/utils/dateUtils'
import { api } from '../../../shared/lib/api'
import { useAuth } from '../../../shared/context/AuthContext'

const STATUS_PILL: Record<PdiEntry['status'], string> = {
  assigned:       'bg-gray-100 text-gray-600',
  acknowledgment: 'bg-blue-100 text-blue-700',
  started:        'bg-amber-100 text-amber-700',
  continue:       'bg-[#fde9df] text-[#E76124]',
  completed:      'bg-green-100 text-green-700',
}

const STATUS_LABEL: Record<PdiEntry['status'], string> = {
  assigned: 'Assigned', acknowledgment: 'Acknowledgment', started: 'Started', continue: 'Continue', completed: 'Completed',
}

// Matches the CircleActionButton icon/color language on the PDI record page —
// the card's trailing button previews the *next available action*.
// For 'assigned'/'acknowledgment' the button performs that action directly
// (simple, reviewless state transitions); everything else navigates to the
// record instead, since Complete needs the checklist reviewed first.
const NEXT_ACTION: Record<PdiEntry['status'], { icon: typeof Check; className: string; endpoint?: 'acknowledge' | 'start' }> = {
  assigned:       { icon: Check,      className: 'bg-amber-500 text-white',  endpoint: 'acknowledge' },
  acknowledgment: { icon: Play,       className: 'bg-[#1E1951] text-white',  endpoint: 'start' },
  started:        { icon: CheckCheck, className: 'bg-green-600 text-white' },
  continue:       { icon: CheckCheck, className: 'bg-green-600 text-white' },
  completed:      { icon: CheckCheck, className: 'bg-gray-200 text-gray-400' },
}

function formatDateBadge(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleString('en-US', { month: 'short' })
  const year = String(d.getFullYear()).slice(-2)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${day}${month}${year} · ${time}`
}

interface Props {
  entry: PdiEntry
  onPress: () => void
  onActionComplete?: () => void
}

export function PdiCard({ entry, onPress, onActionComplete }: Props) {
  const { userId, role } = useAuth()
  const [acting, setActing] = useState(false)
  const tractor = entry.tractorId && typeof entry.tractorId !== 'string' ? entry.tractorId : null
  const nextAction = NEXT_ACTION[entry.status]
  const ActionIcon = nextAction.icon

  const privileged = role === 'admin' || role === 'rsm' || role === 'area_manager'
  const canAct = privileged || entry.assignedTo.userId === userId
  const isDirectAction = canAct && !!nextAction.endpoint

  async function handleActionClick() {
    if (!isDirectAction) { onPress(); return }
    setActing(true)
    try {
      await api.put(`/api/pdi-entries/${entry._id}/${nextAction.endpoint}`, {})
      onActionComplete?.()
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="w-full bg-white rounded-[2rem] p-4 flex flex-col gap-3 shadow-sm">
      <span className="self-start bg-[#E76124] text-white text-xs font-bold px-3 py-1.5 rounded-full">
        {formatDateBadge(entry.createdAt)}
      </span>

      <button onClick={onPress} className="flex items-center gap-3 bg-orange-50 rounded-2xl px-3 py-2.5 text-left">
        <span className="w-9 h-9 rounded-full bg-[#E76124] flex items-center justify-center shrink-0">
          <ClipboardCheck size={16} className="text-white" />
        </span>
        <div className="flex-1 flex items-baseline gap-2 min-w-0">
          <span className="font-bold text-gray-900">{entry.srNumber}</span>
          {tractor && <span className="text-sm text-gray-400 truncate">{tractor.chassisNo}</span>}
        </div>
        <Avatar name={entry.assignedTo.name} role={entry.assignedTo.role} size="sm" showPopover={false} />
      </button>

      {tractor && (
        <div className="border border-gray-100 rounded-2xl px-3 py-2.5 flex items-start gap-2">
          <Tag size={16} className="text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-gray-900">{tractor.tractorModel}</p>
            <p className="text-sm text-gray-500">Engine: {tractor.engineNo}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 bg-[#1E1951] text-white text-base font-semibold px-4 py-2.5 rounded-full">
        <ClipboardCheck size={16} />
        Pre-Delivery Inspection
      </div>

      {entry.remark && (
        <div className="bg-amber-50 rounded-xl px-3 py-2.5 flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
          <p className="text-sm text-gray-600">{entry.remark}</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <span className="flex items-center gap-1.5 bg-gray-900 text-white rounded-full pl-1 pr-3 py-1">
          <Avatar name={entry.assignedTo.name} role={entry.assignedTo.role} size="xs" showPopover={false} />
          <span className="text-xs font-medium">{timeAgo(entry.createdAt)}</span>
        </span>
        <span className={`text-xs font-medium px-2.5 py-1.5 rounded-full ${STATUS_PILL[entry.status]}`}>
          {STATUS_LABEL[entry.status]}
        </span>
        <button
          onClick={handleActionClick}
          disabled={acting}
          aria-label={isDirectAction ? nextAction.endpoint : 'View details'}
          className={`ml-auto w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-60 ${nextAction.className}`}
        >
          {acting ? <Loader2 size={18} className="animate-spin" /> : <ActionIcon size={18} />}
        </button>
      </div>
    </div>
  )
}
