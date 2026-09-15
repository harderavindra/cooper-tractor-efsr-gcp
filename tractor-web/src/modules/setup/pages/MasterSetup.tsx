import { useEffect, useState, useMemo, useRef } from 'react'
import ExcelJS from 'exceljs'
import { api } from '../../../shared/lib/api'
import { EntityHistoryPopover } from '../../../shared/components/EntityHistoryPopover'

// ── Types ────────────────────────────────────────────────────────────────────

interface RegionRow {
  _id:        string
  name:       string
  managerId?: { _id: string; name: string } | null
  states?:    string[]
}
interface AreaRow {
  _id:         string
  name:        string
  regionId:    { _id: string; name: string }
  managerIds?: { _id: string; name: string }[]
}
interface ManagerOption { _id: string; name: string }
interface RegionOption  { _id: string; name: string }

interface LaborChargeRow {
  _id:          string
  defectCode:   string
  defect:       string
  aggregate:    string
  subAggregate: string
}
interface PartRow {
  _id:              string
  componentNumber:  string
  description:      string
  category?:        string
  maxQty?:          number
}
interface PartFormState {
  componentNumber: string
  description:     string
  category:        string
  maxQty:           string
}

interface PincodeArea {
  _id:      string
  name:     string
  regionId?: { _id: string; name: string } | string
}
interface PincodeRow {
  _id:         string
  pincode:     string
  post_office: string
  taluka:      string
  district:    string
  state:       string
  areaId?:     PincodeArea | null
}

type Tab = 'regions' | 'areas' | 'labor-charges' | 'parts' | 'pincodes'

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E76124]'
const PART_PAGE_SIZE = 100

// ── Inline form helpers ───────────────────────────────────────────────────────

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function AMMultiSelect({ value, options, onChange, placeholder = 'Assign later…' }: {
  value: string[]
  options: ManagerOption[]
  onChange: (ids: string[]) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  }

  return (
    <div ref={ref} className="relative">
      <div
        className="min-h-[38px] w-full border border-gray-200 rounded-lg px-2 py-1.5 flex flex-wrap gap-1.5 cursor-pointer focus-within:ring-2 focus-within:ring-[#E76124] bg-white"
        onClick={() => setOpen(o => !o)}
      >
        {value.length === 0 && (
          <span className="text-sm text-gray-400 px-1 py-0.5">{placeholder}</span>
        )}
        {value.map(id => {
          const m = options.find(o => o._id === id)
          if (!m) return null
          return (
            <span key={id} className="inline-flex items-center gap-1 text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2.5 py-0.5">
              {m.name}
              <button type="button" onClick={e => { e.stopPropagation(); toggle(id) }} className="hover:text-violet-900 ml-0.5">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )
        })}
        <svg className="w-4 h-4 text-gray-400 ml-auto self-center shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {options.length === 0 && <p className="px-3 py-3 text-xs text-gray-400 text-center">No area managers found</p>}
          {options.map(m => (
            <label key={m._id} className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 border-t border-gray-50 first:border-0 ${value.includes(m._id) ? 'bg-violet-50' : ''}`}>
              <input
                type="checkbox"
                checked={value.includes(m._id)}
                onChange={() => toggle(m._id)}
                className="w-4 h-4 rounded accent-violet-600"
                onClick={e => e.stopPropagation()}
              />
              <div className="flex items-center gap-2 flex-1">
                <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0">{m.name[0]}</span>
                <span className="text-sm text-gray-800">{m.name}</span>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function StatePicker({
  allStates, selected, takenMap, excludeRegionName, onToggle,
}: {
  allStates:         string[]
  selected:          string[]
  takenMap:          Map<string, string>
  excludeRegionName: string
  onToggle:          (state: string, checked: boolean) => void
}) {
  const [search, setSearch] = useState('')
  const sorted = useMemo(() => {
    const q = search.toLowerCase()
    return [...allStates]
      .filter(s => !q || s.toLowerCase().includes(q))
      .sort((a, b) => {
        const ownerA = takenMap.get(a); const aTaken = !!ownerA && ownerA !== excludeRegionName
        const ownerB = takenMap.get(b); const bTaken = !!ownerB && ownerB !== excludeRegionName
        if (aTaken !== bTaken) return aTaken ? 1 : -1
        return a.localeCompare(b)
      })
  }, [allStates, search, takenMap, excludeRegionName])

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search states…" className={inputCls + ' mb-2'} />
      <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
        {sorted.length === 0
          ? <p className="px-3 py-3 text-xs text-gray-400">No states found</p>
          : sorted.map(s => {
              const owner    = takenMap.get(s)
              const disabled = !!owner && owner !== excludeRegionName
              return (
                <label key={s} className={`flex items-center gap-2 px-3 py-1.5 text-xs ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}>
                  <input type="checkbox" disabled={disabled}
                    checked={selected.includes(s)}
                    onChange={e => onToggle(s, e.target.checked)}
                    className="accent-[#E76124]" />
                  <span className={`flex-1 ${disabled ? 'text-gray-300' : 'text-gray-700'}`}>{s}</span>
                  {disabled && (
                    <span className="text-[10px] text-orange-500 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded-full shrink-0">
                      {owner}
                    </span>
                  )}
                </label>
              )
            })
        }
      </div>
      <p className="text-[10px] text-gray-400 mt-1">{selected.length} state{selected.length !== 1 ? 's' : ''} selected</p>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MasterSetup() {
  const [tab, setTab] = useState<Tab>('regions')

  // ─── Regions ──────────────────────────────────────────────────────────────
  const [regionRows,   setRegionRows]   = useState<RegionRow[]>([])
  const [rsmList,      setRsmList]      = useState<ManagerOption[]>([])
  const [showNewReg,   setShowNewReg]   = useState(false)
  const [newRegName,   setNewRegName]   = useState('')
  const [newRegMgr,    setNewRegMgr]    = useState('')
  const [newRegStates, setNewRegStates] = useState<string[]>([])
  const [savingNewReg, setSavingNewReg] = useState(false)
  const [editRegId,    setEditRegId]    = useState<string | null>(null)
  const [editRegName,  setEditRegName]  = useState('')
  const [editRegMgr,   setEditRegMgr]   = useState('')
  const [editRegStates,setEditRegStates]= useState<string[]>([])
  const [savingReg,    setSavingReg]    = useState(false)
  const [delRegId,     setDelRegId]     = useState<string | null>(null)

  // ─── Areas ────────────────────────────────────────────────────────────────
  const [areaRows,     setAreaRows]     = useState<AreaRow[]>([])
  const [amList,       setAmList]       = useState<ManagerOption[]>([])
  const [regionOpts,   setRegionOpts]   = useState<RegionOption[]>([])
  const [areaFilter,   setAreaFilter]   = useState('')
  const [showNewArea,  setShowNewArea]  = useState(false)
  const [newAreaName,  setNewAreaName]  = useState('')
  const [newAreaReg,   setNewAreaReg]   = useState('')
  const [newAreaMgr,   setNewAreaMgr]   = useState<string[]>([])
  const [savingNewArea,setSavingNewArea]= useState(false)
  const [editAreaId,   setEditAreaId]   = useState<string | null>(null)
  const [editAreaName, setEditAreaName] = useState('')
  const [editAreaMgr,  setEditAreaMgr]  = useState<string[]>([])
  const [savingArea,   setSavingArea]   = useState(false)
  const [delAreaId,    setDelAreaId]    = useState<string | null>(null)

  // ─── Labor Charges ────────────────────────────────────────────────────────
  const [laborCharges, setLaborCharges] = useState<LaborChargeRow[]>([])
  const [lcSearch,     setLcSearch]     = useState('')
  const [lcAggFilter,  setLcAggFilter]  = useState('')
  const [showNewLc,    setShowNewLc]    = useState(false)
  const [newLc,        setNewLc]        = useState({ defectCode: '', defect: '', aggregate: '', subAggregate: '' })
  const [savingNewLc,  setSavingNewLc]  = useState(false)
  const [newLcError,   setNewLcError]   = useState('')
  const [editLcId,     setEditLcId]     = useState<string | null>(null)
  const [editLc,       setEditLc]       = useState({ defectCode: '', defect: '', aggregate: '', subAggregate: '' })
  const [savingLc,     setSavingLc]     = useState(false)
  const [delLcId,      setDelLcId]      = useState<string | null>(null)
  const [lcImporting,    setLcImporting]    = useState(false)
  const [lcImportResult, setLcImportResult] = useState<{ upserted: number; modified: number; skipped: number; total: number } | null>(null)
  const [lcImportError,  setLcImportError]  = useState('')
  const lcFileRef = useRef<HTMLInputElement>(null)

  // ─── Parts ────────────────────────────────────────────────────────────────
  const [parts,        setParts]        = useState<PartRow[]>([])
  const [partSearch,   setPartSearch]   = useState('')
  const [partCategoryFilter, setPartCategoryFilter] = useState('')
  const [partPage,     setPartPage]     = useState(1)
  const [showNewPart,  setShowNewPart]  = useState(false)
  const [newPart,      setNewPart]      = useState<PartFormState>({ componentNumber: '', description: '', category: '', maxQty: '' })
  const [savingNewPart,setSavingNewPart]= useState(false)
  const [newPartError, setNewPartError] = useState('')
  const [editPartId,   setEditPartId]   = useState<string | null>(null)
  const [editPart,     setEditPart]     = useState<PartFormState>({ componentNumber: '', description: '', category: '', maxQty: '' })
  const [savingPart,   setSavingPart]   = useState(false)
  const [delPartId,    setDelPartId]    = useState<string | null>(null)
  const [partImporting,    setPartImporting]    = useState(false)
  const [partImportResult, setPartImportResult] = useState<{ upserted: number; modified: number; skipped: number; total: number } | null>(null)
  const [partImportError,  setPartImportError]  = useState('')
  const partFileRef = useRef<HTMLInputElement>(null)
  const [selectedPartIds,   setSelectedPartIds]   = useState<Set<string>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [bulkDeleting,      setBulkDeleting]      = useState(false)
  const [bulkDeleteError,   setBulkDeleteError]   = useState('')

  // ─── Pincodes ────────────────────────────────────────────────────────────
  const [pinRecords,   setPinRecords]  = useState<PincodeRow[]>([])
  const [pinTotal,     setPinTotal]    = useState(0)
  const [pinSearch,    setPinSearch]   = useState('')
  const [pinPage,      setPinPage]     = useState(1)
  const [showNewPin,   setShowNewPin]  = useState(false)
  const [newPin,       setNewPin]      = useState({ pincode: '', post_office: '', taluka: '', district: '', state: '', areaId: '' })
  const [savingNewPin, setSavingNewPin]= useState(false)
  const [newPinError,  setNewPinError] = useState('')
  const [editPinId,    setEditPinId]   = useState<string | null>(null)
  const [editPin,      setEditPin]     = useState({ pincode: '', post_office: '', taluka: '', district: '', state: '', areaId: '' })
  const [savingPin,    setSavingPin]   = useState(false)
  const [delPinId,     setDelPinId]    = useState<string | null>(null)
  const [importing,    setImporting]    = useState(false)
  const [importResult, setImportResult] = useState<{ upserted: number; modified: number; skipped: number; total: number } | null>(null)
  const [importError,  setImportError]  = useState('')
  const pinFileRef = useRef<HTMLInputElement>(null)
  const [pinStateFilter,    setPinStateFilter]    = useState('')
  const [pinAreaFilter,     setPinAreaFilter]     = useState('')
  const [pinRegionFilter,   setPinRegionFilter]   = useState('')
  const [distinctStates,    setDistinctStates]    = useState<string[]>([])

  // ─── Loaders ──────────────────────────────────────────────────────────────
  function loadRegions() {
    return Promise.all([
      api.get<RegionRow[]>('/api/regions').then(setRegionRows),
      api.get<{ _id: string; name: string }[]>('/api/users?roles=rsm').then(setRsmList),
    ])
  }
  function loadAreas() {
    return Promise.all([
      api.get<AreaRow[]>('/api/areas').then(setAreaRows),
      api.get<{ _id: string; name: string }[]>('/api/users?roles=area_manager').then(setAmList),
      api.get<RegionRow[]>('/api/regions').then(d => setRegionOpts(d.map(r => ({ _id: r._id, name: r.name })))),
    ])
  }
  function loadLaborCharges() {
    return api.get<LaborChargeRow[]>('/api/labor-charges').then(setLaborCharges)
  }
  function loadParts() {
    return api.get<PartRow[]>('/api/parts').then(setParts)
  }
  function loadPincodes(q = pinSearch, page = pinPage, stateF = pinStateFilter, areaF = pinAreaFilter, regionF = pinRegionFilter) {
    const params = new URLSearchParams({ page: String(page), limit: '50' })
    if (q)       params.set('q',        q)
    if (stateF)  params.set('state',    stateF)
    if (areaF)   params.set('areaId',   areaF)
    else if (regionF) params.set('regionId', regionF)
    return api.get<{ records: PincodeRow[]; total: number }>(`/api/location-master?${params}`)
      .then(data => { setPinRecords(data.records); setPinTotal(data.total) })
  }

  useEffect(() => {
    loadRegions().catch(() => {})
    loadAreas().catch(() => {})
    loadLaborCharges().catch(() => {})
    loadParts().catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === 'pincodes') loadPincodes(pinSearch, pinPage, pinStateFilter, pinAreaFilter, pinRegionFilter).catch(() => {})
  }, [tab, pinSearch, pinPage, pinStateFilter, pinAreaFilter, pinRegionFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if ((tab === 'pincodes' || tab === 'regions') && distinctStates.length === 0) {
      api.get<string[]>('/api/location-master/distinct?field=state').then(setDistinctStates).catch(() => {})
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Region CRUD ──────────────────────────────────────────────────────────
  async function createRegion() {
    setSavingNewReg(true)
    try {
      await api.post('/api/regions', { name: newRegName.trim(), managerId: newRegMgr || undefined, states: newRegStates })
      await loadRegions()
      setShowNewReg(false); setNewRegName(''); setNewRegMgr(''); setNewRegStates([])
    } catch { /* ignore */ } finally { setSavingNewReg(false) }
  }
  async function saveRegion(id: string) {
    setSavingReg(true)
    try {
      await api.put(`/api/regions/${id}`, { name: editRegName.trim(), managerId: editRegMgr || null, states: editRegStates })
      await loadRegions(); setEditRegId(null)
    } catch { /* ignore */ } finally { setSavingReg(false) }
  }
  async function deleteRegion(id: string) {
    await api.delete(`/api/regions/${id}`)
    await loadRegions(); setDelRegId(null)
  }

  // ─── Area CRUD ────────────────────────────────────────────────────────────
  async function createArea() {
    setSavingNewArea(true)
    try {
      await api.post('/api/areas', { name: newAreaName.trim(), regionId: newAreaReg, managerIds: newAreaMgr })
      await loadAreas()
      setShowNewArea(false); setNewAreaName(''); setNewAreaReg(''); setNewAreaMgr([])
    } catch { /* ignore */ } finally { setSavingNewArea(false) }
  }
  async function saveArea(id: string) {
    setSavingArea(true)
    try {
      await api.put(`/api/areas/${id}`, { name: editAreaName.trim(), managerIds: editAreaMgr })
      await loadAreas(); setEditAreaId(null)
    } catch { /* ignore */ } finally { setSavingArea(false) }
  }
  async function deleteArea(id: string) {
    await api.delete(`/api/areas/${id}`)
    await loadAreas(); setDelAreaId(null)
  }

  // ─── Labor Charge CRUD ────────────────────────────────────────────────────
  async function createLaborCharge() {
    setSavingNewLc(true); setNewLcError('')
    try {
      await api.post('/api/labor-charges', newLc)
      await loadLaborCharges()
      setShowNewLc(false); setNewLc({ defectCode: '', defect: '', aggregate: '', subAggregate: '' })
    } catch (e: unknown) {
      setNewLcError(e instanceof Error ? e.message : 'Failed')
    } finally { setSavingNewLc(false) }
  }
  async function saveLaborCharge(id: string) {
    setSavingLc(true)
    try {
      await api.put(`/api/labor-charges/${id}`, editLc)
      await loadLaborCharges(); setEditLcId(null)
    } catch { /* ignore */ } finally { setSavingLc(false) }
  }
  async function deleteLaborCharge(id: string) {
    await api.delete(`/api/labor-charges/${id}`)
    await loadLaborCharges(); setDelLcId(null)
  }
  async function handleLcImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setLcImporting(true); setLcImportError(''); setLcImportResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await api.upload<{ upserted: number; modified: number; skipped: number; total: number }>(
        '/api/labor-charges/import', formData
      )
      setLcImportResult(result)
      await loadLaborCharges()
    } catch (err: unknown) {
      setLcImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLcImporting(false)
    }
  }
  async function downloadLcExcel() {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Labor Charges')
    ws.views = [{ showGridLines: false }]

    const NAVY = '1E1951'
    function applyFill(cell: ExcelJS.Cell, hex: string) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } }
    }

    const headers = ['Aggregate', 'Sub Aggregate', 'Defect', 'Defect Code']
    const headerRow = ws.addRow(headers)
    headerRow.eachCell({ includeEmpty: true }, cell => {
      applyFill(cell, NAVY)
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    })
    headerRow.height = 22

    filteredLc.forEach((lc, i) => {
      const r  = ws.addRow([lc.aggregate, lc.subAggregate, lc.defect, lc.defectCode])
      const bg = i % 2 === 1 ? 'F9FAFB' : 'FFFFFF'
      r.eachCell({ includeEmpty: true }, cell => {
        applyFill(cell, bg)
        cell.font = { size: 9 }
      })
    })

    ws.columns = [24, 24, 34, 16].map(width => ({ width }))

    const buffer = await wb.xlsx.writeBuffer()
    const blob   = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = `labor-charges-${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadPartsExcel() {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Parts')
    ws.views = [{ showGridLines: false }]

    const NAVY = '1E1951'
    function applyFill(cell: ExcelJS.Cell, hex: string) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex } }
    }

    const headers = ['Component Number', 'Description', 'Category', 'Max Qty']
    const headerRow = ws.addRow(headers)
    headerRow.eachCell({ includeEmpty: true }, cell => {
      applyFill(cell, NAVY)
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    })
    headerRow.height = 22

    filteredParts.forEach((p, i) => {
      const r  = ws.addRow([p.componentNumber, p.description, p.category ?? '', p.maxQty ?? ''])
      const bg = i % 2 === 1 ? 'F9FAFB' : 'FFFFFF'
      r.eachCell({ includeEmpty: true }, cell => {
        applyFill(cell, bg)
        cell.font = { size: 9 }
      })
    })

    ws.columns = [20, 34, 30, 12].map(width => ({ width }))

    const buffer = await wb.xlsx.writeBuffer()
    const blob   = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = `parts-master-${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Parts CRUD ───────────────────────────────────────────────────────────
  function partPayload(f: PartFormState) {
    return {
      componentNumber: f.componentNumber,
      description:      f.description,
      category:          f.category || undefined,
      maxQty:            f.maxQty === '' ? undefined : Number(f.maxQty),
    }
  }
  async function createPart() {
    setSavingNewPart(true); setNewPartError('')
    try {
      await api.post('/api/parts', partPayload(newPart))
      await loadParts()
      setShowNewPart(false); setNewPart({ componentNumber: '', description: '', category: '', maxQty: '' })
    } catch (e: unknown) {
      setNewPartError(e instanceof Error ? e.message : 'Failed')
    } finally { setSavingNewPart(false) }
  }
  async function savePart(id: string) {
    setSavingPart(true)
    try {
      await api.put(`/api/parts/${id}`, partPayload(editPart))
      await loadParts(); setEditPartId(null)
    } catch { /* ignore */ } finally { setSavingPart(false) }
  }
  async function deletePart(id: string) {
    await api.delete(`/api/parts/${id}`)
    await loadParts(); setDelPartId(null)
  }
  function togglePartSelected(id: string) {
    setSelectedPartIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleAllPartsSelected() {
    setSelectedPartIds(prev =>
      prev.size === filteredParts.length ? new Set() : new Set(filteredParts.map(p => p._id))
    )
  }
  async function bulkDeleteParts() {
    setBulkDeleting(true); setBulkDeleteError('')
    try {
      await api.post('/api/parts/bulk-delete', { ids: [...selectedPartIds] })
      await loadParts()
      setSelectedPartIds(new Set()); setBulkDeleteConfirm(false)
    } catch (e: unknown) {
      setBulkDeleteError(e instanceof Error ? e.message : 'Failed to delete parts')
    } finally { setBulkDeleting(false) }
  }
  async function handlePartImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPartImporting(true); setPartImportError(''); setPartImportResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await api.upload<{ upserted: number; modified: number; skipped: number; total: number }>(
        '/api/parts/import', formData
      )
      setPartImportResult(result)
      await loadParts()
    } catch (err: unknown) {
      setPartImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setPartImporting(false)
    }
  }

  // ─── Pincode CRUD ─────────────────────────────────────────────────────────
  async function createPincode() {
    setSavingNewPin(true); setNewPinError('')
    try {
      await api.post('/api/location-master', newPin)
      setPinSearch(''); setPinPage(1)
      await loadPincodes('', 1)
      setShowNewPin(false); setNewPin({ pincode: '', post_office: '', taluka: '', district: '', state: '', areaId: '' })
    } catch (e: unknown) {
      setNewPinError(e instanceof Error ? e.message : 'Failed')
    } finally { setSavingNewPin(false) }
  }
  async function savePincode(id: string) {
    setSavingPin(true)
    try {
      await api.put(`/api/location-master/${id}`, editPin)
      await loadPincodes(); setEditPinId(null)
    } catch { /* ignore */ } finally { setSavingPin(false) }
  }
  async function deletePincode(id: string) {
    await api.delete(`/api/location-master/${id}`)
    await loadPincodes(); setDelPinId(null)
  }
  async function handlePinImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true); setImportError(''); setImportResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await api.upload<{ upserted: number; modified: number; skipped: number; total: number }>(
        '/api/location-master/import', formData
      )
      setImportResult(result)
      setPinSearch(''); setPinPage(1)
      await loadPincodes('', 1)
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  // ─── Derived lists ────────────────────────────────────────────────────────
  const statesUsageMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of regionRows) {
      for (const s of r.states ?? []) map.set(s, r.name)
    }
    return map
  }, [regionRows])

  const filteredAreas = useMemo(
    () => areaFilter ? areaRows.filter(a => (typeof a.regionId === 'object' ? a.regionId._id : a.regionId) === areaFilter) : areaRows,
    [areaRows, areaFilter]
  )

  const lcAggregates = useMemo(() => [...new Set(laborCharges.map(f => f.aggregate))].sort(), [laborCharges])
  const filteredLc    = useMemo(() => {
    let list = laborCharges
    if (lcAggFilter) list = list.filter(f => f.aggregate === lcAggFilter)
    if (lcSearch) {
      const q = lcSearch.toLowerCase()
      list = list.filter(f => f.defectCode.toLowerCase().includes(q) || f.defect.toLowerCase().includes(q))
    }
    return list
  }, [laborCharges, lcAggFilter, lcSearch])

  const partCategories = useMemo(() => [...new Set(parts.map(p => p.category).filter((c): c is string => !!c))].sort(), [parts])
  const filteredParts  = useMemo(() => {
    let list = parts
    if (partCategoryFilter) list = list.filter(p => p.category === partCategoryFilter)
    if (partSearch) {
      const q = partSearch.toLowerCase()
      list = list.filter(p => p.componentNumber.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    }
    return list
  }, [parts, partCategoryFilter, partSearch])
  const partTotalPages = Math.max(1, Math.ceil(filteredParts.length / PART_PAGE_SIZE))
  useEffect(() => {
    if (partPage > partTotalPages) setPartPage(partTotalPages)
  }, [partTotalPages]) // eslint-disable-line react-hooks/exhaustive-deps
  const pagedParts = useMemo(
    () => filteredParts.slice((partPage - 1) * PART_PAGE_SIZE, partPage * PART_PAGE_SIZE),
    [filteredParts, partPage]
  )

  // ─── Shared UI helpers ────────────────────────────────────────────────────
  const EditBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="text-gray-400 hover:text-indigo-600 transition-colors">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  )
  const DelBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="text-gray-400 hover:text-red-500 transition-colors">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  )
  function DeleteConfirm({ label, onConfirm, onCancel, colSpan }: { label: string; onConfirm: () => void; onCancel: () => void; colSpan: number }) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-5 py-3 bg-red-50 border-b border-red-100">
          <div className="flex items-center justify-between">
            <p className="text-xs text-red-700 font-medium">Delete <strong>{label}</strong>?</p>
            <div className="flex gap-2">
              <button onClick={onCancel} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1">Cancel</button>
              <button onClick={onConfirm} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg px-3 py-1">Delete</button>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  const TAB_META: { id: Tab; label: string; count: number }[] = [
    { id: 'regions',    label: 'Regions',    count: regionRows.length },
    { id: 'areas',      label: 'Areas',      count: areaRows.length },
    { id: 'labor-charges',label: 'Labor Charges',count: laborCharges.length },
    { id: 'parts',      label: 'Parts',      count: parts.length },
    { id: 'pincodes',   label: 'PIN Codes',  count: pinTotal },
  ]

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#1E1951] mb-1">Master Setup</h1>
          <p className="text-gray-500 text-sm">Manage geography, labor charges, and parts catalog</p>
        </div>
        <div className="flex gap-2">
          {tab === 'regions'     && <button onClick={() => setShowNewReg(s => !s)}    className="flex items-center gap-1.5 bg-[#1E1951] hover:bg-[#16133d] text-white text-xs font-semibold rounded-xl px-4 py-2"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New Region</button>}
          {tab === 'areas'       && <button onClick={() => setShowNewArea(s => !s)}   className="flex items-center gap-1.5 bg-[#1E1951] hover:bg-[#16133d] text-white text-xs font-semibold rounded-xl px-4 py-2"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New Area</button>}
          {tab === 'labor-charges' && (
            <>
              <input ref={lcFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleLcImport} className="hidden" />
              <button
                onClick={() => { setLcImportResult(null); setLcImportError(''); lcFileRef.current?.click() }}
                disabled={lcImporting}
                className="flex items-center gap-1.5 bg-white hover:bg-gray-50 disabled:opacity-50 text-[#1E1951] text-xs font-semibold rounded-xl px-4 py-2 border border-gray-200"
              ><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0L8 8m4-4l4 4M4 20h16" /></svg>{lcImporting ? 'Importing…' : 'Import'}</button>
              <button onClick={downloadLcExcel} className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-[#1E1951] text-xs font-semibold rounded-xl px-4 py-2 border border-gray-200"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" /></svg>Download</button>
              <button onClick={() => { setShowNewLc(s => !s); setNewLcError('') }} className="flex items-center gap-1.5 bg-[#1E1951] hover:bg-[#16133d] text-white text-xs font-semibold rounded-xl px-4 py-2"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New Labor Charge</button>
            </>
          )}
          {tab === 'parts'       && (
            <>
              <input ref={partFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handlePartImport} className="hidden" />
              <button
                onClick={() => { setPartImportResult(null); setPartImportError(''); partFileRef.current?.click() }}
                disabled={partImporting}
                className="flex items-center gap-1.5 bg-white hover:bg-gray-50 disabled:opacity-50 text-[#1E1951] text-xs font-semibold rounded-xl px-4 py-2 border border-gray-200"
              ><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0L8 8m4-4l4 4M4 20h16" /></svg>{partImporting ? 'Importing…' : 'Import'}</button>
              <button onClick={downloadPartsExcel} className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-[#1E1951] text-xs font-semibold rounded-xl px-4 py-2 border border-gray-200"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" /></svg>Download</button>
              <button onClick={() => { setShowNewPart(s => !s); setNewPartError('') }} className="flex items-center gap-1.5 bg-[#1E1951] hover:bg-[#16133d] text-white text-xs font-semibold rounded-xl px-4 py-2"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New Part</button>
            </>
          )}
          {tab === 'pincodes' && (
            <button onClick={() => { setShowNewPin(s => !s); setNewPinError('') }} className="flex items-center gap-1.5 bg-[#1E1951] hover:bg-[#16133d] text-white text-xs font-semibold rounded-xl px-4 py-2"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New PIN Code</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {TAB_META.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors ${
              tab === t.id ? 'bg-white text-[#1E1951] shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}>
            {t.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-[#fde9df] text-[#E76124]' : 'bg-gray-200 text-gray-400'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ═══════ REGIONS ═══════ */}
      {tab === 'regions' && (
        <div className="space-y-3">
          {showNewReg && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">New Region</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Region Name *">
                  <input value={newRegName} onChange={e => setNewRegName(e.target.value)} placeholder="e.g. West Zone" className={inputCls} />
                </Field>
                <Field label="Regional Manager (optional)">
                  <select value={newRegMgr} onChange={e => setNewRegMgr(e.target.value)} className={inputCls}>
                    <option value="">Assign later…</option>
                    {rsmList.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                  </select>
                </Field>
                <Field label="States" span2>
                  <StatePicker
                    allStates={distinctStates}
                    selected={newRegStates}
                    takenMap={statesUsageMap}
                    excludeRegionName=""
                    onToggle={(s, checked) => setNewRegStates(prev => checked ? [...prev, s] : prev.filter(x => x !== s))}
                  />
                </Field>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setShowNewReg(false); setNewRegName(''); setNewRegMgr(''); setNewRegStates([]) }} className="flex-1 text-xs text-gray-400 border border-gray-200 rounded-lg py-1.5">Cancel</button>
                <button onClick={createRegion} disabled={savingNewReg || !newRegName.trim()} className="flex-1 text-xs font-semibold text-white bg-[#E76124] hover:bg-[#cf5520] disabled:opacity-40 rounded-lg py-1.5">{savingNewReg ? 'Saving…' : 'Create'}</button>
              </div>
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Region</th>
                  <th className="px-5 py-3 text-left font-medium">States</th>
                  <th className="px-5 py-3 text-left font-medium">Regional Manager</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {regionRows.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-xs text-gray-400">No regions yet.</td></tr>}
                {regionRows.map(r => (
                  <>
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-[#1E1951]">{r.name}</td>
                      <td className="px-5 py-3 text-xs">
                        {(r.states?.length ?? 0) === 0
                          ? <span className="text-gray-300">—</span>
                          : <div className="flex flex-wrap gap-1">
                              {(r.states ?? []).slice(0, 3).map(s => (
                                <span key={s} className="bg-indigo-50 text-indigo-600 text-[10px] font-medium px-2 py-0.5 rounded-full">{s}</span>
                              ))}
                              {(r.states?.length ?? 0) > 3 && (
                                <span className="bg-gray-100 text-gray-400 text-[10px] px-2 py-0.5 rounded-full">+{(r.states?.length ?? 0) - 3}</span>
                              )}
                            </div>
                        }
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {r.managerId
                          ? <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">{r.managerId.name[0]}</span>{r.managerId.name}</span>
                          : <span className="text-gray-300 italic">Unassigned</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EntityHistoryPopover entityType="region" entityId={r._id} />
                          <EditBtn onClick={() => { setEditRegId(editRegId === r._id ? null : r._id); setEditRegName(r.name); setEditRegMgr(r.managerId?._id ?? ''); setEditRegStates(r.states ?? []) }} />
                          <DelBtn onClick={() => setDelRegId(delRegId === r._id ? null : r._id)} />
                        </div>
                      </td>
                    </tr>
                    {editRegId === r._id && (
                      <tr key={`re-${r._id}`}>
                        <td colSpan={4} className="px-5 py-3 bg-indigo-50 border-b border-indigo-100">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <Field label="Region Name"><input value={editRegName} onChange={e => setEditRegName(e.target.value)} className={inputCls} /></Field>
                            <Field label="Regional Manager">
                              <select value={editRegMgr} onChange={e => setEditRegMgr(e.target.value)} className={inputCls}>
                                <option value="">Unassigned</option>
                                {rsmList.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                              </select>
                            </Field>
                            <Field label="States" span2>
                              <StatePicker
                                allStates={distinctStates}
                                selected={editRegStates}
                                takenMap={statesUsageMap}
                                excludeRegionName={r.name}
                                onToggle={(s, checked) => setEditRegStates(prev => checked ? [...prev, s] : prev.filter(x => x !== s))}
                              />
                            </Field>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditRegId(null)} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-4 py-1.5">Cancel</button>
                            <button onClick={() => saveRegion(r._id)} disabled={savingReg} className="text-xs font-semibold text-white bg-[#1E1951] hover:bg-[#16133d] disabled:opacity-40 rounded-lg px-4 py-1.5">{savingReg ? 'Saving…' : 'Save'}</button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {delRegId === r._id && <DeleteConfirm key={`rd-${r._id}`} label={r.name} colSpan={4} onConfirm={() => deleteRegion(r._id)} onCancel={() => setDelRegId(null)} />}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ AREAS ═══════ */}
      {tab === 'areas' && (
        <div className="space-y-3">
          {showNewArea && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">New Area</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Area Name *"><input value={newAreaName} onChange={e => setNewAreaName(e.target.value)} placeholder="e.g. Pune" className={inputCls} /></Field>
                <Field label="Region *">
                  <select value={newAreaReg} onChange={e => setNewAreaReg(e.target.value)} className={inputCls}>
                    <option value="">Select region…</option>
                    {regionOpts.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                  </select>
                </Field>
                <Field label="Area Managers (optional)" span2>
                  <AMMultiSelect value={newAreaMgr} options={amList} onChange={setNewAreaMgr} />
                </Field>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setShowNewArea(false); setNewAreaName(''); setNewAreaReg(''); setNewAreaMgr([]) }} className="flex-1 text-xs text-gray-400 border border-gray-200 rounded-lg py-1.5">Cancel</button>
                <button onClick={createArea} disabled={savingNewArea || !newAreaName.trim() || !newAreaReg} className="flex-1 text-xs font-semibold text-white bg-[#E76124] hover:bg-[#cf5520] disabled:opacity-40 rounded-lg py-1.5">{savingNewArea ? 'Saving…' : 'Create'}</button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 mb-2">
            <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#E76124]">
              <option value="">All Regions</option>
              {regionOpts.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
            </select>
            <span className="text-xs text-gray-400">{filteredAreas.length} area{filteredAreas.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Area</th>
                  <th className="px-5 py-3 text-left font-medium">Region</th>
                  <th className="px-5 py-3 text-left font-medium">Area Manager</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAreas.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-xs text-gray-400">No areas yet.</td></tr>}
                {filteredAreas.map(a => (
                  <>
                    <tr key={a._id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-[#1E1951]">{a.name}</td>
                      <td className="px-5 py-3 text-xs">
                        <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{typeof a.regionId === 'object' ? a.regionId.name : '—'}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {(a.managerIds?.length ?? 0) > 0
                          ? <div className="flex flex-row gap-0.5">
                              {a.managerIds!.map(m => (
                                <span key={m._id} className="flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex items-center justify-center shrink-0">{m.name[0]}</span>
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          : <span className="text-gray-300 italic">Unassigned</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EntityHistoryPopover entityType="area" entityId={a._id} />
                          <EditBtn onClick={() => { setEditAreaId(editAreaId === a._id ? null : a._id); setEditAreaName(a.name); setEditAreaMgr(a.managerIds?.map(m => m._id) ?? []) }} />
                          <DelBtn onClick={() => setDelAreaId(delAreaId === a._id ? null : a._id)} />
                        </div>
                      </td>
                    </tr>
                    {editAreaId === a._id && (
                      <tr key={`ae-${a._id}`}>
                        <td colSpan={4} className="px-5 py-3 bg-violet-50 border-b border-violet-100">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <Field label="Area Name"><input value={editAreaName} onChange={e => setEditAreaName(e.target.value)} className={inputCls} /></Field>
                            <Field label="Area Managers">
                              <AMMultiSelect value={editAreaMgr} options={amList} onChange={setEditAreaMgr} placeholder="Unassigned" />
                            </Field>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditAreaId(null)} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-4 py-1.5">Cancel</button>
                            <button onClick={() => saveArea(a._id)} disabled={savingArea} className="text-xs font-semibold text-white bg-[#1E1951] hover:bg-[#16133d] disabled:opacity-40 rounded-lg px-4 py-1.5">{savingArea ? 'Saving…' : 'Save'}</button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {delAreaId === a._id && <DeleteConfirm key={`ad-${a._id}`} label={a.name} colSpan={4} onConfirm={() => deleteArea(a._id)} onCancel={() => setDelAreaId(null)} />}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ LABOR CHARGES ═══════ */}
      {tab === 'labor-charges' && (
        <div className="space-y-3">
          {(lcImportResult || lcImportError) && (
            <div className={`rounded-xl px-4 py-2.5 text-xs ${lcImportError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
              {lcImportError || `Imported ${lcImportResult!.total} rows — ${lcImportResult!.upserted} new, ${lcImportResult!.modified} updated, ${lcImportResult!.skipped} skipped`}
            </div>
          )}
          {showNewLc && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">New Labor Charge</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Defect Code *"><input value={newLc.defectCode} onChange={e => setNewLc(f => ({ ...f, defectCode: e.target.value }))} placeholder="DC-001" className={inputCls} /></Field>
                <Field label="Defect *"><input value={newLc.defect} onChange={e => setNewLc(f => ({ ...f, defect: e.target.value }))} placeholder="e.g. Alternator failure" className={inputCls} /></Field>
                <Field label="Aggregate *"><input value={newLc.aggregate} onChange={e => setNewLc(f => ({ ...f, aggregate: e.target.value }))} placeholder="e.g. Electrical" className={inputCls} /></Field>
                <Field label="Sub Aggregate *"><input value={newLc.subAggregate} onChange={e => setNewLc(f => ({ ...f, subAggregate: e.target.value }))} placeholder="e.g. Alternator" className={inputCls} /></Field>
              </div>
              {newLcError && <p className="text-xs text-red-500 mt-2">{newLcError}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setShowNewLc(false); setNewLc({ defectCode: '', defect: '', aggregate: '', subAggregate: '' }) }} className="flex-1 text-xs text-gray-400 border border-gray-200 rounded-lg py-1.5">Cancel</button>
                <button onClick={createLaborCharge} disabled={savingNewLc || !newLc.defectCode || !newLc.defect || !newLc.aggregate || !newLc.subAggregate} className="flex-1 text-xs font-semibold text-white bg-[#E76124] hover:bg-[#cf5520] disabled:opacity-40 rounded-lg py-1.5">{savingNewLc ? 'Saving…' : 'Create'}</button>
              </div>
            </div>
          )}
          <div className="flex gap-3 mb-1">
            <input value={lcSearch} onChange={e => setLcSearch(e.target.value)} placeholder="Search defect code or defect…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#E76124]" />
            <select value={lcAggFilter} onChange={e => setLcAggFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#E76124]">
              <option value="">All Aggregates</option>
              {lcAggregates.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-xs text-gray-400 self-center">{filteredLc.length}</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Defect Code</th>
                  <th className="px-4 py-3 text-left font-medium">Aggregate</th>
                  <th className="px-4 py-3 text-left font-medium">Sub Aggregate</th>
                  <th className="px-4 py-3 text-left font-medium">Defect</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLc.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-xs text-gray-400">No labor charges found.</td></tr>}
                {filteredLc.map(lc => (
                  <>
                    <tr key={lc._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-[#1E1951]">{lc.defectCode}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{lc.aggregate}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{lc.subAggregate}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{lc.defect}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EntityHistoryPopover entityType="labor_charge" entityId={lc._id} />
                          <EditBtn onClick={() => { setEditLcId(editLcId === lc._id ? null : lc._id); setEditLc({ defectCode: lc.defectCode, defect: lc.defect, aggregate: lc.aggregate, subAggregate: lc.subAggregate }) }} />
                          <DelBtn onClick={() => setDelLcId(delLcId === lc._id ? null : lc._id)} />
                        </div>
                      </td>
                    </tr>
                    {editLcId === lc._id && (
                      <tr key={`lce-${lc._id}`}>
                        <td colSpan={5} className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <Field label="Defect Code"><input value={editLc.defectCode} onChange={e => setEditLc(f => ({ ...f, defectCode: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Aggregate"><input value={editLc.aggregate} onChange={e => setEditLc(f => ({ ...f, aggregate: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Sub Aggregate"><input value={editLc.subAggregate} onChange={e => setEditLc(f => ({ ...f, subAggregate: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Defect" span2><input value={editLc.defect} onChange={e => setEditLc(f => ({ ...f, defect: e.target.value }))} className={inputCls} /></Field>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditLcId(null)} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-4 py-1.5">Cancel</button>
                            <button onClick={() => saveLaborCharge(lc._id)} disabled={savingLc} className="text-xs font-semibold text-white bg-[#1E1951] hover:bg-[#16133d] disabled:opacity-40 rounded-lg px-4 py-1.5">{savingLc ? 'Saving…' : 'Save'}</button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {delLcId === lc._id && <DeleteConfirm key={`lcd-${lc._id}`} label={lc.defectCode} colSpan={5} onConfirm={() => deleteLaborCharge(lc._id)} onCancel={() => setDelLcId(null)} />}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ PARTS ═══════ */}
      {tab === 'parts' && (
        <div className="space-y-3">
          {(partImportResult || partImportError) && (
            <div className={`rounded-xl px-4 py-2.5 text-xs ${partImportError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
              {partImportError || `Imported ${partImportResult!.total} rows — ${partImportResult!.upserted} new, ${partImportResult!.modified} updated, ${partImportResult!.skipped} skipped`}
            </div>
          )}
          {showNewPart && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">New Part</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Component Number *"><input value={newPart.componentNumber} onChange={e => setNewPart(p => ({ ...p, componentNumber: e.target.value }))} placeholder="CN-001" className={inputCls} /></Field>
                <Field label="Max Qty"><input type="number" value={newPart.maxQty} onChange={e => setNewPart(p => ({ ...p, maxQty: e.target.value }))} placeholder="e.g. 4" className={inputCls} /></Field>
                <Field label="Description *" span2><input value={newPart.description} onChange={e => setNewPart(p => ({ ...p, description: e.target.value }))} placeholder="Full part description" className={inputCls} /></Field>
                <Field label="Category" span2>
                  <input value={newPart.category} onChange={e => setNewPart(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Filters" className={inputCls} />
                </Field>
              </div>
              {newPartError && <p className="text-xs text-red-500 mt-2">{newPartError}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setShowNewPart(false); setNewPart({ componentNumber: '', description: '', category: '', maxQty: '' }) }} className="flex-1 text-xs text-gray-400 border border-gray-200 rounded-lg py-1.5">Cancel</button>
                <button onClick={createPart} disabled={savingNewPart || !newPart.componentNumber || !newPart.description} className="flex-1 text-xs font-semibold text-white bg-[#E76124] hover:bg-[#cf5520] disabled:opacity-40 rounded-lg py-1.5">{savingNewPart ? 'Saving…' : 'Create'}</button>
              </div>
            </div>
          )}
          <div className="flex gap-3 mb-1">
            <input value={partSearch} onChange={e => { setPartSearch(e.target.value); setPartPage(1) }} placeholder="Search component number or description…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#E76124]" />
            <select value={partCategoryFilter} onChange={e => { setPartCategoryFilter(e.target.value); setPartPage(1) }} className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#E76124]">
              <option value="">All Categories</option>
              {partCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-xs text-gray-400 self-center">{filteredParts.length}</span>
          </div>
          {selectedPartIds.size > 0 && (
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
              <p className="text-xs font-semibold text-[#1E1951]">{selectedPartIds.size} selected</p>
              <div className="flex gap-2">
                <button onClick={() => setSelectedPartIds(new Set())} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">Clear</button>
                <button onClick={() => setBulkDeleteConfirm(true)} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg px-3 py-1.5">Delete Selected</button>
              </div>
            </div>
          )}
          {bulkDeleteConfirm && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-red-700 font-medium">Delete <strong>{selectedPartIds.size}</strong> selected part{selectedPartIds.size === 1 ? '' : 's'}? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => { setBulkDeleteConfirm(false); setBulkDeleteError('') }} disabled={bulkDeleting} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1 bg-white disabled:opacity-40">Cancel</button>
                  <button onClick={bulkDeleteParts} disabled={bulkDeleting} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 rounded-lg px-3 py-1">{bulkDeleting ? 'Deleting…' : 'Delete'}</button>
                </div>
              </div>
              {bulkDeleteError && <p className="text-xs text-red-600 mt-2">{bulkDeleteError}</p>}
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left w-8">
                    <input type="checkbox"
                      checked={filteredParts.length > 0 && selectedPartIds.size === filteredParts.length}
                      onChange={toggleAllPartsSelected}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Component Number</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Max Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredParts.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-xs text-gray-400">No parts found.</td></tr>}
                {pagedParts.map(p => (
                  <>
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <input type="checkbox"
                          checked={selectedPartIds.has(p._id)}
                          onChange={() => togglePartSelected(p._id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-[#1E1951]">{p.componentNumber}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-700">{p.description}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{p.category ?? ''}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {p.maxQty != null && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{p.maxQty}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EntityHistoryPopover entityType="part" entityId={p._id} />
                          <EditBtn onClick={() => { setEditPartId(editPartId === p._id ? null : p._id); setEditPart({ componentNumber: p.componentNumber, description: p.description, category: p.category ?? '', maxQty: p.maxQty != null ? String(p.maxQty) : '' }) }} />
                          <DelBtn onClick={() => setDelPartId(delPartId === p._id ? null : p._id)} />
                        </div>
                      </td>
                    </tr>
                    {editPartId === p._id && (
                      <tr key={`pe-${p._id}`}>
                        <td colSpan={6} className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <Field label="Component Number"><input value={editPart.componentNumber} onChange={e => setEditPart(x => ({ ...x, componentNumber: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Max Qty"><input type="number" value={editPart.maxQty} onChange={e => setEditPart(x => ({ ...x, maxQty: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Description" span2><input value={editPart.description} onChange={e => setEditPart(x => ({ ...x, description: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Category" span2>
                              <input value={editPart.category} onChange={e => setEditPart(x => ({ ...x, category: e.target.value }))} className={inputCls} />
                            </Field>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditPartId(null)} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-4 py-1.5">Cancel</button>
                            <button onClick={() => savePart(p._id)} disabled={savingPart} className="text-xs font-semibold text-white bg-[#1E1951] hover:bg-[#16133d] disabled:opacity-40 rounded-lg px-4 py-1.5">{savingPart ? 'Saving…' : 'Save'}</button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {delPartId === p._id && <DeleteConfirm key={`pd-${p._id}`} label={p.componentNumber} colSpan={6} onConfirm={() => deletePart(p._id)} onCancel={() => setDelPartId(null)} />}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {filteredParts.length > PART_PAGE_SIZE && (
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>Page {partPage} of {partTotalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPartPage(p => Math.max(1, p - 1))} disabled={partPage === 1} className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:text-gray-600">Prev</button>
                <button onClick={() => setPartPage(p => Math.min(partTotalPages, p + 1))} disabled={partPage >= partTotalPages} className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:text-gray-600">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ PINCODES ═══════ */}
      {tab === 'pincodes' && (
        <div className="space-y-3">
          {showNewPin && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">New PIN Code</p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="PIN Code *"><input value={newPin.pincode} maxLength={6} onChange={e => setNewPin(p => ({ ...p, pincode: e.target.value }))} placeholder="411001" className={inputCls} /></Field>
                <Field label="Post Office"><input value={newPin.post_office} onChange={e => setNewPin(p => ({ ...p, post_office: e.target.value }))} placeholder="Post office name" className={inputCls} /></Field>
                <Field label="Taluka"><input value={newPin.taluka} onChange={e => setNewPin(p => ({ ...p, taluka: e.target.value }))} placeholder="Taluka" className={inputCls} /></Field>
                <Field label="District"><input value={newPin.district} onChange={e => setNewPin(p => ({ ...p, district: e.target.value }))} placeholder="District" className={inputCls} /></Field>
                <Field label="State"><input value={newPin.state} onChange={e => setNewPin(p => ({ ...p, state: e.target.value }))} placeholder="State" className={inputCls} /></Field>
                <Field label="Area">
                  <select value={newPin.areaId} onChange={e => setNewPin(p => ({ ...p, areaId: e.target.value }))} className={inputCls}>
                    <option value="">No area assigned</option>
                    {areaRows.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                  </select>
                </Field>
              </div>
              {newPinError && <p className="text-xs text-red-500 mt-2">{newPinError}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setShowNewPin(false); setNewPin({ pincode: '', post_office: '', taluka: '', district: '', state: '', areaId: '' }) }} className="flex-1 text-xs text-gray-400 border border-gray-200 rounded-lg py-1.5">Cancel</button>
                <button onClick={createPincode} disabled={savingNewPin || newPin.pincode.length !== 6} className="flex-1 text-xs font-semibold text-white bg-[#E76124] hover:bg-[#cf5520] disabled:opacity-40 rounded-lg py-1.5">{savingNewPin ? 'Saving…' : 'Create'}</button>
              </div>
            </div>
          )}
          <input ref={pinFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handlePinImport} className="hidden" />
          <div className="flex gap-3 mb-1 items-center flex-wrap">
            <input value={pinSearch} onChange={e => { setPinSearch(e.target.value); setPinPage(1) }} placeholder="Search PIN, post office, district…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#E76124]" />
            <button
              onClick={() => { setImportResult(null); setImportError(''); pinFileRef.current?.click() }}
              disabled={importing}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#1E1951] hover:bg-[#16133d] text-white px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {importing ? 'Importing…' : 'Upload CSV / Excel'}
            </button>
            <span className="text-xs text-gray-400 self-center shrink-0">{pinTotal} total</span>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <select value={pinStateFilter} onChange={e => { setPinStateFilter(e.target.value); setPinPage(1) }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#E76124]">
              <option value="">All States</option>
              {distinctStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={pinRegionFilter} onChange={e => { setPinRegionFilter(e.target.value); setPinAreaFilter(''); setPinPage(1) }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#E76124]">
              <option value="">All Regions</option>
              {regionOpts.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
            </select>
            <select value={pinAreaFilter} onChange={e => { setPinAreaFilter(e.target.value); setPinPage(1) }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#E76124]">
              <option value="">All Areas</option>
              {(pinRegionFilter
                ? areaRows.filter(a => (typeof a.regionId === 'object' ? a.regionId._id : a.regionId) === pinRegionFilter)
                : areaRows
              ).map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
            {(pinStateFilter || pinRegionFilter || pinAreaFilter) && (
              <button onClick={() => { setPinStateFilter(''); setPinRegionFilter(''); setPinAreaFilter(''); setPinPage(1) }}
                className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
                Clear filters
              </button>
            )}
          </div>
          {importResult && (
            <div className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-1.5">
              Imported {importResult.total} rows — <strong>{importResult.upserted}</strong> new, <strong>{importResult.modified}</strong> updated, {importResult.skipped} skipped
            </div>
          )}
          {importError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
              {importError}
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">PIN Code</th>
                  <th className="px-4 py-3 text-left font-medium">Post Office</th>
                  <th className="px-4 py-3 text-left font-medium">Taluka</th>
                  <th className="px-4 py-3 text-left font-medium">District</th>
                  <th className="px-4 py-3 text-left font-medium">State</th>
                  <th className="px-4 py-3 text-left font-medium">Area / Region</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pinRecords.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-xs text-gray-400">No PIN codes found.</td></tr>}
                {pinRecords.map(p => (
                  <>
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-[#1E1951]">{p.pincode}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-700">{p.post_office || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{p.taluka || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{p.district || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{p.state || '—'}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {p.areaId && typeof p.areaId === 'object'
                          ? <>
                              <span className="font-medium text-[#1E1951]">{p.areaId.name}</span>
                              {p.areaId.regionId && typeof p.areaId.regionId === 'object' && p.areaId.regionId.name &&
                                <span className="block text-[10px] text-indigo-500 mt-0.5">{p.areaId.regionId.name}</span>}
                            </>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EditBtn onClick={() => {
                            setEditPinId(editPinId === p._id ? null : p._id)
                            setEditPin({
                              pincode:     p.pincode,
                              post_office: p.post_office,
                              taluka:      p.taluka,
                              district:    p.district,
                              state:       p.state,
                              areaId:      p.areaId && typeof p.areaId === 'object' ? p.areaId._id : '',
                            })
                          }} />
                          <DelBtn onClick={() => setDelPinId(delPinId === p._id ? null : p._id)} />
                        </div>
                      </td>
                    </tr>
                    {editPinId === p._id && (
                      <tr key={`pine-${p._id}`}>
                        <td colSpan={7} className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <Field label="PIN Code"><input value={editPin.pincode} maxLength={6} onChange={e => setEditPin(x => ({ ...x, pincode: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Post Office"><input value={editPin.post_office} onChange={e => setEditPin(x => ({ ...x, post_office: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Taluka"><input value={editPin.taluka} onChange={e => setEditPin(x => ({ ...x, taluka: e.target.value }))} className={inputCls} /></Field>
                            <Field label="District"><input value={editPin.district} onChange={e => setEditPin(x => ({ ...x, district: e.target.value }))} className={inputCls} /></Field>
                            <Field label="State"><input value={editPin.state} onChange={e => setEditPin(x => ({ ...x, state: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Area">
                              <select value={editPin.areaId} onChange={e => setEditPin(x => ({ ...x, areaId: e.target.value }))} className={inputCls}>
                                <option value="">No area assigned</option>
                                {areaRows.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                              </select>
                            </Field>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditPinId(null)} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-4 py-1.5">Cancel</button>
                            <button onClick={() => savePincode(p._id)} disabled={savingPin} className="text-xs font-semibold text-white bg-[#1E1951] hover:bg-[#16133d] disabled:opacity-40 rounded-lg px-4 py-1.5">{savingPin ? 'Saving…' : 'Save'}</button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {delPinId === p._id && <DeleteConfirm key={`pind-${p._id}`} label={p.pincode} colSpan={7} onConfirm={() => deletePincode(p._id)} onCancel={() => setDelPinId(null)} />}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {pinTotal > 50 && (
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>Page {pinPage} of {Math.ceil(pinTotal / 50)}</span>
              <div className="flex gap-2">
                <button onClick={() => setPinPage(p => Math.max(1, p - 1))} disabled={pinPage === 1} className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:text-gray-600">Prev</button>
                <button onClick={() => setPinPage(p => p + 1)} disabled={pinPage * 50 >= pinTotal} className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:text-gray-600">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
