import { useEffect, useRef, useState } from 'react'
import { Search, X, Plus } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import type { Customer } from '../../../shared/data/types'

interface Props {
  value: Customer | null
  onChange: (customer: Customer | null) => void
}

export function CustomerPicker({ value, onChange }: Props) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      api.get<Customer[]>(`/api/customers/search?q=${encodeURIComponent(q)}`).then(setResults).catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [q])

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const customer = await api.post<Customer>('/api/customers', {
        fullName: newName.trim(),
        primaryContactNo: newPhone.trim() || undefined,
      })
      onChange(customer)
      setCreating(false)
      setOpen(false)
      setNewName('')
      setNewPhone('')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full'

  if (value) {
    return (
      <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50">
        <div>
          <p className="font-medium text-gray-800">{value.fullName}</p>
          {value.primaryContactNo && <p className="text-xs text-gray-500">{value.primaryContactNo}</p>}
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      {!creating ? (
        <>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder="Search customer by name or phone…"
              className={`${inputClass} pl-8`}
            />
          </div>
          {open && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
              {results.map(c => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); setQ('') }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                >
                  <p className="font-medium text-gray-800">{c.fullName}</p>
                  {c.primaryContactNo && <p className="text-xs text-gray-500">{c.primaryContactNo}</p>}
                </button>
              ))}
              {q.trim() && results.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-400">No matches</p>
              )}
              <button
                type="button"
                onClick={() => { setCreating(true); setNewName(q) }}
                className="w-full flex items-center gap-1.5 text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 border-t border-gray-100"
              >
                <Plus size={14} /> Add new customer
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="border border-gray-200 rounded-lg p-3 flex flex-col gap-2 bg-gray-50">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full Name" className={inputClass} />
          <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Primary Contact No" className={inputClass} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className="text-xs text-gray-500 hover:underline">Cancel</button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create & Select'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
