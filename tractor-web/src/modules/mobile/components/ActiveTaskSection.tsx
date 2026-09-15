import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import type { PdiEntry } from '../../../shared/data/types'
import { PdiCard } from './PdiCard'

// Discriminated union so Installation/Service slot in later without reshaping
// this component — add `{ kind: 'installation'; entry: InstallationEntry }` /
// `{ kind: 'service'; entry: ServiceEntry }` variants and a render branch below.
type SlideItem = { kind: 'pdi'; entry: PdiEntry }

interface Props {
  activePdi: PdiEntry[]
  recentCompletedPdi: PdiEntry[]
  onActionComplete?: () => void
  filterLabel?: string
  onClearFilter?: () => void
}

function renderSlide(item: SlideItem, onPress: () => void, onActionComplete?: () => void) {
  switch (item.kind) {
    case 'pdi':
      return <PdiCard entry={item.entry} onPress={onPress} onActionComplete={onActionComplete} />
  }
}

export function ActiveTaskSection({ activePdi, recentCompletedPdi, onActionComplete, filterLabel, onClearFilter }: Props) {
  const navigate = useNavigate()
  const [idx, setIdx] = useState(0)

  const activeSlides = useMemo<SlideItem[]>(() =>
    activePdi
      .slice()
      .sort((a, b) => new Date(a.pdiDate ?? a.createdAt).getTime() - new Date(b.pdiDate ?? b.createdAt).getTime())
      .map(entry => ({ kind: 'pdi', entry })),
  [activePdi])

  const recentSlides = useMemo<SlideItem[]>(() =>
    recentCompletedPdi
      .slice()
      .sort((a, b) => new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime())
      .slice(0, 3)
      .map(entry => ({ kind: 'pdi', entry })),
  [recentCompletedPdi])

  const showingActive = activeSlides.length > 0
  const showing = showingActive ? activeSlides : recentSlides
  const safeIdx = Math.min(idx, Math.max(0, showing.length - 1))

  function openEntry(entry: PdiEntry) {
    navigate(`/mobile/pdi/${entry._id}`)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-base font-bold text-gray-900 shrink-0">{showingActive ? 'Active Task' : 'Recent Task'}</p>
          {filterLabel && (
            <span className="flex items-center gap-1 bg-[#1E1951] text-white text-xs font-semibold px-2 py-0.5 rounded-full max-w-[120px]">
              <span className="truncate">{filterLabel}</span>
              <button onClick={onClearFilter} className="shrink-0 hover:opacity-70">
                <XCircle size={14} />
              </button>
            </span>
          )}
        </div>
        {showing.length > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIdx(i => Math.max(0, i - 1))}
              disabled={safeIdx === 0}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-30 transition-opacity"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <span className="text-sm text-gray-400 min-w-[32px] text-center">{safeIdx + 1}/{showing.length}</span>
            <button
              onClick={() => setIdx(i => Math.min(showing.length - 1, i + 1))}
              disabled={safeIdx === showing.length - 1}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center disabled:opacity-30 transition-opacity"
            >
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>
        )}
      </div>

      {showing.length > 0 ? (
        <div className="overflow-hidden">
          <div className="flex transition-transform duration-300 ease-in-out" style={{ transform: `translateX(-${safeIdx * 100}%)` }}>
            {showing.map(item => (
              <div key={item.entry._id} className="w-full shrink-0">
                {renderSlide(item, () => openEntry(item.entry), onActionComplete)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl px-5 py-10 text-center shadow-sm flex flex-col items-center gap-3">
          <span className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 size={26} className="text-green-500" />
          </span>
          <div>
            <p className="text-base font-bold text-gray-900">All caught up!</p>
            <p className="text-sm text-gray-400 mt-1">No active tasks right now.</p>
          </div>
        </div>
      )}
    </section>
  )
}
