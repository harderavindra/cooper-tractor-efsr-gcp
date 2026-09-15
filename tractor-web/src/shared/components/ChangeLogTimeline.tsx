import { useState, useEffect, useCallback } from 'react'
import { changeLogApi, type ChangeLogEntry } from '../services/changeLogApi'
import { DiffTable } from './DiffTable'
import { timeAgo } from '../utils/dateUtils'

const CATEGORY_LABELS: Record<string, string> = {
  asset_info:        'Asset Info',
  asset_client:      'Client Info',
  asset_contacts:    'Contact Info',
  user_profile:      'Profile',
  user_role:         'Role',
  user_status:       'Status',
  user_hierarchy:    'Hierarchy',
  master_region:     'Region',
  master_area:       'Area',
  master_labor_charge: 'Labor Charge',
  master_part:       'Part',
  customer_info:     'Customer Info',
  tractor_info:      'Tractor Info',
  pdi_info:          'PDI Info',
}

const CATEGORY_DOT: Record<string, string> = {
  asset_client:   'bg-orange-400',
  asset_contacts: 'bg-amber-400',
  asset_info:     'bg-sky-400',
  user_role:      'bg-purple-500',
  user_status:    'bg-gray-500',
  user_hierarchy: 'bg-indigo-400',
  user_profile:   'bg-blue-400',
  customer_info:  'bg-teal-400',
  tractor_info:   'bg-lime-500',
  pdi_info:       'bg-fuchsia-400',
}

const ACTION_DOT: Record<string, string> = {
  created: 'bg-green-500',
  deleted: 'bg-red-500',
}

function dot(entry: ChangeLogEntry): string {
  if (entry.action !== 'updated') return ACTION_DOT[entry.action] ?? 'bg-gray-400'
  return CATEGORY_DOT[entry.category] ?? 'bg-gray-400'
}

interface Props {
  entityType: string
  entityId:   string
}

export function ChangeLogTimeline({ entityType, entityId }: Props) {
  const [entries, setEntries]         = useState<ChangeLogEntry[] | null>(null)
  const [page, setPage]               = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [loading, setLoading]         = useState(false)
  const [expanded, setExpanded]       = useState<Set<string>>(new Set())
  const [showAll, setShowAll]         = useState(false)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await changeLogApi.forEntity(entityType, entityId, p)
      setEntries(prev => p === 1 ? res.data : [...(prev ?? []), ...res.data])
      setTotalPages(res.pagination.pages)
      setPage(p)
    } catch {
      // silently fail — history is non-critical
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => { load(1) }, [load])

  if (loading && !entries) {
    return (
      <div className="px-4 py-6 text-center text-sm text-gray-400">Loading history…</div>
    )
  }

  if (!entries?.length) {
    return (
      <div className="px-4 py-6 text-center text-sm text-gray-400">No change history yet.</div>
    )
  }

  const visible = showAll ? entries : entries.slice(0, 5)

  return (
    <div className="px-4 py-3">
      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-100" />
        <div className="space-y-0">
          {visible.map(entry => {
            const isExpanded = expanded.has(entry._id)
            return (
              <div key={entry._id} className="flex items-start gap-3 relative py-2">
                <span className={`w-3.5 h-3.5 rounded-full shrink-0 mt-1 ring-2 ring-white ${dot(entry)}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      {CATEGORY_LABELS[entry.category] ?? entry.category} {entry.action}
                    </p>
                    <p className="text-xs text-gray-400 shrink-0">{timeAgo(entry.at)}</p>
                  </div>
                  {entry.by && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {entry.by.name}
                      <span className="ml-1 text-gray-300 capitalize">· {entry.by.role.replace(/_/g, ' ')}</span>
                    </p>
                  )}
                  {entry.changes.length > 0 && (
                    <button
                      onClick={() => setExpanded(prev => {
                        const next = new Set(prev)
                        if (next.has(entry._id)) next.delete(entry._id)
                        else next.add(entry._id)
                        return next
                      })}
                      className="mt-1 text-xs text-[#E76124] hover:underline"
                    >
                      {isExpanded ? 'Hide changes' : `${entry.changes.length} field${entry.changes.length !== 1 ? 's' : ''} changed`}
                    </button>
                  )}
                  {isExpanded && <DiffTable changes={entry.changes} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {entries.length > 5 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Show {entries.length - 5} more
        </button>
      )}

      {page < totalPages && (
        <button
          onClick={() => load(page + 1)}
          disabled={loading}
          className="mt-3 block text-xs text-[#E76124] hover:underline disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load older changes'}
        </button>
      )}
    </div>
  )
}
