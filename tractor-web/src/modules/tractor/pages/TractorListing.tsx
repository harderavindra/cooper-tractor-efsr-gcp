import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, X, Truck } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import type { TractorAsset } from '../../../shared/data/types'
import { useTractorSearch } from '../hooks/useTractorSearch'

const STATUS_LABEL: Record<TractorAsset['status'], string> = {
  not_dispatched: 'Not Dispatched',
  dispatched:     'Dispatched',
  pdi_completed:  'PDI Completed',
  sold:           'Sold',
}

const STATUS_COLOR: Record<TractorAsset['status'], string> = {
  not_dispatched: 'bg-gray-100 text-gray-600',
  dispatched:     'bg-amber-100 text-amber-700',
  pdi_completed:  'bg-sky-100 text-sky-700',
  sold:           'bg-green-100 text-green-700',
}

function customerLabel(c: TractorAsset['customerId']): string {
  if (!c || typeof c === 'string') return '—'
  return c.fullName
}

export default function TractorListing() {
  const navigate = useNavigate()
  const [tractors, setTractors] = useState<TractorAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const fallback = useTractorSearch()

  useEffect(() => {
    api.get<TractorAsset[]>('/api/tractor-assets').then(setTractors).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return tractors
    return tractors.filter(t =>
      t.chassisNo.toLowerCase().includes(term) ||
      t.engineNo.toLowerCase().includes(term) ||
      t.tractorModel.toLowerCase().includes(term) ||
      t.registrationNo?.toLowerCase().includes(term)
    )
  }, [tractors, q])

  const stats = useMemo(() => ({
    total:      tractors.length,
    dispatched: tractors.filter(t => t.status !== 'not_dispatched').length,
    sold:       tractors.filter(t => t.status === 'sold').length,
  }), [tractors])

  useEffect(() => {
    if (q.trim() && filtered.length === 0) fallback.search(q)
  }, [q, filtered.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1E1951]">Tractor</h1>
          <p className="text-sm text-gray-500">Tractor registry — the reference point for all tractor activity</p>
        </div>
        <button
          onClick={() => navigate('/tractor/new')}
          className="flex items-center gap-1.5 bg-[#1E1951] hover:bg-[#1E1951]/90 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
        >
          <Plus size={16} /> New Tractor
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Truck size={18} /></div>
          <div><p className="text-lg font-semibold text-gray-800">{stats.total}</p><p className="text-xs text-gray-400">Total</p></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-lg font-semibold text-gray-800">{stats.dispatched}</p><p className="text-xs text-gray-400">Dispatched</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-lg font-semibold text-gray-800">{stats.sold}</p><p className="text-xs text-gray-400">Sold</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by chassis, engine, model, reg. no…"
          className="w-full border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {q.trim() && filtered.length === 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-3 text-sm text-amber-800">
          {fallback.state === 'searching' && 'Not in the Tractor registry — checking SAP-Tractor…'}
          {fallback.state === 'not_found' && 'Not found in the Tractor registry or SAP-Tractor.'}
          {fallback.state === 'sap_found' && (
            <div className="flex flex-col gap-2">
              <p>Not registered yet, but found in SAP-Tractor:</p>
              {fallback.sapMatches.map(m => (
                <div key={m._id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                  <span>{m.chassisNo} — {m.tractorModel || 'Unknown model'}</span>
                  <button
                    onClick={() => navigate(`/tractor/new?sap=${m._id}`)}
                    className="text-indigo-600 font-medium hover:underline"
                  >
                    Create Tractor from this record →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="px-4 py-3">Chassis / Engine</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Dispatch Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No tractors found</td></tr>
            )}
            {!loading && filtered.map(t => (
              <tr
                key={t._id}
                onClick={() => navigate(`/tractor/${t._id}`)}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{t.chassisNo}</p>
                  <p className="text-xs text-gray-400">{t.engineNo}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{t.tractorModel}</td>
                <td className="px-4 py-3 text-gray-600">{customerLabel(t.customerId)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[t.status]}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{t.dispatchDate ? new Date(t.dispatchDate).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
          {filtered.length} of {tractors.length} tractor(s)
        </div>
      </div>
    </div>
  )
}
