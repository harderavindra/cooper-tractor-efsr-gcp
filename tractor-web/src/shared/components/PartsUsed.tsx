import { useEffect, useState, useMemo } from 'react'
import { api } from '../lib/api'

// ── types ─────────────────────────────────────────────────────────────────────

export interface Part {
  _id:             string
  componentNumber: string
  description:     string
  engineFamily?:   string[]
  cpcbNorm?:       string
  maxQty?:         number
}

export interface PartEntry {
  partId:          string
  componentNumber: string
  description:     string
  engineFamily?:   string[]
  cpcbNorm?:       string
  maxQty?:         number
  quantity:        number
  decision?:       'PENDING' | 'APPROVED' | 'REJECTED'
}

// ── popup: select one part ────────────────────────────────────────────────────

function PartSelectPopup({
  parts, alreadySelected, onSelect, onClose, assetEngineFamily, assetCpcbNorm,
}: {
  parts:              Part[]
  alreadySelected:    Set<string>
  onSelect:           (p: Part) => void
  onClose:            () => void
  assetEngineFamily?: string
  assetCpcbNorm?:     string
}) {
  const [search, setSearch] = useState('')

  const assetKnown = !!assetEngineFamily || !!assetCpcbNorm

  const compatMatches = useMemo(() => {
    if (!assetKnown) return parts
    return parts.filter(p => {
      const efMatch   = !assetEngineFamily || !p.engineFamily?.length || p.engineFamily.includes(assetEngineFamily)
      const cpcbMatch = !assetCpcbNorm || !p.cpcbNorm || p.cpcbNorm === assetCpcbNorm
      return efMatch && cpcbMatch
    })
  }, [parts, assetKnown, assetEngineFamily, assetCpcbNorm])

  const noCompatMatches = assetKnown && parts.length > 0 && compatMatches.length === 0
  const matched = noCompatMatches ? parts : compatMatches

  const q = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return matched
    return matched.filter(
      p => p.componentNumber.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    )
  }, [matched, q])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-[#1E1951]">Select Part</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Asset compatibility banner */}
        {noCompatMatches ? (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-[11px] text-gray-500 font-medium">
            No parts match this genset's
            {assetEngineFamily && <> Engine Family (<strong>{assetEngineFamily}</strong>)</>}
            {assetEngineFamily && assetCpcbNorm && ' / '}
            {assetCpcbNorm && <> CPCB Norm (<strong>{assetCpcbNorm}</strong>)</>}
            {' '}— showing all parts instead
          </div>
        ) : assetKnown ? (
          <div className="px-4 py-2 bg-[#fef4ef] border-b border-[#fde9df] text-[11px] text-[#E76124] font-medium">
            {assetEngineFamily && <> Engine Family: <strong>{assetEngineFamily}</strong></>}
            {assetEngineFamily && assetCpcbNorm && ' · '}
            {assetCpcbNorm && <> CPCB Norm: <strong>{assetCpcbNorm}</strong></>}
          </div>
        ) : (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-[11px] text-gray-500 font-medium">
            Showing all parts — this genset's Engine Family / CPCB Norm isn't set
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#E76124] focus-within:border-[#E76124] transition">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
            </svg>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search component number or description…"
              className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No parts match "{search}"</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(p => (
                <PartRow key={p._id} p={p} already={alreadySelected.has(p._id)} onSelect={() => { onSelect(p); onClose() }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PartRow({ p, already, onSelect }: { p: Part; already: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      disabled={already}
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        already ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#fef4ef] active:bg-[#fde9df]'
      }`}
    >
      <span className="font-mono text-xs font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded-lg shrink-0">
        {p.componentNumber}
      </span>
      <span className="text-xs text-gray-700 flex-1 min-w-0 truncate font-medium">{p.description}</span>
      {p.maxQty != null && (
        <span className="text-[10px] text-gray-400 shrink-0">Max {p.maxQty}</span>
      )}
    </button>
  )
}

// ── part card with quantity controls ──────────────────────────────────────────

const DECISION_BADGE: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: 'Approved',  cls: 'bg-green-100 text-green-700' },
  PENDING:  { label: 'AM Review', cls: 'bg-amber-100 text-amber-700' },
  REJECTED: { label: 'Rejected',  cls: 'bg-red-100   text-red-600'   },
}

export function PartCard({ entry, onRemove, onQtyAutoSave, readOnly = false }: {
  entry:          PartEntry
  onRemove:       () => void
  onQtyAutoSave?: (qty: number) => Promise<void>
  readOnly?:      boolean
}) {
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [saveErr, setSaveErr] = useState('')

  const canRemove = !readOnly && (!entry.decision || entry.decision === 'REJECTED')
  const badge     = entry.decision ? DECISION_BADGE[entry.decision] : null
  const overMax   = entry.maxQty != null && entry.quantity > entry.maxQty

  async function handleQty(qty: number) {
    if (!onQtyAutoSave) return
    setSaving(true); setSaveErr(''); setSaved(false)
    try {
      await onQtyAutoSave(qty)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-4 py-4 space-y-2">
      {/* Badges row */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-xs font-bold bg-[#fde9df] text-[#E76124] px-2.5 py-0.5 rounded-lg">
          {entry.componentNumber}
        </span>
        {entry.cpcbNorm && (
          <span className="text-[11px] font-bold bg-[#fde9df] text-[#E76124] px-2.5 py-0.5 rounded-lg">
            {entry.cpcbNorm}
          </span>
        )}
        {entry.maxQty != null && (
          <span className="text-[11px] font-bold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-lg">
            Max Qty: {entry.maxQty}
          </span>
        )}
        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
            {badge.label}
          </span>
        )}
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <span className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-gray-300">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>
        )}
      </div>

      {/* Description + engine family */}
      <p className="text-sm font-bold text-[#1E1951] leading-snug">{entry.description}</p>
      {entry.engineFamily && entry.engineFamily.length > 0 && (
        <p className="text-[11px] text-gray-400 mt-0.5 mb-3">{entry.engineFamily.join(', ')}</p>
      )}

      {/* Bottom row: save status + qty */}
      {readOnly ? (
        <div className="flex items-center justify-end">
          <span className="text-sm font-bold text-gray-700 border border-gray-200 px-3 py-1 rounded-xl">×{entry.quantity}</span>
        </div>
      ) : entry.maxQty === 1 ? (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">Max qty is 1</span>
          <span className="text-sm font-bold text-gray-700 border border-gray-200 px-3 py-1 rounded-xl">×1</span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-[10px] h-6 flex items-center">
            {saving ? (
              <span className="flex items-center gap-1 text-gray-400">
                <span className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                Saving…
              </span>
            ) : saved ? (
              <span className="flex items-center gap-1 text-green-600 font-semibold">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            ) : saveErr ? (
              <span className="text-red-500">{saveErr}</span>
            ) : overMax ? (
              <span className="text-amber-600 font-semibold">Exceeds max qty ({entry.maxQty})</span>
            ) : null}
          </span>

          {/* Stepper */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleQty(Math.max(1, entry.quantity - 1))}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 hover:border-gray-300 flex items-center justify-center text-gray-500 disabled:opacity-40 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
              </svg>
            </button>
            <span className="w-6 text-center text-sm font-bold text-[#1E1951]">{entry.quantity}</span>
            <button
              type="button"
              disabled={saving || (entry.maxQty != null && entry.quantity >= entry.maxQty)}
              onClick={() => handleQty(entry.quantity + 1)}
              className="w-8 h-8 rounded-full bg-white border border-gray-200 hover:border-gray-300 flex items-center justify-center text-gray-500 disabled:opacity-40 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  entries:            PartEntry[]
  onChange:           (entries: PartEntry[]) => void
  onAutoSave?:        (entries: PartEntry[]) => Promise<void>
  assetEngineFamily?: string
  assetCpcbNorm?:     string
}

export default function PartsUsed({ entries, onChange, onAutoSave, assetEngineFamily, assetCpcbNorm }: Props) {
  const [parts, setParts]         = useState<Part[]>([])
  const [loading, setLoading]     = useState(true)
  const [popupOpen, setPopupOpen] = useState(false)

  useEffect(() => {
    api.get<Part[]>('/api/parts')
      .then(setParts)
      .finally(() => setLoading(false))
  }, [])

  const selectedIds = useMemo(() => new Set(entries.map(e => e.partId)), [entries])

  function handleSelect(p: Part) {
    const newEntries = [...entries, {
      partId:          p._id,
      componentNumber: p.componentNumber,
      description:     p.description,
      engineFamily:    p.engineFamily,
      cpcbNorm:        p.cpcbNorm,
      maxQty:          p.maxQty,
      quantity:        1,
    }]
    onChange(newEntries)
    onAutoSave?.(newEntries)
  }

  function makeQtyHandler(index: number) {
    return async (qty: number) => {
      const newEntries = entries.map((e, i) => i === index ? { ...e, quantity: qty } : e)
      onChange(newEntries)
      await onAutoSave?.(newEntries)
    }
  }

  function handleRemove(index: number) {
    const entry = entries[index]
    if (entry?.decision && entry.decision !== 'REJECTED') return
    const newEntries = entries.filter((_, i) => i !== index)
    onChange(newEntries)
    onAutoSave?.(newEntries)
  }

  return (
    <div className="space-y-3">
      {/* Part cards */}
      {entries.map((entry, i) => (
        <PartCard
          key={entry.partId}
          entry={entry}
          onRemove={() => handleRemove(i)}
          onQtyAutoSave={onAutoSave ? makeQtyHandler(i) : undefined}
        />
      ))}

      {/* Add Part button */}
      <button
        type="button"
        disabled={loading}
        onClick={() => setPopupOpen(true)}
        className="w-full bg-white flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#E76124] hover:bg-[#fef4ef] text-sm font-semibold text-gray-400 hover:text-[#E76124] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        {loading ? 'Loading…' : '+ Add Part'}
      </button>

      {popupOpen && (
        <PartSelectPopup
          parts={parts}
          alreadySelected={selectedIds}
          onSelect={handleSelect}
          onClose={() => setPopupOpen(false)}
          assetEngineFamily={assetEngineFamily}
          assetCpcbNorm={assetCpcbNorm}
        />
      )}
    </div>
  )
}
