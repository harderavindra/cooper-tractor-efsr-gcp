import { useState, useEffect, useCallback } from 'react'
import { changeLogApi, type ChangeLogEntry, type ChangeLogFilters } from '../../../shared/services/changeLogApi'
import { AuditLogFilters } from '../components/AuditLogFilters'
import { DiffTable } from '../../../shared/components/DiffTable'
import { timeAgo } from '../../../shared/utils/dateUtils'

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
}

const ACTION_BADGE: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
}

const ENTITY_ICON: Record<string, string> = {
  asset:      '⚙',
  user:       '👤',
  region:     '🗺',
  area:       '📍',
  labor_charge: '⚠',
  part:       '🔩',
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState<ChangeLogFilters>({ page: 1, limit: 20 })
  const [entries, setEntries] = useState<ChangeLogEntry[]>([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async (f: ChangeLogFilters) => {
    setLoading(true)
    try {
      const res = await changeLogApi.list(f)
      setEntries(res.data)
      setPagination(res.pagination)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(filters) }, [load, filters])

  function handleFilterChange(partial: Partial<ChangeLogFilters>) {
    setFilters(prev => ({ ...prev, ...partial }))
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1E1951]">Audit Log</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {pagination.total} change{pagination.total !== 1 ? 's' : ''} recorded
          </p>
        </div>
      </div>

      <AuditLogFilters filters={filters} onChange={handleFilterChange} />

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No changes found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">Time</th>
                <th className="px-4 py-3 text-left font-semibold">Entity</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Changed By</th>
                <th className="px-4 py-3 text-left font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const isExpanded = expanded.has(entry._id)
                return (
                  <>
                    <tr
                      key={entry._id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => entry.changes.length > 0 && toggleExpand(entry._id)}
                    >
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {timeAgo(entry.at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="mr-1.5">{ENTITY_ICON[entry.entityType] ?? '•'}</span>
                        <span className="font-medium text-gray-800">{entry.entityLabel}</span>
                        <span className="ml-1.5 text-xs text-gray-400 capitalize">
                          {entry.entityType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {CATEGORY_LABELS[entry.category] ?? entry.category}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {entry.by ? (
                          <>
                            <span className="font-medium text-gray-700">{entry.by.name}</span>
                            <span className="ml-1 text-gray-400 capitalize">
                              · {entry.by.role.replace(/_/g, ' ')}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ACTION_BADGE[entry.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {entry.action}
                        </span>
                        {entry.changes.length > 0 && (
                          <span className="ml-2 text-xs text-gray-400">
                            {isExpanded ? '▲' : '▼'} {entry.changes.length} field{entry.changes.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && entry.changes.length > 0 && (
                      <tr key={`${entry._id}-diff`} className="bg-gray-50 border-b border-gray-100">
                        <td colSpan={5} className="px-6 py-3">
                          <DiffTable changes={entry.changes} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-400 text-xs">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => handleFilterChange({ page: Math.max(1, (filters.page ?? 1) - 1) })}
              disabled={(filters.page ?? 1) <= 1}
              className="h-8 w-8 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const p = i + 1
              const cur = filters.page ?? 1
              return (
                <button
                  key={p}
                  onClick={() => handleFilterChange({ page: p })}
                  className={`h-8 w-8 flex items-center justify-center rounded border text-xs font-medium ${
                    p === cur
                      ? 'border-[#E76124] bg-[#E76124] text-white'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => handleFilterChange({ page: Math.min(pagination.pages, (filters.page ?? 1) + 1) })}
              disabled={(filters.page ?? 1) >= pagination.pages}
              className="h-8 w-8 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
