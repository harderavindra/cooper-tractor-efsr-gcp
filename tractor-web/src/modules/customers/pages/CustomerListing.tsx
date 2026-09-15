import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, X } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import type { Customer } from '../../../shared/data/types'

export default function CustomerListing() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    api.get<Customer[]>('/api/customers')
      .then(setCustomers)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return customers
    return customers.filter(c =>
      c.fullName.toLowerCase().includes(term) ||
      c.primaryContactNo?.toLowerCase().includes(term) ||
      c.alternateContactNo?.toLowerCase().includes(term)
    )
  }, [customers, q])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1E1951]">Customers</h1>
          <p className="text-sm text-gray-500">Manage customer records</p>
        </div>
        <button
          onClick={() => navigate('/customers/new')}
          className="flex items-center gap-1.5 bg-[#1E1951] hover:bg-[#1E1951]/90 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
        >
          <Plus size={16} /> New Customer
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name or phone…"
          className="w-full border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="px-4 py-3">Full Name</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Primary Contact</th>
              <th className="px-4 py-3">Alternate Contact</th>
              <th className="px-4 py-3">City / District</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No customers found</td></tr>
            )}
            {!loading && filtered.map(c => (
              <tr
                key={c._id}
                onClick={() => navigate(`/customers/${c._id}`)}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-4 py-3 font-medium text-gray-800">{c.fullName}</td>
                <td className="px-4 py-3 text-gray-500">{c.gender ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">
                  {c.primaryContactName ? `${c.primaryContactName} — ` : ''}{c.primaryContactNo ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {c.alternateContactName ? `${c.alternateContactName} — ` : ''}{c.alternateContactNo ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {[c.address?.city, c.address?.district].filter(Boolean).join(', ') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400">
          {filtered.length} of {customers.length} customer(s)
        </div>
      </div>
    </div>
  )
}
