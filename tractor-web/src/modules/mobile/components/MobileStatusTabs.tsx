export type PdiFilter = 'all' | 'active' | 'completed'

interface Props {
  value: PdiFilter
  onChange: (v: PdiFilter) => void
  counts: Record<PdiFilter, number>
}

const TABS: { value: PdiFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

export function MobileStatusTabs({ value, onChange, counts }: Props) {
  return (
    <div className="flex items-center bg-white rounded-full p-1 border border-[#FFC3A8]">
      {TABS.map(t => {
        const isActive = value === t.value
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-semibold transition-all ${
              isActive ? 'text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
            style={isActive ? { background: 'linear-gradient(90deg, #FA9568 0%, #F5B38E 100%)' } : undefined}
          >
            {t.label}
            {counts[t.value] > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/30 text-gray-900' : 'bg-gray-100 text-gray-500'}`}>
                {counts[t.value]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
