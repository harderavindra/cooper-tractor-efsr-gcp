import { useState } from 'react'
import { ChevronDown, Search, X, CheckCircle2 } from 'lucide-react'
import { Avatar } from '../../../shared/components/Avatar'

export interface SelectSheetItem {
  id: string
  label: string
  sublabel?: string
}

interface Props {
  open: boolean
  title: string
  subtitle?: string
  items: SelectSheetItem[]
  selectedId?: string | null
  onSelect: (item: SelectSheetItem) => void
  onCancel: () => void
  onConfirm: () => void
  confirmDisabled?: boolean
  confirmLabel?: string
}

export function MobileSelectSheet({
  open, title, subtitle, items, selectedId, onSelect, onCancel, onConfirm, confirmDisabled, confirmLabel = 'Confirm',
}: Props) {
  const [q, setQ] = useState('')
  if (!open) return null

  const filtered = items.filter(i =>
    !q.trim() || i.label.toLowerCase().includes(q.toLowerCase()) || i.sublabel?.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-[420px] mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="border-b border-gray-100 px-5 pt-3 pb-3 shrink-0">
          <div className="flex justify-center mb-2">
            <ChevronDown size={18} className="text-gray-300" />
          </div>
          <p className="text-base font-bold text-gray-900">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full border border-gray-200 rounded-xl bg-gray-50 pl-8 pr-8 py-2.5 text-sm focus:outline-none"
            />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">{filtered.length} result{filtered.length === 1 ? '' : 's'}</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.map(item => {
            const selected = item.id === selectedId
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-left ${selected ? 'bg-orange-50' : ''}`}
              >
                <Avatar name={item.label} size="md" showPopover={false} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.label}</p>
                  {item.sublabel && <p className="text-xs text-gray-400 truncate">{item.sublabel}</p>}
                </div>
                {selected ? (
                  <CheckCircle2 size={20} className="text-[#E76124] shrink-0" />
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-gray-200 shrink-0" />
                )}
              </button>
            )
          })}
          {filtered.length === 0 && <p className="px-5 py-6 text-sm text-gray-400 text-center">No matches</p>}
        </div>

        <div className="border-t border-gray-100 px-5 py-3 flex gap-2 shrink-0">
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="flex-1 py-3 rounded-2xl bg-[#E76124] text-white text-sm font-bold disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
