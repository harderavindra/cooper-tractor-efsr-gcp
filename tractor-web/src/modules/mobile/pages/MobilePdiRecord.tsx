import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Repeat, Check, Play, CheckCheck, Loader2, Plus, X } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import { useAuth } from '../../../shared/context/AuthContext'
import type { PdiEntry, ChecklistItem, OeDataRow } from '../../../shared/data/types'
import { OkNotOkToggle } from '../components/OkNotOkToggle'
import { MobileSelectSheet, type SelectSheetItem } from '../components/MobileSelectSheet'
import { PartPickerSheet, type PartOption } from '../components/PartPickerSheet'
import { StepProgress } from '../../../shared/components/StepProgress'
import { StepNavBar } from '../../../shared/components/StepNavBar'

const STATUS_LABEL: Record<PdiEntry['status'], string> = {
  assigned: 'Assigned', acknowledgment: 'Acknowledgment', started: 'Started', continue: 'Continue', completed: 'Completed',
}

// 14 checklist sections regrouped into 5 logically-related steps, sizes kept
// roughly balanced (14/19/11/19/15 items), plus a final Comments & Complete
// step. OE Data folds into step 1.
const STEPS: { label: string; sections: string[]; includeOe: boolean; final?: boolean }[] = [
  { label: 'General & Consumables', sections: ['A'], includeOe: true },
  { label: 'Aesthetics & Body', sections: ['B'], includeOe: false },
  { label: 'Engine & Drivetrain', sections: ['C', 'D', 'E'], includeOe: false },
  { label: 'Chassis & Systems', sections: ['F', 'G', 'H', 'I', 'J', 'K'], includeOe: false },
  { label: 'Leakages & Documents', sections: ['L', 'M', 'N'], includeOe: false },
  { label: 'Comments & Complete', sections: [], includeOe: false, final: true },
]

function inputClass() {
  return 'border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E76124]/30 w-full'
}

function CircleActionButton({ onClick, disabled, label, className, children }: {
  onClick: () => void; disabled?: boolean; label: string; className: string; children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

interface UserOption { _id: string; name: string; role: string; username: string }

export default function MobilePdiRecord() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { userId, role } = useAuth()

  const [entry, setEntry] = useState<PdiEntry | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [oeData, setOeData] = useState<OeDataRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(1)

  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignTo, setReassignTo] = useState<UserOption | null>(null)
  const [users, setUsers] = useState<UserOption[]>([])

  const [parts, setParts] = useState<PartOption[]>([])
  const [partPickerFor, setPartPickerFor] = useState<number | null>(null)

  const [comments, setComments] = useState('')

  useEffect(() => {
    if (!id) return
    api.get<PdiEntry>(`/api/pdi-entries/${id}`).then(e => {
      setEntry(e); setChecklist(e.checklist); setOeData(e.oeData); setComments(e.remark ?? '')
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
    setEntry(e); setChecklist(e.checklist); setOeData(e.oeData); setComments(e.remark ?? '')
  }

  async function handleAcknowledge() { if (id) { await api.put(`/api/pdi-entries/${id}/acknowledge`, {}); refresh() } }
  async function handleStart() { if (id) { await api.put(`/api/pdi-entries/${id}/start`, {}); refresh() } }

  async function handleSaveProgress() {
    if (!id) return
    setSaving(true)
    try { await api.put(`/api/pdi-entries/${id}/save-progress`, { checklist, oeData }); await refresh() }
    finally { setSaving(false) }
  }

  async function handleComplete() {
    if (!id) return
    setSaving(true)
    try {
      if (comments !== (entry?.remark ?? '')) {
        await api.put(`/api/pdi-entries/${id}`, { remark: comments })
      }
      await api.put(`/api/pdi-entries/${id}/complete`, { checklist, oeData })
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  async function openReassign() {
    if (users.length === 0) {
      const list = await api.get<UserOption[]>('/api/users')
      setUsers(list)
    }
    setReassignOpen(true)
  }

  async function handleReassign() {
    if (!id || !reassignTo) return
    await api.put(`/api/pdi-entries/${id}/reassign`, { toUserId: reassignTo._id })
    setReassignOpen(false); setReassignTo(null)
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
  }

  function removePart(index: number, partIdx: number) {
    setChecklist(prev => prev.map((item, i) => i === index
      ? { ...item, partsUsed: item.partsUsed.filter((_, pi) => pi !== partIdx) }
      : item))
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><p className="text-sm text-gray-400">Loading…</p></div>
  if (!entry) return <div className="flex-1 flex items-center justify-center"><p className="text-sm text-gray-400">PDI record not found</p></div>

  const tractor = entry.tractorId && typeof entry.tractorId !== 'string' ? entry.tractorId : null
  const locked = entry.status === 'completed'

  const sheetItems: SelectSheetItem[] = users
    .filter(u => u._id !== entry.assignedTo.userId)
    .map(u => ({ id: u._id, label: u.name, sublabel: u.role }))

  const currentStepDef = STEPS[step - 1]
  const withIndex = checklist.map((c, i) => ({ ...c, i }))
  const stepSections = currentStepDef.sections.map(section => ({
    section,
    items: withIndex.filter(c => c.section === section),
  }))
  const stepAnswered = stepSections.reduce((sum, s) => sum + s.items.filter(it => it.status).length, 0)
  const stepTotal = stepSections.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div className="flex flex-col h-full bg-[#faf0eb]">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button onClick={() => navigate('/mobile/pdi')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
          <ChevronLeft size={18} />
        </button>
        <p className="text-base font-bold tracking-widest text-gray-900 uppercase">{entry.srNumber}</p>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">{STATUS_LABEL[entry.status]}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6 flex flex-col gap-3">
        <div className="bg-white rounded-3xl p-4">
          <p className="text-sm font-semibold text-gray-800">{tractor ? `${tractor.chassisNo} — ${tractor.tractorModel}` : '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">Assigned to {entry.assignedTo.name}</p>
          {entry.remark && <p className="text-xs text-gray-500 mt-1 italic">"{entry.remark}"</p>}

          {canReassign && !locked && (
            <button onClick={openReassign} className="flex items-center gap-1 text-xs text-[#E76124] font-medium mt-2">
              <Repeat size={12} /> Reassign
            </button>
          )}
        </div>

        <StepProgress total={STEPS.length} currentStep={step} onStepClick={setStep} />

        <div className="bg-white rounded-3xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">{step}. {currentStepDef.label}</p>
            {!currentStepDef.final && <span className="text-xs text-gray-400">{stepAnswered}/{stepTotal}</span>}
          </div>

          {currentStepDef.final ? (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Comments</p>
                <textarea
                  disabled={locked || !canAct}
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder="Add any final comments…"
                  rows={4}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#E76124]/30 resize-none"
                />
              </div>
              {!locked && canAct && (entry.status === 'started' || entry.status === 'continue') && (
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-bold py-3.5 rounded-2xl disabled:opacity-50"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCheck size={18} />}
                  {saving ? 'Completing…' : 'Complete PDI'}
                </button>
              )}
            </div>
          ) : (
            <>
          {currentStepDef.includeOe && (
            <div className="border border-gray-100 rounded-2xl p-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">OE Data</p>
              {oeData.map((row, i) => (
                <div key={row.parameter} className="grid grid-cols-2 gap-2">
                  <p className="text-xs text-gray-500 col-span-2">{row.parameter}</p>
                  <input disabled={locked || !canAct} value={row.make ?? ''} onChange={e => updateOe(i, { make: e.target.value })} placeholder="Make" className={inputClass()} />
                  <input disabled={locked || !canAct} value={row.serialNo ?? ''} onChange={e => updateOe(i, { serialNo: e.target.value })} placeholder="Serial No." className={inputClass()} />
                </div>
              ))}
            </div>
          )}

          {stepSections.map(({ section, items }) => (
            <div key={section} className="flex flex-col">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{section}. {items[0]?.sectionLabel}</p>
              {items.map((item, idx) => {
                const failed = item.status === item.statusOptions[1]
                return (
                  <div key={`${item.section}-${item.srNo}`} className={`px-1 py-3 ${idx % 2 === 1 ? 'bg-gray-50' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-700 flex-1">
                        <span className="text-xs text-gray-400 w-5 inline-block">{String(item.srNo).padStart(2, '0')}</span> {item.parameter}
                      </p>
                      <OkNotOkToggle
                        options={item.statusOptions}
                        value={item.status}
                        disabled={locked || !canAct}
                        onChange={v => updateItem(item.i, { status: v })}
                      />
                    </div>
                    {failed && (
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-red-100">
                        <textarea disabled={locked || !canAct} value={item.observation ?? ''} onChange={e => updateItem(item.i, { observation: e.target.value })} placeholder="Observation" rows={2} className="border border-red-200 rounded-xl bg-red-50 placeholder-red-300 px-2 py-2 text-sm w-full focus:outline-none resize-none" />
                        <textarea disabled={locked || !canAct} value={item.actionTaken ?? ''} onChange={e => updateItem(item.i, { actionTaken: e.target.value })} placeholder="Action Taken" rows={2} className="border border-gray-200 rounded-xl px-2 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#E76124]/30 resize-none" />
                        <textarea disabled={locked || !canAct} value={item.consumptionText ?? ''} onChange={e => updateItem(item.i, { consumptionText: e.target.value })} placeholder="Consumption (Text)" rows={2} className="border border-gray-200 rounded-xl px-2 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#E76124]/30 resize-none" />

                        {!locked && canAct && (
                          <CircleActionButton onClick={handleSaveProgress} disabled={saving} label={saving ? 'Saving…' : 'Save'} className="self-end bg-green-600 text-white">
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                          </CircleActionButton>
                        )}

                        <div className="flex flex-col gap-1.5">
                          <p className="text-xs text-gray-400">Part Used</p>
                          {item.partsUsed.length > 0 && (
                            <div className="flex flex-col gap-2">
                              {item.partsUsed.map((p, pi) => (
                                <div key={pi} className="bg-white border border-gray-200 rounded-2xl px-3 py-2.5 flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold bg-[#fde9df] text-[#E76124] px-2.5 py-1 rounded-lg">
                                      {p.componentNumber}
                                    </span>
                                    {!locked && canAct && (
                                      <button onClick={() => removePart(item.i, pi)} className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50">
                                        <X size={14} />
                                      </button>
                                    )}
                                  </div>
                                  {p.description && <p className="text-sm font-bold text-[#1E1951] leading-snug">{p.description}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                          {!locked && canAct && (
                            <button onClick={() => setPartPickerFor(item.i)} className="self-start flex items-center gap-1 text-xs font-semibold text-gray-500 border border-dashed border-gray-300 rounded-lg px-2.5 py-1.5">
                              <Plus size={12} /> Add Part
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
            </>
          )}

          <StepNavBar
            onBack={() => setStep(s => Math.max(1, s - 1))}
            onNext={() => setStep(s => Math.min(STEPS.length, s + 1))}
            backDisabled={step === 1}
            nextDisabled={step === STEPS.length}
          />
        </div>

        {canAct && !locked && (
          <div className="bg-white rounded-3xl p-4 flex items-center justify-center gap-6">
            {entry.status === 'assigned' && (
              <CircleActionButton onClick={handleAcknowledge} label="Acknowledge" className="bg-amber-500 text-white">
                <Check size={20} />
              </CircleActionButton>
            )}
            {entry.status === 'acknowledgment' && (
              <CircleActionButton onClick={handleStart} label="Start" className="bg-[#1E1951] text-white">
                <Play size={20} />
              </CircleActionButton>
            )}
          </div>
        )}

        {entry.reassignments.length > 0 && (
          <div className="bg-white rounded-3xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Reassignment History</p>
            {entry.reassignments.map((r, i) => (
              <p key={i} className="text-xs text-gray-500 border-b border-gray-50 last:border-0 py-1">
                {r.fromUser.name} → {r.toUser.name} on {new Date(r.at).toLocaleDateString()}
              </p>
            ))}
          </div>
        )}
      </div>

      <MobileSelectSheet
        open={reassignOpen}
        title="Reassign PDI"
        subtitle="Select a new assignee"
        items={sheetItems}
        selectedId={reassignTo?._id}
        onSelect={item => setReassignTo({ _id: item.id, name: item.label, role: item.sublabel ?? '', username: '' })}
        onCancel={() => setReassignOpen(false)}
        onConfirm={handleReassign}
        confirmDisabled={!reassignTo}
      />

      <PartPickerSheet
        open={partPickerFor !== null}
        parts={parts}
        alreadyAdded={new Set(partPickerFor !== null ? checklist[partPickerFor]?.partsUsed.map(p => p.componentNumber) : [])}
        onSelect={p => { if (partPickerFor !== null) addPart(partPickerFor, p) }}
        onClose={() => setPartPickerFor(null)}
      />
    </div>
  )
}
