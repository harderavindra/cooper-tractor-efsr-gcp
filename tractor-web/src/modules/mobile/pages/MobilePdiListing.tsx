import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import { useAuth } from '../../../shared/context/AuthContext'
import type { PdiEntry } from '../../../shared/data/types'
import { MobileStatusTabs, type PdiFilter } from '../components/MobileStatusTabs'
import { PdiCard } from '../components/PdiCard'

const ACTIVE_STATUSES = new Set<PdiEntry['status']>(['assigned', 'acknowledgment', 'started', 'continue'])

export default function MobilePdiListing() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [entries, setEntries] = useState<PdiEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<PdiFilter>('all')

  function reload() {
    return api.get<PdiEntry[]>('/api/pdi-entries').then(setEntries)
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  const myEntries = useMemo(() => entries.filter(e => e.assignedTo.userId === userId), [entries, userId])
  const activeCount = useMemo(() => myEntries.filter(e => ACTIVE_STATUSES.has(e.status)).length, [myEntries])
  const completedCount = myEntries.length - activeCount

  const counts = { all: myEntries.length, active: activeCount, completed: completedCount }

  const filtered = useMemo(() => {
    if (filter === 'all') return myEntries
    if (filter === 'active') return myEntries.filter(e => ACTIVE_STATUSES.has(e.status))
    return myEntries.filter(e => e.status === 'completed')
  }, [myEntries, filter])

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xl font-bold text-gray-900">PDI</p>
        <button
          onClick={() => navigate('/mobile/pdi/new')}
          className="flex items-center gap-1.5 bg-[#E76124] text-white text-sm font-semibold rounded-full px-4 py-2"
        >
          <Plus size={16} /> New
        </button>
      </div>

      <MobileStatusTabs value={filter} onChange={setFilter} counts={counts} />

      {loading && <p className="text-sm text-gray-400 text-center py-6">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">No PDIs here</p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map(e => (
          <PdiCard key={e._id} entry={e} onPress={() => navigate(`/mobile/pdi/${e._id}`)} onActionComplete={reload} />
        ))}
      </div>
    </div>
  )
}
