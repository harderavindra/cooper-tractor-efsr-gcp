import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, X, Tractor, Tag, UserCog } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import { useAuth, ROLE_LABEL } from '../../../shared/context/AuthContext'
import type { TractorAsset, PdiEntry } from '../../../shared/data/types'
import { useTractorSearch } from '../../tractor/hooks/useTractorSearch'
import { TractorFieldsForm, EMPTY_TRACTOR_FIELDS, fieldsFromTractor, fieldsFromSap, type TractorFields } from '../../pdi/components/TractorFieldsForm'
import { MobileSelectSheet, type SelectSheetItem } from '../components/MobileSelectSheet'

interface UserOption { _id: string; name: string; role: string; username: string }

const RESULT_NOTE: Record<string, string> = {
  found: 'Already registered',
  sap_found: 'Found in SAP-Tractor',
  not_found: 'Not found — will be created',
}

export default function MobileNewPdi() {
  const navigate = useNavigate()
  const { userId, name: selfName, role: selfRole } = useAuth()
  const { state, tractor, sapMatches, search } = useTractorSearch()

  const [q, setQ] = useState('')
  const [fields, setFields] = useState<TractorFields>(EMPTY_TRACTOR_FIELDS)
  const [remark, setRemark] = useState('')
  const [assignee, setAssignee] = useState<UserOption | null>(null)

  const [users, setUsers] = useState<UserOption[]>([])
  const [assignSheetOpen, setAssignSheetOpen] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<UserOption[]>('/api/users').then(setUsers).catch(() => setUsers([]))
  }, [])

  useEffect(() => {
    if (state === 'found' && tractor) setFields(fieldsFromTractor(tractor))
    else if (state === 'sap_found' && sapMatches[0]) setFields(fieldsFromSap(sapMatches[0]))
    else if (state === 'not_found') setFields({ ...EMPTY_TRACTOR_FIELDS, chassisNo: q.trim() })
  }, [state, tractor, sapMatches]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault()
    search(q)
  }

  async function handleSubmit() {
    if (!fields.tractorModel.trim() || !fields.chassisNo.trim() || !fields.engineNo.trim()) {
      setError('Model, Chassis No and Engine No are required'); return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        tractorModel: fields.tractorModel, chassisNo: fields.chassisNo, engineNo: fields.engineNo,
        hmr: fields.hmr ? Number(fields.hmr) : undefined,
        dispatchDate: fields.dispatchDate || undefined,
        invoiceNo: fields.invoiceNo || undefined,
        invoiceDate: fields.invoiceDate || undefined,
      }
      const tractorRecord = state === 'found' && tractor
        ? await api.put<TractorAsset>(`/api/tractor-assets/${tractor._id}`, payload)
        : await api.post<TractorAsset>('/api/tractor-assets', payload)

      const entry = await api.post<PdiEntry>('/api/pdi-entries', {
        tractorId: tractorRecord._id,
        assignedToUserId: assignee?._id,
        remark: remark || undefined,
      })
      navigate(`/mobile/pdi/${entry._id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PDI')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E76124]/30 w-full'
  const showForm = state === 'found' || state === 'sap_found' || state === 'not_found'

  const assignItems: SelectSheetItem[] = [
    { id: userId ?? 'me', label: `${selfName ?? 'Me'} (You)`, sublabel: selfRole ? ROLE_LABEL[selfRole] : undefined },
    ...users.filter(u => u._id !== userId).map(u => ({ id: u._id, label: u.name, sublabel: ROLE_LABEL[u.role as keyof typeof ROLE_LABEL] ?? u.role })),
  ]

  function handleAssignSelect(item: SelectSheetItem) {
    if (item.id === userId) { setAssignee(null); return }
    const u = users.find(x => x._id === item.id)
    if (u) setAssignee(u)
  }

  return (
    <div className="flex flex-col h-full bg-[#faf0eb]">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button onClick={() => navigate('/mobile/pdi')} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
          <ChevronLeft size={18} />
        </button>
        <p className="text-base font-bold tracking-widest text-gray-900 uppercase">New PDI</p>
        <span className="w-9 h-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <form onSubmit={handleSearchSubmit}>
          <div className={`flex items-center gap-2 rounded-full border-2 bg-white pl-4 pr-1.5 py-1 transition-colors ${q ? 'border-[#E76124]' : 'border-gray-200'}`}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search chassis / engine no"
              className="flex-1 bg-transparent text-sm focus:outline-none py-2"
            />
            {q && (
              <button type="button" onClick={() => setQ('')} className="text-gray-400 shrink-0">
                <X size={16} />
              </button>
            )}
            <button type="submit" className="w-9 h-9 rounded-full bg-[#E76124] flex items-center justify-center shrink-0">
              <Search size={16} className="text-white" />
            </button>
          </div>
        </form>

        {state === 'searching' && <p className="text-sm text-gray-400 text-center">Searching…</p>}

        {showForm && (
          <div className="bg-white rounded-2xl p-3 flex flex-col gap-3">
            <div className="flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-2.5">
              <Tractor size={18} className="text-indigo-600 shrink-0" />
              <span className="font-bold text-gray-900">{fields.chassisNo || '—'}</span>
              <span className="text-sm text-gray-400">{fields.engineNo}</span>
            </div>
            <div className="flex items-start gap-2">
              <Tag size={16} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-gray-900">{fields.tractorModel || 'New Tractor'}</p>
                <p className="text-xs text-gray-400">{RESULT_NOTE[state]}</p>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-3xl p-4 flex flex-col gap-4">
            <p className="text-lg font-black tracking-widest text-gray-900 uppercase">New PDI</p>

            <TractorFieldsForm fields={fields} setFields={setFields} />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-600">Remark</label>
              <textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder="Additional details…" rows={3} className={inputClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-600">Assign To</label>
              <button
                type="button"
                onClick={() => setAssignSheetOpen(true)}
                className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-3 text-left"
              >
                <UserCog size={18} className="text-gray-400 shrink-0" />
                <span className="flex-1 text-sm text-gray-700 truncate">
                  {assignee ? assignee.name : `${selfName ?? 'Me'} (You)`}
                </span>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </button>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full rounded-full bg-[#E76124] hover:bg-[#cf5520] disabled:opacity-50 text-white font-bold py-3.5"
            >
              {saving ? 'Creating…' : 'Create PDI'}
            </button>
          </div>
        )}
      </div>

      <MobileSelectSheet
        open={assignSheetOpen}
        title="Assign To"
        items={assignItems}
        selectedId={assignee?._id ?? userId ?? undefined}
        onSelect={handleAssignSelect}
        onCancel={() => setAssignSheetOpen(false)}
        onConfirm={() => setAssignSheetOpen(false)}
        confirmLabel="Select"
      />
    </div>
  )
}
