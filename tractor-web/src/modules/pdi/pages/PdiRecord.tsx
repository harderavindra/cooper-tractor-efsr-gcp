import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Repeat, Plus, X } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import { useAuth } from '../../../shared/context/AuthContext'
import type { PdiEntry, ChecklistItem, OeDataRow } from '../../../shared/data/types'
import { EntityHistoryPopover } from '../../../shared/components/EntityHistoryPopover'
import { ChangeLogTimeline } from '../../../shared/components/ChangeLogTimeline'
import { UserPicker, type UserOption } from '../components/UserPicker'

const STATUS_LABEL: Record<PdiEntry['status'], string> = {
  assigned: 'Assigned', acknowledgment: 'Acknowledgment', started: 'Started', continue: 'Continue', completed: 'Completed',
}

function inputClass() {
  return 'border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full'
}

interface PartOption { _id: string; componentNumber: string; description: string }

export default function PdiRecord() {
  const { id } = useParams()
  const { userId, role } = useAuth()

  const [entry, setEntry] = useState<PdiEntry | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [oeData, setOeData] = useState<OeDataRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignTo, setReassignTo] = useState<UserOption | null>(null)
  const [reassignReason, setReassignReason] = useState('')

  const [parts, setParts] = useState<PartOption[]>([])
  const [partPickerFor, setPartPickerFor] = useState<number | null>(null)
  const [partSearch, setPartSearch] = useState('')

  useEffect(() => {
    if (!id) return
    api.get<PdiEntry>(`/api/pdi-entries/${id}`).then(e => {
      setEntry(e); setChecklist(e.checklist); setOeData(e.oeData)
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    api.get<PartOption[]>('/api/parts').then(setParts).catch(() => {})
  }, [])

  const canAct = useMemo(() => {
    if (!entry) return false
    const privileged = role === 'admin' || role === 'rsm' || role === 'area_manager'
    return privileged || entry.assignedTo.userId === userId
  }, [entry, role, userId])

  const canReassign = role === 'admin' || role === 'rsm' || role === 'area_manager' || role === 'dealer'

  async function refresh() {
    if (!id) return
    const e = await api.get<PdiEntry>(`/api/pdi-entries/${id}`)
    setEntry(e); setChecklist(e.checklist); setOeData(e.oeData)
  }

  async function handleAcknowledge() {
    if (!id) return
    await api.put(`/api/pdi-entries/${id}/acknowledge`, {})
    refresh()
  }

  async function handleStart() {
    if (!id) return
    await api.put(`/api/pdi-entries/${id}/start`, {})
    refresh()
  }

  async function handleSaveProgress() {
    if (!id) return
    setSaving(true)
    try {
      await api.put(`/api/pdi-entries/${id}/save-progress`, { checklist, oeData })
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    if (!id) return
    setSaving(true)
    try {
      await api.put(`/api/pdi-entries/${id}/complete`, { checklist, oeData })
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleReassign() {
    if (!id || !reassignTo) return
    await api.put(`/api/pdi-entries/${id}/reassign`, { toUserId: reassignTo._id, reason: reassignReason || undefined })
    setReassignOpen(false)
    setReassignTo(null)
    setReassignReason('')
    refresh()
  }

  function updateItem(index: number, patch: Partial<ChecklistItem>) {
    setChecklist(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item))
  }

  function updateOe(index: number, patch: Partial<OeDataRow>) {
    setOeData(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row))
  }

  function addPart(index: number, part: PartOption) {
    setChecklist(prev => prev.map((item, i) => i === index
      ? { ...item, partsUsed: [...item.partsUsed, { componentNumber: part.componentNumber, description: part.description }] }
      : item))
    setPartPickerFor(null)
    setPartSearch('')
  }

  function removePart(index: number, partIdx: number) {
    setChecklist(prev => prev.map((item, i) => i === index
      ? { ...item, partsUsed: item.partsUsed.filter((_, pi) => pi !== partIdx) }
      : item))
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>
  if (!entry) return <p className="text-sm text-gray-400">PDI record not found</p>

  const tractor = entry.tractorId && typeof entry.tractorId !== 'string' ? entry.tractorId : null
  const locked = entry.status === 'completed'
  const sections = Array.from(new Set(checklist.map(c => c.section)))

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link to="/pdi" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Back to PDI
        </Link>
        {canReassign && !locked && (
          <button onClick={() => setReassignOpen(true)} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
            <Repeat size={14} /> Reassign
          </button>
        )}
      </div>

      {reassignOpen && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-gray-700">Reassign PDI</p>
          <UserPicker
            value={reassignTo}
            onChange={setReassignTo}
            excludeUserId={entry.assignedTo.userId}
            placeholder="Search by name, username or role…"
          />
          <input value={reassignReason} onChange={e => setReassignReason(e.target.value)} placeholder="Reason (optional)" className={inputClass()} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setReassignOpen(false)} className="text-xs text-gray-500 hover:underline">Cancel</button>
            <button onClick={handleReassign} disabled={!reassignTo} className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50">Confirm</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-[#1E1951]">{entry.srNumber}</h1>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">{STATUS_LABEL[entry.status]}</span>
            <EntityHistoryPopover entityType="pdi_entry" entityId={entry._id} />
          </div>
          <div className="flex gap-2">
            {canAct && entry.status === 'assigned' && (
              <button onClick={handleAcknowledge} className="text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5">Acknowledge</button>
            )}
            {canAct && entry.status === 'acknowledgment' && (
              <button onClick={handleStart} className="text-sm bg-sky-600 hover:bg-sky-700 text-white rounded-lg px-3 py-1.5">Start</button>
            )}
            {canAct && (entry.status === 'started' || entry.status === 'continue') && (
              <>
                <button onClick={handleSaveProgress} disabled={saving} className="text-sm border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg px-3 py-1.5 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Progress'}
                </button>
                <button onClick={handleComplete} disabled={saving} className="text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-1.5 disabled:opacity-50">
                  Complete
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 text-sm mb-4">
          <div><p className="text-xs text-gray-400 uppercase">Tractor</p><p>{tractor ? `${tractor.chassisNo} — ${tractor.tractorModel}` : '—'}</p></div>
          <div><p className="text-xs text-gray-400 uppercase">Assigned To</p><p>{entry.assignedTo.name}</p></div>
          <div><p className="text-xs text-gray-400 uppercase">PDI Date</p><p>{entry.pdiDate ? new Date(entry.pdiDate).toLocaleDateString() : 'Auto-filled on completion'}</p></div>
          <div><p className="text-xs text-gray-400 uppercase">Checked By</p><p>{entry.checkedByName ?? '—'}</p></div>
        </div>
        {entry.remark && (
          <div className="text-sm border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400 uppercase">Remark</p>
            <p className="text-gray-700">{entry.remark}</p>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-600 mb-3">Original Equipments Data (OE Data)</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="py-2">Parameter</th><th className="py-2">Make</th><th className="py-2">Serial No.</th>
            </tr>
          </thead>
          <tbody>
            {oeData.map((row, i) => (
              <tr key={row.parameter} className="border-b border-gray-50 last:border-0">
                <td className="py-2 pr-2">{row.parameter}</td>
                <td className="py-2 pr-2"><input disabled={locked || !canAct} value={row.make ?? ''} onChange={e => updateOe(i, { make: e.target.value })} className={inputClass()} /></td>
                <td className="py-2"><input disabled={locked || !canAct} value={row.serialNo ?? ''} onChange={e => updateOe(i, { serialNo: e.target.value })} className={inputClass()} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
        <p className="text-sm font-semibold text-gray-600">PDI Check Points</p>
        {sections.map(section => {
          const items = checklist.map((c, i) => ({ ...c, i })).filter(c => c.section === section)
          return (
            <div key={section} className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-white bg-[#1E1951] rounded px-2 py-1 inline-block w-fit">
                {section}. {items[0]?.sectionLabel}
              </p>
              <div className="flex flex-col gap-2">
                {items.map(item => {
                  const failed = item.status === item.statusOptions[1]
                  return (
                    <div key={`${item.section}-${item.srNo}`} className="border border-gray-100 rounded-lg p-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-gray-700">{item.srNo}. {item.parameter}</p>
                        <div className="flex gap-3 shrink-0">
                          {item.statusOptions.map(opt => (
                            <label key={opt} className="flex items-center gap-1 text-xs text-gray-600">
                              <input
                                type="radio"
                                disabled={locked || !canAct}
                                checked={item.status === opt}
                                onChange={() => updateItem(item.i, { status: opt })}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                      {failed && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100">
                          <input disabled={locked || !canAct} value={item.observation ?? ''} onChange={e => updateItem(item.i, { observation: e.target.value })} placeholder="Observation" className={inputClass()} />
                          <input disabled={locked || !canAct} value={item.actionTaken ?? ''} onChange={e => updateItem(item.i, { actionTaken: e.target.value })} placeholder="Action Taken" className={inputClass()} />
                          <input disabled={locked || !canAct} value={item.consumptionText ?? ''} onChange={e => updateItem(item.i, { consumptionText: e.target.value })} placeholder="Consumption (Text)" className={inputClass()} />

                          <div className="col-span-2 flex flex-col gap-1.5">
                            {item.partsUsed.length > 0 && (
                              <div className="grid grid-cols-2 gap-2">
                                {item.partsUsed.map((p, pi) => (
                                  <div key={pi} className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg">
                                        {p.componentNumber}
                                      </span>
                                      {!locked && canAct && (
                                        <button onClick={() => removePart(item.i, pi)} className="ml-auto w-5 h-5 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50">
                                          <X size={12} />
                                        </button>
                                      )}
                                    </div>
                                    {p.description && <p className="text-xs font-semibold text-gray-700 leading-snug">{p.description}</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                            {!locked && canAct && (
                              <button
                                onClick={() => { setPartPickerFor(partPickerFor === item.i ? null : item.i); setPartSearch('') }}
                                className="self-start flex items-center gap-1 text-xs font-semibold text-gray-500 border border-dashed border-gray-300 rounded-lg px-2.5 py-1"
                              >
                                <Plus size={12} /> Add Part
                              </button>
                            )}

                            {partPickerFor === item.i && (
                              <div className="relative">
                                <div className="absolute z-10 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-2">
                                  <input
                                    autoFocus
                                    value={partSearch}
                                    onChange={e => setPartSearch(e.target.value)}
                                    placeholder="Search component number or description…"
                                    className={inputClass()}
                                  />
                                  <div className="max-h-48 overflow-y-auto mt-2 flex flex-col">
                                    {parts
                                      .filter(p => {
                                        const q = partSearch.trim().toLowerCase()
                                        if (!q) return true
                                        return p.componentNumber.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
                                      })
                                      .map(p => {
                                        const added = item.partsUsed.some(pu => pu.componentNumber === p.componentNumber)
                                        return (
                                          <button
                                            key={p._id}
                                            disabled={added}
                                            onClick={() => addPart(item.i, p)}
                                            className={`text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 ${added ? 'opacity-40' : 'hover:bg-indigo-50'}`}
                                          >
                                            <span className="font-mono font-semibold text-gray-700 shrink-0">{p.componentNumber}</span>
                                            <span className="text-gray-500 truncate">{p.description}</span>
                                          </button>
                                        )
                                      })}
                                    {parts.length > 0 && parts.filter(p => {
                                      const q = partSearch.trim().toLowerCase()
                                      if (!q) return true
                                      return p.componentNumber.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
                                    }).length === 0 && (
                                      <p className="text-xs text-gray-400 px-2 py-2">No matches</p>
                                    )}
                                  </div>
                                  <button onClick={() => setPartPickerFor(null)} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-1 pt-1 border-t border-gray-100">
                                    Close
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {entry.reassignments.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <p className="text-sm font-semibold text-gray-600 mb-3">Reassignment History</p>
          <div className="flex flex-col gap-2">
            {entry.reassignments.map((r, i) => (
              <div key={i} className="text-sm text-gray-600 border-b border-gray-50 last:border-0 pb-2">
                {r.fromUser.name} → {r.toUser.name} by {r.reassignedBy.name} on {new Date(r.at).toLocaleDateString()}
                {r.reason && <span className="text-gray-400"> — {r.reason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-600 mb-3">Change Log</p>
        <ChangeLogTimeline entityType="pdi_entry" entityId={entry._id} />
      </div>
    </div>
  )
}
