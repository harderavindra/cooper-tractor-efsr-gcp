import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { UploadCloud, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import type { SapTractorAsset } from '../../../shared/data/types'

interface Paginated {
  data: SapTractorAsset[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export default function SapTractorListing() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? '1')
  const [q, setQ] = useState(params.get('q') ?? '')

  const [rows, setRows] = useState<SapTractorAsset[]>([])
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function load() {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page), limit: '20' })
    if (q.trim()) qs.set('q', q.trim())
    api.get<Paginated>(`/api/sap-tractor-assets?${qs.toString()}`)
      .then(res => { setRows(res.data); setPages(res.pagination.pages); setTotal(res.pagination.total) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchSubmit() {
    setParams({ page: '1', ...(q.trim() ? { q: q.trim() } : {}) })
    load()
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setBanner(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await api.upload<{ upserted: number; modified: number; skipped: number; total: number }>(
        '/api/sap-tractor-assets/import', formData
      )
      setBanner({ type: 'success', text: `Imported: ${result.upserted} new, ${result.modified} updated, ${result.skipped} skipped (of ${result.total} rows)` })
      load()
    } catch (err) {
      setBanner({ type: 'error', text: err instanceof Error ? err.message : 'Import failed' })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1E1951]">SAP Tractor</h1>
          <p className="text-sm text-gray-500">Imported SAP records — reference source until the live SAP API is available</p>
        </div>
        <label className="flex items-center gap-1.5 bg-[#1E1951] hover:bg-[#1E1951]/90 text-white text-sm font-medium rounded-lg px-3 py-2 cursor-pointer transition-colors">
          {importing ? 'Importing…' : (<><UploadCloud size={16} /> Import Excel / CSV</>)}
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={importing} onChange={handleImport} />
        </label>
      </div>

      {banner && (
        <div className={`rounded-lg px-3 py-2 text-sm ${banner.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {banner.text}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
          placeholder="Search by chassis, engine, model…"
          className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="px-4 py-3">Chassis / Engine</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Dispatch Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No SAP records found</td></tr>
            )}
            {!loading && rows.map(r => (
              <tr key={r._id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{r.chassisNo}</p>
                  <p className="text-xs text-gray-400">{r.engineNo || '—'}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{r.tractorModel || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{r.customerName || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  {r._status.registered ? (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">Registered</span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">Not Registered</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {r._status.registered ? (
                    <button onClick={() => navigate(`/tractor/${r._status.tractorId}`)} className="text-indigo-600 text-xs font-medium hover:underline">
                      View Tractor
                    </button>
                  ) : (
                    <button onClick={() => navigate(`/tractor/new?sap=${r._id}`)} className="text-indigo-600 text-xs font-medium hover:underline">
                      Create Tractor →
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
          <span>{total} record(s) — page {page} of {pages || 1}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setParams({ page: String(page - 1), ...(q.trim() ? { q: q.trim() } : {}) })}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setParams({ page: String(page + 1), ...(q.trim() ? { q: q.trim() } : {}) })}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
