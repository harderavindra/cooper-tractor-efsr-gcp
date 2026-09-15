import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, X, ClipboardCheck } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import type { PdiEntry } from '../../../shared/data/types'

const STATUS_LABEL: Record<PdiEntry['status'], string> = {
  assigned:      'Assigned',
  acknowledgment: 'Acknowledgment',
  started:       'Started',
  continue:      'Continue',
  completed:     'Completed',
}

const STATUS_COLOR: Record<PdiEntry['status'], string> = {
  assigned:       'bg-gray-100 text-gray-600',
  acknowledgment: 'bg-amber-100 text-amber-700',
  started:        'bg-sky-100 text-sky-700',
  continue:       'bg-indigo-100 text-indigo-700',
  completed:      'bg-green-100 text-green-700',
}

function tractorLabel(t: PdiEntry['tractorId']): string {
  if (!t || typeof t === 'string') return '—'
  return `${t.chassisNo} — ${t.tractorModel}`
}

export default function PdiListing() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<PdiEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<PdiEntry['status'] | ''>('')

  useEffect(() => {
    const qs = statusFilter ? `?status=${statusFilter}` : ''
    api.get<PdiEntry[]>(`/api/pdi-entries${qs}`).then(setEntries).finally(() => setLoading(false))
  }, [statusFilter])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return entries
    return entries.filter(e =>
      e.srNumber.toLowerCase().includes(term) ||
      tractorLabel(e.tractorId).toLowerCase().includes(term) ||
      e.assignedTo.name.toLowerCase().includes(term)
    )
  }, [entries, q])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1E1951]">PDI</h1>
          <p className="text-sm text-gray-500">Pre-Delivery Inspection records</p>
        </div>
        <button
          onClick={() => navigate('/pdi/new')}
          className="flex items-center gap-1.5 bg-[#1E1951] hover:bg-[#1E1951]/90 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
        >
          <Plus size={16} /> New PDI
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by SR No, tractor, assignee…"
            className="w-full border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as PdiEntry['status'] | '')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="px-4 py-3">SR No</th>
              <th className="px-4 py-3">Tractor</th>
              <th className="px-4 py-3">Assigned To</th>
              <th className="px-4 py-3">PDI Date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No PDI records found</td></tr>
            )}
            {!loading && filtered.map(e => (
              <tr
                key={e._id}
                onClick={() => navigate(`/pdi/${e._id}`)}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
                  <ClipboardCheck size={14} className="text-gray-400" /> {e.srNumber}
                </td>
                <td className="px-4 py-3 text-gray-600">{tractorLabel(e.tractorId)}</td>
                <td className="px-4 py-3 text-gray-600">{e.assignedTo.name}</td>
                <td className="px-4 py-3 text-gray-500">{e.pdiDate ? new Date(e.pdiDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[e.status]}`}>
                    {STATUS_LABEL[e.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
          {filtered.length} of {entries.length} record(s)
        </div>
      </div>
    </div>
  )
}
