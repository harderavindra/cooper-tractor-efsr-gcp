import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../../../shared/lib/api'

export interface UserOption {
  _id: string
  name: string
  role: string
  username: string
  dealerName?: string
}

interface Props {
  value: UserOption | null
  onChange: (user: UserOption | null) => void
  excludeUserId?: string
  placeholder?: string
}

export function UserPicker({ value, onChange, excludeUserId, placeholder }: Props) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get<UserOption[]>('/api/users').then(setUsers).catch(() => setUsers([]))
  }, [])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const matches = users
    .filter(u => u._id !== excludeUserId)
    .filter(u =>
      !q.trim() ||
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      u.username.toLowerCase().includes(q.toLowerCase()) ||
      u.role.toLowerCase().includes(q.toLowerCase())
    )
    .slice(0, 30)

  if (value) {
    return (
      <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50">
        <div>
          <p className="font-medium text-gray-800">{value.name}</p>
          <p className="text-xs text-gray-500">{value.role}{value.dealerName ? ` — ${value.dealerName}` : ''}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? 'Search by name, username or role…'}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {matches.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">No matches</p>}
          {matches.map(u => (
            <button
              key={u._id}
              type="button"
              onClick={() => { onChange(u); setOpen(false); setQ('') }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
            >
              <p className="font-medium text-gray-800">{u.name}</p>
              <p className="text-xs text-gray-400">{u.role}{u.dealerName ? ` — ${u.dealerName}` : ''}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
