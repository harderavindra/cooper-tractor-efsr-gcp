import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { api } from '../../../shared/lib/api'
import { useAuth } from '../../../shared/context/AuthContext'
import type { TractorAsset, PdiEntry } from '../../../shared/data/types'
import { useTractorSearch } from '../../tractor/hooks/useTractorSearch'
import { UserPicker, type UserOption } from '../components/UserPicker'
import { TractorFieldsForm, EMPTY_TRACTOR_FIELDS, fieldsFromTractor, fieldsFromSap, type TractorFields } from '../components/TractorFieldsForm'

export default function NewPdi() {
  const navigate = useNavigate()
  const { userId, name: selfName } = useAuth()
  const { state, tractor, sapMatches, search } = useTractorSearch()

  const [q, setQ] = useState('')
  const [fields, setFields] = useState<TractorFields>(EMPTY_TRACTOR_FIELDS)
  const [resolvedTractorId, setResolvedTractorId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'search' | 'assign'>('search')

  const [assignee, setAssignee] = useState<UserOption | null>(null)
  const [remark, setRemark] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (state === 'found' && tractor) setFields(fieldsFromTractor(tractor))
    else if (state === 'sap_found' && sapMatches[0]) setFields(fieldsFromSap(sapMatches[0]))
    else if (state === 'not_found') setFields({ ...EMPTY_TRACTOR_FIELDS, chassisNo: q.trim() })
  }, [state, tractor, sapMatches]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault()
    search(q)
  }

  async function handleContinue() {
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
      if (state === 'found' && tractor) {
        const updated = await api.put<TractorAsset>(`/api/tractor-assets/${tractor._id}`, payload)
        setResolvedTractorId(updated._id)
      } else {
        const created = await api.post<TractorAsset>('/api/tractor-assets', payload)
        setResolvedTractorId(created._id)
      }
      setPhase('assign')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tractor details')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreatePdi(e: FormEvent) {
    e.preventDefault()
    if (!resolvedTractorId) return
    setSaving(true)
    setError('')
    try {
      const entry = await api.post<PdiEntry>('/api/pdi-entries', {
        tractorId: resolvedTractorId,
        assignedToUserId: assignee?._id,
        remark: remark || undefined,
      })
      navigate(`/pdi/${entry._id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PDI')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full'
  const labelClass = 'text-xs font-medium text-gray-500 uppercase tracking-wide'

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-4">
      <button onClick={() => navigate('/pdi')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 self-start">
        <ArrowLeft size={14} /> Back to PDI
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h1 className="text-lg font-semibold text-[#1E1951] mb-4">New PDI</h1>

        {phase === 'search' && (
          <div className="flex flex-col gap-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-1.5">
              <label className={labelClass}>Search Chassis / Engine No *</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Type chassis or engine number and press Enter"
                  className={`${inputClass} pl-8`}
                />
              </div>
              <p className="text-xs text-gray-400">Checks the Tractor registry first, then SAP-Tractor if not found.</p>
            </form>

            {state === 'searching' && <p className="text-sm text-gray-400">Searching…</p>}

            {state === 'found' && tractor && (
              <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-sm font-medium text-green-800">Found in Tractor registry — fill in any missing details</p>
                <TractorFieldsForm fields={fields} setFields={setFields} />
              </div>
            )}

            {state === 'sap_found' && (
              <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-sm font-medium text-amber-800">Not registered yet — found in SAP-Tractor. Confirm details to register.</p>
                <TractorFieldsForm fields={fields} setFields={setFields} />
              </div>
            )}

            {state === 'not_found' && (
              <div className="border border-gray-200 bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-sm font-medium text-gray-700">Not found anywhere — create a new Tractor record</p>
                <TractorFieldsForm fields={fields} setFields={setFields} />
              </div>
            )}

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            {state !== 'idle' && state !== 'searching' && (
              <div className="flex justify-end">
                <button
                  onClick={handleContinue}
                  disabled={saving}
                  className="bg-[#1E1951] hover:bg-[#1E1951]/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                >
                  {saving ? 'Saving…' : 'Continue'}
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'assign' && (
          <form onSubmit={handleCreatePdi} className="flex flex-col gap-4">
            <div className="border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-sm">
              <p className="font-medium text-gray-800">{fields.chassisNo} — {fields.tractorModel}</p>
              <p className="text-xs text-gray-500">Engine: {fields.engineNo}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Assign To</label>
              <UserPicker
                value={assignee}
                onChange={setAssignee}
                excludeUserId={userId ?? undefined}
                placeholder={`Default: yourself (${selfName ?? 'me'}) — search by name, username or role…`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Remark</label>
              <textarea value={remark} onChange={e => setRemark(e.target.value)} rows={3} className={inputClass} />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setPhase('search')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                Back
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#1E1951] hover:bg-[#1E1951]/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? 'Creating…' : 'Create PDI'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
