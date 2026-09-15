import { useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

export interface PartOption {
  _id: string
  componentNumber: string
  description: string
}

interface Props {
  open: boolean
  parts: PartOption[]
  alreadyAdded: Set<string>
  onSelect: (part: PartOption) => void
  onClose: () => void
}

export function PartPickerSheet({ open, parts, alreadyAdded, onSelect, onClose }: Props) {
  const [q, setQ] = useState('')
  if (!open) return null

  const filtered = parts.filter(p =>
    !q.trim() || p.componentNumber.toLowerCase().includes(q.toLowerCase()) || p.description.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[420px] mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="border-b border-gray-100 px-5 pt-3 pb-3 shrink-0">
          <div className="flex justify-center mb-2">
            <ChevronDown size={18} className="text-gray-300" />
          </div>
          <p className="text-base font-bold text-gray-900">Add Part</p>
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search component number or description…"
              className="w-full border border-gray-200 rounded-xl bg-gray-50 pl-8 pr-8 py-2.5 text-sm focus:outline-none"
            />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.map(p => {
            const added = alreadyAdded.has(p.componentNumber)
            return (
              <button
                key={p._id}
                disabled={added}
                onClick={() => onSelect(p)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-left ${added ? 'opacity-40' : 'active:bg-orange-50'}`}
              >
                <span className="font-mono text-xs font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded-lg shrink-0">
                  {p.componentNumber}
                </span>
                <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{p.description}</span>
              </button>
            )
          })}
          {filtered.length === 0 && <p className="px-5 py-6 text-sm text-gray-400 text-center">No matches</p>}
        </div>

        <div className="border-t border-gray-100 px-5 py-3 shrink-0">
          <button onClick={onClose} className="w-full py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
