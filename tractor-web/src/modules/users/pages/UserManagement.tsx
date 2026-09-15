import { useEffect, useState, useMemo, useRef } from 'react'
import { api } from '../../../shared/lib/api'
import { lookupPincode } from '../../../shared/lib/locationApi'
import { useAuth, type UserRole, ROLE_LABEL } from '../../../shared/context/AuthContext'
import { ProfilePicEditor } from '../components/ProfilePicEditor'
import { PhotoImg } from '../../../shared/components/PhotoImg'
import { Avatar } from '../../../shared/components/Avatar'
import { Lock, Users, Eye, EyeOff } from 'lucide-react'
import { EntityHistoryPopover } from '../../../shared/components/EntityHistoryPopover'

// ── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  _id:          string
  username:     string
  name:         string
  role:         UserRole
  status?:      'active' | 'inactive' | 'archived'
  dealerName?:  string
  email?:       string
  mobile?:      string
  createdAt:    string
  updatedAt?:   string
  address?:     { line1?: string; city?: string; district?: string; state?: string; pinCode?: string }
  employeeId?:  string
  regionId?:    string
  areaIds?:              string[]
  areaManagerIds?:       string[]
  serviceEngineerIds?:   string[]
  serviceTechnicianIds?: string[]
  dealerId?:       string
  pincodes?:    string[]
  profilePic?:  string
  designation?: string
  vendorCode?:  string
  dealerType?:  string
  regionHistory?: { regionId: string; regionName: string; assignedAt: string; unassignedAt?: string; assignedBy?: { userId: string; userName: string } }[]
  areaHistory?:   { areaId:   string; areaName:   string; assignedAt: string; unassignedAt?: string; assignedBy?: { userId: string; userName: string } }[]
  lockoutUntil?: string | null
}

function isUserLocked(user: Pick<UserRow, 'lockoutUntil'>): boolean {
  return !!user.lockoutUntil && new Date(user.lockoutUntil).getTime() > Date.now()
}

interface RegionOption { _id: string; name: string; managerId?: string }
interface AreaOption   { _id: string; name: string; regionId: string; managerIds?: string[] }
interface DealerOption        { _id: string; name: string; dealerName?: string }
interface AreaManagerOption   { _id: string; name: string; areaIds?: string[] }
interface ServiceEngineerOption   { _id: string; name: string }
interface ServiceTechnicianOption { _id: string; name: string }

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<UserRole, string> = {
  admin:              'bg-gray-100 text-gray-700',
  rsm:                'bg-indigo-100 text-indigo-700',
  area_manager:       'bg-violet-100 text-violet-700',
  service_engineer:   'bg-teal-100 text-teal-700',
  service_technician: 'bg-cyan-100 text-cyan-700',
  dealer:             'bg-[#fde9df] text-[#E76124]',
  mechanic:           'bg-green-100 text-green-700',
}
const ALL_ROLES: UserRole[] = ['admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer', 'mechanic']

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E76124]'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function userInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ── Shared UI helpers ──────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <p className="font-semibold uppercase tracking-wide mb-4">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, required, span2, children }: { label: string; required?: boolean; span2?: boolean; children: React.ReactNode }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className="block text-gray-400 mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-gray-400 hover:transition-colors shrink-0">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back to Users
    </button>
  )
}

function StatusBadge({ status, locked }: { status: 'active' | 'inactive' | 'archived'; locked?: boolean }) {
  const cfg = {
    active:   'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
    archived: 'bg-amber-100 text-amber-700',
  }
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <Lock className="w-3 h-3" />
        Locked
      </span>
    )
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function InfoBlock({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <div className={`${span2 ? ' col-span-2' : ''}`}>
      <p className="text-[10px] text-gray-400 mb-0">{label}</p>
      {children}
    </div>
  )
}

// ── AddressFields ──────────────────────────────────────────────────────────────

function AddressFields({
  line1, city, district, state, pinCode, allStates, districtOptions, onChange,
}: {
  line1: string; city: string; district: string; state: string; pinCode: string
  allStates: string[]; districtOptions: string[]
  onChange: (f: 'line1' | 'city' | 'district' | 'state' | 'pinCode', v: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Address Line 1" span2>
        <input value={line1} onChange={e => onChange('line1', e.target.value)} placeholder="Building, street" className={inputCls} />
      </Field>
      <Field label="City">
        <input value={city} onChange={e => onChange('city', e.target.value)} placeholder="City" className={inputCls} />
      </Field>
      <Field label="District">
        <select value={district} onChange={e => onChange('district', e.target.value)} className={inputCls}>
          <option value="">Select district…</option>
          {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="State">
        <select value={state} onChange={e => { onChange('state', e.target.value); onChange('district', '') }} className={inputCls}>
          <option value="">Select state…</option>
          {allStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="PIN Code">
        <input
          value={pinCode} maxLength={6} placeholder="6-digit PIN"
          onChange={async e => {
            const pin = e.target.value; onChange('pinCode', pin)
            if (pin.length === 6) {
              const loc = await lookupPincode(pin)
              if (loc) {
                if (loc.state)    onChange('state',    loc.state)
                if (loc.district) onChange('district', loc.district)
              }
            }
          }}
          className={inputCls}
        />
      </Field>
    </div>
  )
}

// ── RegionPicker / AreaPicker ──────────────────────────────────────────────────

function AssigneePicker<T extends { _id: string; name: string; managerId?: string }>({
  options, users, value, mode, editUserId, placeholder, label,
  getLabel, getId, onChange,
}: {
  options: T[]
  users: { _id: string; name: string }[]
  value: string
  mode: 'create' | 'edit'
  editUserId?: string
  placeholder: string
  label: string
  getLabel: (o: T) => string
  getId: (o: T) => string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setPendingId(null)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  function occupantOf(opt: T) {
    if (!opt.managerId) return null
    return users.find(u => u._id === opt.managerId) ?? null
  }

  function isSelfAssigned(opt: T) {
    return mode === 'edit' && opt.managerId === editUserId
  }

  function handleSelect(id: string) {
    if (!id) { onChange(''); setOpen(false); return }
    const opt = options.find(o => getId(o) === id)
    const occupant = opt ? occupantOf(opt) : null
    const self = opt ? isSelfAssigned(opt) : false
    if (occupant && !self) { setPendingId(id) } else { onChange(id); setOpen(false) }
  }

  function confirm() {
    if (pendingId) { onChange(pendingId); setPendingId(null); setOpen(false) }
  }

  const selected = options.find(o => getId(o) === value)
  const pendingOpt = pendingId ? options.find(o => getId(o) === pendingId) : null
  const pendingOccupant = pendingOpt ? occupantOf(pendingOpt) : null

  return (
    <Field label={label} required span2>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => { setOpen(o => !o); setPendingId(null) }}
          className={`${inputCls} flex items-center justify-between text-left`}
        >
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
            {selected ? getLabel(selected) : placeholder}
          </span>
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div
              className="px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleSelect('')}
            >
              {placeholder}
            </div>
            {options.map(opt => {
              const id = getId(opt)
              const occupant = occupantOf(opt)
              const self = isSelfAssigned(opt)
              const isPending = pendingId === id
              return (
                <div key={id}>
                  <div
                    onClick={() => handleSelect(id)}
                    className={`flex items-center justify-between px-3 py-2.5 border-t border-gray-50 cursor-pointer transition-colors
                      ${value === id ? 'bg-indigo-50' : 'hover:bg-gray-50'}
                      ${isPending ? 'bg-amber-50' : ''}`}
                  >
                    <span className="text-sm font-medium text-gray-800">{getLabel(opt)}</span>
                    {occupant ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Avatar name={occupant.name} size="sm" bg={self ? 'bg-green-600' : 'bg-[#1E1951]'} showPopover={false} />
                        <span className="text-xs text-gray-600">{occupant.name}</span>
                        {self && <span className="text-[9px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">Current</span>}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Unassigned</span>
                    )}
                  </div>
                  {isPending && pendingOccupant && (
                    <div className="bg-amber-50 border-t border-amber-100 px-3 py-2.5">
                      <p className="text-xs text-amber-800 mb-2.5">
                        <strong>{pendingOccupant.name}</strong> is currently managing <strong>{getLabel(pendingOpt!)}</strong>. Saving will unassign them.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setPendingId(null) }}
                          className="text-xs px-3 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); confirm() }}
                          className="text-xs px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold"
                        >
                          Yes, Replace
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Field>
  )
}

// ── AreaChipsSection ─────────────────────────────────────────────────────────
// Area Manager hierarchy: chips for assigned areas + add-popup with region filter

function AreaChipsSection({
  selectedIds, areas, regions, onChange,
}: {
  selectedIds: string[]
  areas: AreaOption[]
  regions: RegionOption[]
  onChange: (ids: string[]) => void
}) {
  const [popupOpen, setPopupOpen] = useState(false)
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [regionFilter, setRegionFilter] = useState('')
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setPopupOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  function openPopup() { setPendingIds([...selectedIds]); setRegionFilter(''); setPopupOpen(true) }

  function togglePending(id: string) {
    setPendingIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function apply() { onChange(pendingIds); setPopupOpen(false) }

  const filteredAreas = regionFilter ? areas.filter(a => a.regionId === regionFilter) : areas

  return (
    <Field label="Areas" required span2>
      <div className="relative">
        <div className="flex flex-wrap gap-1.5 min-h-[38px] px-2 py-1.5 border border-gray-200 rounded-lg bg-white">
          {selectedIds.map(id => {
            const area = areas.find(a => a._id === id)
            if (!area) return null
            const regionName = regions.find(r => r._id === area.regionId)?.name
            return (
              <span key={id} className="inline-flex items-center gap-1 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-1">
                {area.name}
                {regionName && <span className="text-indigo-400 font-normal">· {regionName}</span>}
                <button type="button" onClick={() => onChange(selectedIds.filter(x => x !== id))} className="ml-0.5 hover:text-indigo-900 transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )
          })}
          <button type="button" onClick={openPopup}
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded-full hover:bg-indigo-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>

        {popupOpen && (
          <div ref={popupRef} className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            <div className="px-3 pt-3 pb-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-2">Select Areas</p>
              <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className={`${inputCls} text-xs py-1.5`}>
                <option value="">All regions</option>
                {regions.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredAreas.length === 0
                ? <p className="px-3 py-3 text-xs text-gray-400 text-center">No areas</p>
                : filteredAreas.map(a => (
                  <label key={a._id} className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-50 border-t border-gray-50 ${pendingIds.includes(a._id) ? 'bg-indigo-50' : ''}`}>
                    <input type="checkbox" checked={pendingIds.includes(a._id)} onChange={() => togglePending(a._id)} className="w-4 h-4 rounded accent-indigo-600" />
                    <span className="text-sm font-medium text-gray-800 flex-1">{a.name}</span>
                    <span className="text-[10px] text-gray-400">{regions.find(r => r._id === a.regionId)?.name ?? ''}</span>
                  </label>
                ))
              }
            </div>
            <div className="flex justify-end gap-2 px-3 py-2.5 border-t border-gray-100 bg-gray-50">
              <button type="button" onClick={() => setPopupOpen(false)} className="text-xs px-3 py-1.5 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100">Cancel</button>
              <button type="button" onClick={apply} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">Apply</button>
            </div>
          </div>
        )}
      </div>
    </Field>
  )
}

// ── ManagerChipsSection ──────────────────────────────────────────────────────
// Generic "reports to" picker: chips for assigned manager-tier users + add-popup.
// Used for Service Engineer→Area Managers, Service Technician→Service Engineers,
// and Dealer→Service Technicians.

interface ChipColors {
  chip:      string
  chipSub:   string
  chipClose: string
  addBtn:    string
  checkbox:  string
  rowActive: string
  applyBtn:  string
}

const VIOLET_CHIPS: ChipColors = {
  chip: 'bg-violet-50 text-violet-700 border-violet-200', chipSub: 'text-violet-400',
  chipClose: 'hover:text-violet-900', addBtn: 'text-violet-600 hover:text-violet-800 hover:bg-violet-50',
  checkbox: 'accent-violet-600', rowActive: 'bg-violet-50', applyBtn: 'bg-violet-600 text-white hover:bg-violet-700',
}
const TEAL_CHIPS: ChipColors = {
  chip: 'bg-teal-50 text-teal-700 border-teal-200', chipSub: 'text-teal-400',
  chipClose: 'hover:text-teal-900', addBtn: 'text-teal-600 hover:text-teal-800 hover:bg-teal-50',
  checkbox: 'accent-teal-600', rowActive: 'bg-teal-50', applyBtn: 'bg-teal-600 text-white hover:bg-teal-700',
}
const CYAN_CHIPS: ChipColors = {
  chip: 'bg-cyan-50 text-cyan-700 border-cyan-200', chipSub: 'text-cyan-400',
  chipClose: 'hover:text-cyan-900', addBtn: 'text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50',
  checkbox: 'accent-cyan-600', rowActive: 'bg-cyan-50', applyBtn: 'bg-cyan-600 text-white hover:bg-cyan-700',
}

function ManagerChipsSection<T extends { _id: string; name: string }>({
  label, selectedIds, options, colors, getSubLabel, onChange,
}: {
  label: string
  selectedIds: string[]
  options: T[]
  colors: ChipColors
  getSubLabel?: (o: T) => string | undefined
  onChange: (ids: string[]) => void
}) {
  const [popupOpen, setPopupOpen] = useState(false)
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setPopupOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  function openPopup() { setPendingIds([...selectedIds]); setPopupOpen(true) }

  function togglePending(id: string) {
    setPendingIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function apply() { onChange(pendingIds); setPopupOpen(false) }

  return (
    <Field label={label} required span2>
      <div className="relative">
        <div className="flex flex-wrap gap-1.5 min-h-[38px] px-2 py-1.5 border border-gray-200 rounded-lg bg-white">
          {selectedIds.map(id => {
            const opt = options.find(o => o._id === id)
            if (!opt) return null
            const sub = getSubLabel?.(opt)
            return (
              <span key={id} className={`inline-flex items-center gap-1 text-xs font-medium border rounded-full px-2.5 py-1 ${colors.chip}`}>
                {opt.name}
                {sub && <span className={`font-normal ${colors.chipSub}`}>· {sub}</span>}
                <button type="button" onClick={() => onChange(selectedIds.filter(x => x !== id))} className={`ml-0.5 transition-colors ${colors.chipClose}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )
          })}
          <button type="button" onClick={openPopup}
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${colors.addBtn}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>

        {popupOpen && (
          <div ref={popupRef} className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            <div className="px-3 pt-3 pb-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-700">Select {label}</p>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {options.length === 0
                ? <p className="px-3 py-3 text-xs text-gray-400 text-center">No options found</p>
                : options.map(opt => {
                  const sub = getSubLabel?.(opt)
                  return (
                    <label key={opt._id} className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-50 border-t border-gray-50 ${pendingIds.includes(opt._id) ? colors.rowActive : ''}`}>
                      <input type="checkbox" checked={pendingIds.includes(opt._id)} onChange={() => togglePending(opt._id)} className={`w-4 h-4 rounded ${colors.checkbox}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{opt.name}</p>
                        {sub && <p className="text-[10px] text-gray-400 truncate">{sub}</p>}
                      </div>
                    </label>
                  )
                })
              }
            </div>
            <div className="flex justify-end gap-2 px-3 py-2.5 border-t border-gray-100 bg-gray-50">
              <button type="button" onClick={() => setPopupOpen(false)} className="text-xs px-3 py-1.5 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100">Cancel</button>
              <button type="button" onClick={apply} className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${colors.applyBtn}`}>Apply</button>
            </div>
          </div>
        )}
      </div>
    </Field>
  )
}

// ── HierarchyFields ────────────────────────────────────────────────────────────

function HierarchyFields({
  role, regionId, areaIds, seAMIds, stSEIds, dealerSTIds, dealerId,
  regions, areas, dealers, areaManagers, serviceEngineers, serviceTechnicians, users, mode, editUserId,
  onChange, onAreaIdsChange, onSeAMIdsChange, onStSEIdsChange, onDealerSTIdsChange,
}: {
  role: UserRole; regionId: string; areaIds: string[]
  seAMIds: string[]; stSEIds: string[]; dealerSTIds: string[]; dealerId: string
  regions: RegionOption[]; areas: AreaOption[]; dealers: DealerOption[]; areaManagers: AreaManagerOption[]
  serviceEngineers: ServiceEngineerOption[]; serviceTechnicians: ServiceTechnicianOption[]
  users: { _id: string; name: string }[]
  mode: 'create' | 'edit'
  editUserId?: string
  onChange: (f: string, v: string) => void
  onAreaIdsChange: (ids: string[]) => void
  onSeAMIdsChange: (ids: string[]) => void
  onStSEIdsChange: (ids: string[]) => void
  onDealerSTIdsChange: (ids: string[]) => void
}) {
  if (role === 'rsm') return (
    <AssigneePicker
      options={regions}
      users={users}
      value={regionId}
      mode={mode}
      editUserId={editUserId}
      placeholder="Select region…"
      label="Region"
      getLabel={r => r.name}
      getId={r => r._id}
      onChange={id => onChange('regionId', id)}
    />
  )

  if (role === 'area_manager') return (
    <AreaChipsSection
      selectedIds={areaIds}
      areas={areas}
      regions={regions}
      onChange={onAreaIdsChange}
    />
  )

  if (role === 'service_engineer') return (
    <ManagerChipsSection
      label="Area Managers"
      selectedIds={seAMIds}
      options={areaManagers}
      colors={VIOLET_CHIPS}
      onChange={onSeAMIdsChange}
    />
  )

  if (role === 'service_technician') return (
    <ManagerChipsSection
      label="Service Engineers"
      selectedIds={stSEIds}
      options={serviceEngineers}
      colors={TEAL_CHIPS}
      onChange={onStSEIdsChange}
    />
  )

  if (role === 'dealer') return (
    <ManagerChipsSection
      label="Service Technicians"
      selectedIds={dealerSTIds}
      options={serviceTechnicians}
      colors={CYAN_CHIPS}
      onChange={onDealerSTIdsChange}
    />
  )

  if (role === 'mechanic') return (
    <Field label="Dealer" required span2>
      <select
        value={dealerId}
        onChange={e => {
          const id = e.target.value; onChange('dealerId', id)
          const d = dealers.find(x => x._id === id)
          onChange('dealerName', d?.dealerName ?? d?.name ?? '')
        }}
        className={inputCls}
      >
        <option value="">Select dealer…</option>
        {[...dealers].sort((a, b) => (a.dealerName || a.name).localeCompare(b.dealerName || b.name)).map(d => <option key={d._id} value={d._id}>{d.dealerName || d.name}</option>)}
      </select>
    </Field>
  )

  return null
}

// ── UserFormPage ───────────────────────────────────────────────────────────────

function UserFormPage({ mode, user, onBack, onSaved, onProfilePicUpdated, regions, areas, dealers, areaManagers, serviceEngineers, serviceTechnicians, isDealer, users }: {
  mode: 'create' | 'edit'
  user?: UserRow
  onBack: () => void
  onSaved: () => void
  onProfilePicUpdated?: (url: string | null) => void
  regions: RegionOption[]; areas: AreaOption[]; dealers: DealerOption[]; areaManagers: AreaManagerOption[]
  serviceEngineers: ServiceEngineerOption[]; serviceTechnicians: ServiceTechnicianOption[]
  isDealer: boolean
  users: UserRow[]
}) {
  const { role: actorRole, userId: actorUserId } = useAuth()

  const [name,         setName]         = useState(user?.name         ?? '')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role,         setRole]         = useState<UserRole>(user?.role ?? 'mechanic')
  const [dealerName,   setDealerName]   = useState(user?.dealerName   ?? '')
  const [email,        setEmail]        = useState(user?.email        ?? '')
  const [mobile,       setMobile]       = useState(user?.mobile       ?? '')
  const [addrLine1,    setAddrLine1]    = useState(user?.address?.line1    ?? '')
  const [addrCity,     setAddrCity]     = useState(user?.address?.city     ?? '')
  const [addrDistrict, setAddrDistrict] = useState(user?.address?.district ?? '')
  const [addrState,    setAddrState]    = useState(user?.address?.state    ?? '')
  const [addrPin,      setAddrPin]      = useState(user?.address?.pinCode  ?? '')
  const [employeeId,   setEmployeeId]   = useState(user?.employeeId ?? '')
  const [designation,  setDesignation]  = useState(user?.designation ?? '')
  const [vendorCode,   setVendorCode]   = useState(user?.vendorCode  ?? '')
  const [dealerType,   setDealerType]   = useState(user?.dealerType  ?? '')
  const [regionId,       setRegionId]       = useState(user?.regionId ?? '')
  const [areaIds,        setAreaIds]        = useState<string[]>(user?.areaIds ?? [])
  const [dealerId,       setDealerId]       = useState(user?.dealerId ?? '')
  const [seAMIds,        setSeAMIds]        = useState<string[]>(() => {
    if (user?.role === 'service_engineer') return user.areaManagerIds ?? []
    if (actorRole === 'area_manager' && actorUserId) return [actorUserId]
    return []
  })
  const [stSEIds,        setStSEIds]        = useState<string[]>(() => {
    if (user?.role === 'service_technician') return user.serviceEngineerIds ?? []
    if (actorRole === 'service_engineer' && actorUserId) return [actorUserId]
    return []
  })
  const [dealerSTIds,    setDealerSTIds]    = useState<string[]>(() => {
    if (user?.role === 'dealer') return user.serviceTechnicianIds ?? []
    if (actorRole === 'service_technician' && actorUserId) return [actorUserId]
    return []
  })

  const [allStates,       setAllStates]       = useState<string[]>([])
  const [districtOptions, setDistrictOptions] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    api.get<string[]>('/api/location-master/distinct?field=state')
      .then(setAllStates).catch(() => {})
  }, [])

  useEffect(() => {
    if (!addrState) { setDistrictOptions([]); return }
    api.get<string[]>(`/api/location-master/distinct?field=district&state=${encodeURIComponent(addrState)}`)
      .then(setDistrictOptions).catch(() => {})
  }, [addrState])

  const displacedRsm = useMemo(() => {
    if (role !== 'rsm' || !regionId) return null
    const region = regions.find(r => r._id === regionId)
    if (!region?.managerId) return null
    if (mode === 'edit' && user?._id === region.managerId) return null
    return users.find(u => u._id === region.managerId) ?? null
  }, [role, regionId, regions, users, mode, user])

  function onHierarchyChange(f: string, v: string) {
    if (f === 'regionId')      setRegionId(v)
    else if (f === 'dealerId') setDealerId(v)
    else if (f === 'dealerName') setDealerName(v)
  }

  function onAreaIdsChange(ids: string[]) {
    setAreaIds(ids)
  }

  async function handleSubmit() {
    setSaving(true); setError('')
    try {
      const address = { line1: addrLine1, city: addrCity, district: addrDistrict, state: addrState, pinCode: addrPin }
      const contact = { email: email || undefined, mobile: mobile || undefined }
      if (mode === 'create') {
        if (isDealer) {
          await api.post('/api/users', { name, password, role: 'mechanic', ...contact, address })
        } else {
          await api.post('/api/users', {
            name, password, role,
            dealerName:  (role === 'dealer' || role === 'mechanic') ? (dealerName || undefined) : undefined,
            employeeId:  (role !== 'mechanic') ? (employeeId || undefined) : undefined,
            designation: (role === 'rsm' || role === 'area_manager') ? (designation || undefined) : undefined,
            vendorCode:  role === 'dealer' ? (vendorCode || undefined) : undefined,
            dealerType:  role === 'dealer' ? (dealerType || undefined) : undefined,
            ...contact,
            address,
            regionId:             role === 'rsm'               ? (regionId || undefined) : undefined,
            areaIds:              role === 'area_manager'      ? (areaIds.length   ? areaIds   : undefined) : undefined,
            areaManagerIds:       role === 'service_engineer'  ? (seAMIds.length   ? seAMIds   : undefined) : undefined,
            serviceEngineerIds:   role === 'service_technician'? (stSEIds.length   ? stSEIds   : undefined) : undefined,
            serviceTechnicianIds: role === 'dealer'            ? (dealerSTIds.length ? dealerSTIds : undefined) : undefined,
            dealerId:       role === 'mechanic'      ? (dealerId || undefined)  : undefined,
          })
        }
      } else {
        if (!user) return
        if (isDealer) {
          await api.put(`/api/users/${user._id}`, { name, ...contact, address })
        } else {
          await api.put(`/api/users/${user._id}`, {
            name, role,
            dealerName:  (role === 'dealer' || role === 'mechanic') ? (dealerName || undefined) : undefined,
            employeeId:  (role !== 'mechanic') ? (employeeId || undefined) : undefined,
            designation: (role === 'rsm' || role === 'area_manager') ? (designation || undefined) : undefined,
            vendorCode:  role === 'dealer' ? (vendorCode || undefined) : undefined,
            dealerType:  role === 'dealer' ? (dealerType || undefined) : undefined,
            ...contact,
            address,
            regionId:             role === 'rsm'               ? (regionId || undefined) : undefined,
            areaIds:              role === 'area_manager'      ? (areaIds.length   ? areaIds   : undefined) : undefined,
            areaManagerIds:       role === 'service_engineer'  ? (seAMIds.length   ? seAMIds   : undefined) : undefined,
            serviceEngineerIds:   role === 'service_technician'? (stSEIds.length   ? stSEIds   : undefined) : undefined,
            serviceTechnicianIds: role === 'dealer'            ? (dealerSTIds.length ? dealerSTIds : undefined) : undefined,
            dealerId:       role === 'mechanic'     ? (dealerId || undefined)  : undefined,
          })
        }
      }
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const saveDisabled = saving || !name.trim() ||
    (!email.trim() && !mobile.trim()) ||
    (mode === 'create' && (!password || !confirmPassword || password !== confirmPassword)) ||
    (!isDealer && (
      (role === 'rsm'          && !regionId)                           ||
      (role === 'area_manager' && !areaIds.length)                     ||
      // (role === 'dealer'       && !dealerSTIds.length) ||
      (role === 'dealer'       && !dealerName.trim())                  ||
      (role === 'mechanic'     && (!dealerId || !dealerName.trim()))
    ))

  const showHierarchy = !isDealer && (
    role === 'rsm' || role === 'area_manager' || role === 'service_engineer' || role === 'service_technician' || role === 'dealer'
  )

  const leftCards = (
    <div className="space-y-4">
      <SectionCard title="User Information">
        <div className="grid grid-cols-2 gap-3">
          {!isDealer && (
            <Field label="Role">
              <select value={role} onChange={e => {
                setRole(e.target.value as UserRole)
                setRegionId(''); setAreaIds([]); setSeAMIds([]); setStSEIds([]); setDealerSTIds([]); setDealerId(''); setDealerName('')
                setEmployeeId(''); setDesignation(''); setVendorCode(''); setDealerType('')
              }} className={inputCls}>
                {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </Field>
          )}
          {!isDealer && role === 'dealer' && (
            <Field label="Dealer ID">
              <input value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="Dealer ID / Registration no." className={inputCls} />
            </Field>
          )}
          {!isDealer && role !== 'dealer' && role !== 'mechanic' && (
            <Field label="Employee ID">
              <input value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="Employee ID" className={inputCls} />
            </Field>
          )}
          {!isDealer && role === 'mechanic' && <div />}

          {!isDealer && (role === 'rsm' || role === 'area_manager') && (
            <Field label="Designation">
              <input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Sr. Service Engineer" className={inputCls} />
            </Field>
          )}
          {!isDealer && role === 'dealer' && (
            <Field label="Vendor Code">
              <input value={vendorCode} onChange={e => setVendorCode(e.target.value)} placeholder="Numeric vendor code" className={inputCls} />
            </Field>
          )}
          {!isDealer && role === 'dealer' && (
            <Field label="Dealer Type" span2>
              <select value={dealerType} onChange={e => setDealerType(e.target.value)} className={inputCls}>
                <option value="">Select type…</option>
                <option value="Service">Service</option>
                <option value="Sales & Service">Sales &amp; Service</option>
                <option value="OEM">OEM</option>
              </select>
            </Field>
          )}

          <Field label="Full Name" required span2>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className={inputCls} />
          </Field>

          {!isDealer && role === 'dealer' && (
            <Field label="Dealer / Company Name" required span2>
              <input value={dealerName} onChange={e => setDealerName(e.target.value)} placeholder="Company name" className={inputCls} />
            </Field>
          )}

          {!isDealer && role === 'mechanic' && (
            <Field label="Dealer" required span2>
              <select value={dealerId} onChange={e => {
                const id = e.target.value; setDealerId(id)
                const d = dealers.find(x => x._id === id)
                setDealerName(d?.dealerName ?? d?.name ?? '')
              }} className={inputCls}>
                <option value="">Select dealer…</option>
                {[...dealers].sort((a, b) => (a.dealerName || a.name).localeCompare(b.dealerName || b.name)).map(d => <option key={d._id} value={d._id}>{d.dealerName || d.name}</option>)}
              </select>
            </Field>
          )}

          <Field label="Email" required={!mobile.trim()}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" className={inputCls} />
          </Field>
          <Field label="Mobile" required={!email.trim()}>
            <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="+91 XXXXX XXXXX" className={inputCls} />
          </Field>

          {mode === 'create' && (
            <>
              <Field label="Password" required>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" className={inputCls} />
              </Field>
              <Field label="Confirm Password" required>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className={`${inputCls} ${confirmPassword && password !== confirmPassword ? 'border-red-300 focus:ring-red-400' : ''}`} />
              </Field>
              {confirmPassword && password !== confirmPassword && (
                <p className="col-span-2 text-xs text-red-400 -mt-1">Passwords do not match</p>
              )}
            </>
          )}
        </div>
      </SectionCard>

      {showHierarchy && (
        <SectionCard title="Hierarchy">
          <div className="grid grid-cols-2 gap-3">
            <HierarchyFields
              role={role} regionId={regionId} areaIds={areaIds}
              seAMIds={seAMIds} stSEIds={stSEIds} dealerSTIds={dealerSTIds}
              dealerId={dealerId}
              regions={regions} areas={areas} dealers={dealers} areaManagers={areaManagers}
              serviceEngineers={serviceEngineers} serviceTechnicians={serviceTechnicians}
              users={users} mode={mode} editUserId={user?._id}
              onChange={onHierarchyChange} onAreaIdsChange={onAreaIdsChange}
              onSeAMIdsChange={setSeAMIds} onStSEIdsChange={setStSEIds} onDealerSTIdsChange={setDealerSTIds}
            />
          </div>
          {displacedRsm && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-700">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>
                <strong>{displacedRsm.name}</strong> currently manages this region. Saving will unassign them.
              </span>
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard title="Office Address">
        <AddressFields
          line1={addrLine1} city={addrCity} district={addrDistrict} state={addrState} pinCode={addrPin}
          allStates={allStates} districtOptions={districtOptions}
          onChange={(f, v) => {
            if (f === 'line1')           setAddrLine1(v)
            else if (f === 'city')       setAddrCity(v)
            else if (f === 'district')   setAddrDistrict(v)
            else if (f === 'state')      setAddrState(v)
            else                         setAddrPin(v)
          }}
        />
      </SectionCard>
    </div>
  )

  return (
    <div className="px-6 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <BackBtn onClick={onBack} />
        <h1 className="font-bold flex-1">
          {mode === 'create' ? (isDealer ? 'New Engineer' : 'New User') : `Edit: ${user?.name}`}
        </h1>
        {mode === 'edit' && user && (
          <ProfilePicEditor
            userId={user._id}
            currentUrl={user.profilePic}
            userName={user.name}
            onUpdated={url => onProfilePicUpdated?.(url)}
          />
        )}
      </div>

      {leftCards}

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      <div className="flex gap-3 mt-5 justify-end">
        <button onClick={onBack}
          className="text-sm border border-gray-200 rounded-xl px-5 py-2 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={saveDisabled}
          className="text-sm font-semibold text-white bg-[#E76124] hover:bg-[#cf5520] disabled:opacity-40 rounded-xl px-6 py-2 transition-colors">
          {saving ? 'Saving…' : mode === 'create' ? 'Create User' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ── Main UserManagement ────────────────────────────────────────────────────────

type View = 'list' | 'create' | 'edit'

const MANAGEABLE: Record<string, UserRole[]> = {
  admin:              ['admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer', 'mechanic'],
  rsm:                ['area_manager', 'service_engineer', 'service_technician', 'dealer', 'mechanic'],
  area_manager:       ['service_engineer', 'service_technician', 'dealer', 'mechanic'],
  service_engineer:   ['service_technician', 'dealer', 'mechanic'],
  service_technician: ['dealer', 'mechanic'],
  dealer:             ['mechanic'],
}

const VISIBLE_TABS: Record<string, (UserRole | 'all')[]> = {
  admin:              ['admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer', 'mechanic'],
  rsm:                ['area_manager', 'service_engineer', 'service_technician', 'dealer', 'mechanic'],
  area_manager:       ['service_engineer', 'service_technician', 'dealer', 'mechanic'],
  service_engineer:   ['service_technician', 'dealer', 'mechanic'],
  service_technician: ['dealer', 'mechanic'],
}

const ROLE_ICON: Record<UserRole | 'all', React.ReactNode> = {
  all: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  admin: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  rsm: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
    </svg>
  ),
  area_manager: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  service_engineer: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  service_technician: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={2} />
      <circle cx="9" cy="10" r="2" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 8h2M15 12h2M6.5 16.5c.7-1.5 2-2 2.5-2s1.8.5 2.5 2" />
    </svg>
  ),
  dealer: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  mechanic: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
}

const PAGE_SIZE = 8

export default function UserManagement() {
  const { userId: selfId, role: userRole } = useAuth()
  const isDealer      = userRole === 'dealer'
  const isAdmin       = userRole === 'admin'
  const canManageRoles = MANAGEABLE[userRole ?? ''] ?? []
  const visibleTabs    = VISIBLE_TABS[userRole ?? ''] ?? []

  const [view,           setView]           = useState<View>('list')
  const [selectedUser,   setSelectedUser]   = useState<UserRow | null>(null)
  const [rightPanelMode, setRightPanelMode] = useState<'detail' | 'team'>('detail')

  const [users,   setUsers]   = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [regions,      setRegions]      = useState<RegionOption[]>([])
  const [areas,        setAreas]        = useState<AreaOption[]>([])
  const [dealers,      setDealers]      = useState<DealerOption[]>([])
  const [areaManagers, setAreaManagers] = useState<AreaManagerOption[]>([])
  const [serviceEngineers,   setServiceEngineers]   = useState<ServiceEngineerOption[]>([])
  const [serviceTechnicians, setServiceTechnicians] = useState<ServiceTechnicianOption[]>([])

  // Filters
  const [activeTab,    setActiveTab]    = useState<UserRole | 'all'>('admin')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'archived' | 'locked'>('all')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [filterRegion, setFilterRegion] = useState('')
  const [filterArea,   setFilterArea]   = useState('')

  // Modals
  const [showDeleteModal,     setShowDeleteModal]     = useState(false)
  const [deleteConfirmText,   setDeleteConfirmText]   = useState('')
  const [deleteReason,        setDeleteReason]        = useState('')
  const [deleteComments,      setDeleteComments]      = useState('')
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [deleting,            setDeleting]            = useState(false)
  const [deactivating,        setDeactivating]        = useState(false)
  const [unlocking,           setUnlocking]           = useState(false)
  const [unlockError,         setUnlockError]         = useState('')

  // Password change state (moved to right panel → triggers edit flow via button in panel)
  const [pwdId,        setPwdId]        = useState<string | null>(null)
  const [newPwd,       setNewPwd]       = useState('')
  const [confirmPwd,   setConfirmPwd]   = useState('')
  const [pwdSaving,    setPwdSaving]    = useState(false)
  const [pwdError,     setPwdError]     = useState('')
  const [showPwd,      setShowPwd]      = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)

  function reloadUsers() {
    return api.get<UserRow[]>('/api/users').then(us => setUsers([...us].sort((a, b) => a.name.split(' ')[0].localeCompare(b.name.split(' ')[0]))))
  }

  useEffect(() => {
    reloadUsers().catch(e => setError(e.message)).finally(() => setLoading(false))
    if (!isDealer) {
      api.get<{ _id: string; name: string; managerId?: string | { _id: string } }[]>('/api/regions')
        .then(d => setRegions(d.map(r => ({
          _id: r._id, name: r.name,
          managerId: r.managerId ? (typeof r.managerId === 'object' ? r.managerId._id : r.managerId) : undefined,
        })))).catch(() => {})
      api.get<{ _id: string; name: string; regionId: { _id: string } | string; managerIds?: (string | { _id: string })[] }[]>('/api/areas')
        .then(d => setAreas(d.map(a => ({
          _id: a._id, name: a.name,
          regionId: typeof a.regionId === 'object' ? a.regionId._id : a.regionId,
          managerIds: (a.managerIds ?? []).map(m => typeof m === 'object' ? m._id : m),
        })))).catch(() => {})
      api.get<DealerOption[]>('/api/users?roles=dealer').then(setDealers).catch(() => {})
      api.get<AreaManagerOption[]>('/api/users?roles=area_manager').then(setAreaManagers).catch(() => {})
      api.get<ServiceEngineerOption[]>('/api/users?roles=service_engineer').then(setServiceEngineers).catch(() => {})
      api.get<ServiceTechnicianOption[]>('/api/users?roles=service_technician').then(setServiceTechnicians).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDealer, isAdmin])

  // Reset page on filter changes
  useEffect(() => { setPage(1) }, [activeTab, statusFilter, search])

  function closeDeleteModal() { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteReason(''); setDeleteComments('') }
  function goList() { setView('list'); setSelectedUser(null); closeDeleteModal() }
  function handleSaved() { reloadUsers().then(() => goList()).catch(() => goList()) }

  async function handleChangePassword() {
    if (!pwdId) return
    setPwdSaving(true); setPwdError('')
    try {
      await api.put(`/api/users/${pwdId}/password`, { newPassword: newPwd })
      setPwdId(null); setNewPwd('')
    } catch (e: unknown) {
      setPwdError(e instanceof Error ? e.message : 'Failed')
    } finally { setPwdSaving(false) }
  }

  async function handleDelete() {
    if (!selectedUser) return
    setDeleting(true)
    try {
      await api.delete(`/api/users/${selectedUser._id}`)
      setUsers(list => list.filter(u => u._id !== selectedUser._id))
      setSelectedUser(null)
      closeDeleteModal()
    } catch { /* ignore */ } finally { setDeleting(false) }
  }

  async function handleToggleStatus() {
    if (!selectedUser) return
    setDeactivating(true)
    const currentStatus = selectedUser.status ?? 'active'
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      const updated = await api.patch<UserRow>(`/api/users/${selectedUser._id}/status`, { status: newStatus })
      setUsers(list => list.map(u => u._id === selectedUser._id ? updated : u))
      setSelectedUser(updated)
      setShowDeactivateModal(false)
    } catch { /* ignore */ } finally { setDeactivating(false) }
  }

  async function handleUnlock() {
    if (!selectedUser) return
    setUnlocking(true); setUnlockError('')
    try {
      const updated = await api.patch<UserRow>(`/api/users/${selectedUser._id}/unlock`, {})
      setUsers(list => list.map(u => u._id === selectedUser._id ? updated : u))
      setSelectedUser(updated)
    } catch (e: unknown) {
      setUnlockError(e instanceof Error ? e.message : 'Failed to unlock')
    } finally { setUnlocking(false) }
  }

  const filteredAreasForDropdown = useMemo(
    () => filterRegion ? areas.filter(a => a.regionId === filterRegion) : areas,
    [areas, filterRegion]
  )

  const displayedUsers = useMemo(() => {
    let list = [...users]
    if (!isDealer) {
      list = list.filter(u => u.role === activeTab)
      if (filterRegion) {
        const ids = new Set(areas.filter(a => a.regionId === filterRegion).map(a => a._id))
        list = list.filter(u => u.role === 'rsm' ? u.regionId === filterRegion : u.areaIds?.some(id => ids.has(id)) ?? false)
      }
      if (filterArea) {
        if (activeTab === 'area_manager') {
          list = list.filter(u => u.areaIds?.includes(filterArea))
        } else if (activeTab === 'service_engineer') {
          // service_engineer → areaManagerIds → area manager's areaIds
          const amWithArea = new Set(
            areaManagers.filter(am => am.areaIds?.includes(filterArea)).map(am => am._id)
          )
          list = list.filter(u => u.areaManagerIds?.some(id => amWithArea.has(id)))
        } else if (activeTab === 'service_technician') {
          // service_technician → serviceEngineerIds → service engineer's areaManagerIds → area manager's areaIds
          const amWithArea = new Set(
            areaManagers.filter(am => am.areaIds?.includes(filterArea)).map(am => am._id)
          )
          const sesInArea = new Set(
            users.filter(u => u.role === 'service_engineer' && u.areaManagerIds?.some(id => amWithArea.has(id))).map(u => u._id)
          )
          list = list.filter(u => u.serviceEngineerIds?.some(id => sesInArea.has(id)))
        } else if (activeTab === 'dealer') {
          // dealer → serviceTechnicianIds → service technician's serviceEngineerIds → ... → area manager's areaIds
          const amWithArea = new Set(
            areaManagers.filter(am => am.areaIds?.includes(filterArea)).map(am => am._id)
          )
          const sesInArea = new Set(
            users.filter(u => u.role === 'service_engineer' && u.areaManagerIds?.some(id => amWithArea.has(id))).map(u => u._id)
          )
          const stsInArea = new Set(
            users.filter(u => u.role === 'service_technician' && u.serviceEngineerIds?.some(id => sesInArea.has(id))).map(u => u._id)
          )
          list = list.filter(u => u.serviceTechnicianIds?.some(id => stsInArea.has(id)))
        } else if (activeTab === 'mechanic') {
          // mechanic → dealerId → dealer's serviceTechnicianIds → ... → area manager's areaIds
          const amWithArea = new Set(
            areaManagers.filter(am => am.areaIds?.includes(filterArea)).map(am => am._id)
          )
          const sesInArea = new Set(
            users.filter(u => u.role === 'service_engineer' && u.areaManagerIds?.some(id => amWithArea.has(id))).map(u => u._id)
          )
          const stsInArea = new Set(
            users.filter(u => u.role === 'service_technician' && u.serviceEngineerIds?.some(id => sesInArea.has(id))).map(u => u._id)
          )
          const dealersInArea = new Set(
            users.filter(u => u.role === 'dealer' && u.serviceTechnicianIds?.some(id => stsInArea.has(id))).map(u => u._id)
          )
          list = list.filter(u => u.dealerId != null && dealersInArea.has(u.dealerId))
        }
      }
    }

    // Search
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        u.name.toLowerCase().includes(q) ||
        (u.mobile?.toLowerCase().includes(q) ?? false) ||
        (u.email?.toLowerCase().includes(q) ?? false) ||
        u.username.toLowerCase().includes(q) ||
        (u.dealerName?.toLowerCase().includes(q) ?? false) ||
        (u.vendorCode?.toLowerCase().includes(q) ?? false)
      )
    }

    // Status filter
    if (statusFilter === 'locked') list = list.filter(u => isUserLocked(u))
    else if (statusFilter !== 'all') list = list.filter(u => (u.status ?? 'active') === statusFilter)

    return list.sort((a, b) => {
      const nameA = a.role === 'dealer' ? (a.dealerName ?? a.name) : a.name.split(' ')[0]
      const nameB = b.role === 'dealer' ? (b.dealerName ?? b.name) : b.name.split(' ')[0]
      return nameA.localeCompare(nameB)
    })
  }, [users, isDealer, activeTab, statusFilter, search, filterRegion, filterArea, areas, regions, areaManagers])

  const tabCounts = useMemo(() => {
    const c: Record<string, number> = { all: users.length }
    for (const r of ALL_ROLES) c[r] = users.filter(u => u.role === r).length
    return c
  }, [users])

  const byName = (a: UserRow, b: UserRow) => {
    const nameA = a.role === 'dealer' ? (a.dealerName ?? a.name) : a.name.split(' ')[0]
    const nameB = b.role === 'dealer' ? (b.dealerName ?? b.name) : b.name.split(' ')[0]
    return nameA.localeCompare(nameB)
  }

  const teamMembers = useMemo(() => {
    if (!selectedUser) return []
    if (selectedUser.role === 'rsm') {
      const regionAreaIds = new Set(areas.filter(a => a.regionId === selectedUser.regionId).map(a => a._id))
      return users.filter(u => u.role === 'area_manager' && u.areaIds?.some(id => regionAreaIds.has(id))).sort(byName)
    }
    if (selectedUser.role === 'area_manager') {
      return users.filter(u => u.role === 'service_engineer' && u.areaManagerIds?.includes(selectedUser._id)).sort(byName)
    }
    if (selectedUser.role === 'service_engineer') {
      return users.filter(u => u.role === 'service_technician' && u.serviceEngineerIds?.includes(selectedUser._id)).sort(byName)
    }
    if (selectedUser.role === 'service_technician') {
      return users.filter(u => u.role === 'dealer' && u.serviceTechnicianIds?.includes(selectedUser._id)).sort(byName)
    }
    if (selectedUser.role === 'dealer') {
      return users.filter(u => u.role === 'mechanic' && u.dealerId === selectedUser._id).sort(byName)
    }
    return []
  }, [selectedUser, users, areas])

  const totalPages = Math.max(1, Math.ceil(displayedUsers.length / PAGE_SIZE))
  const pageUsers  = search ? displayedUsers : displayedUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Sub-page renders ────────────────────────────────────────────────────────

  if (view === 'create') return (
    <UserFormPage mode="create" onBack={goList} onSaved={handleSaved}
      regions={regions} areas={areas} dealers={dealers} areaManagers={areaManagers}
      serviceEngineers={serviceEngineers} serviceTechnicians={serviceTechnicians}
      isDealer={isDealer} users={users} />
  )
  if (view === 'edit' && selectedUser) return (
    <UserFormPage mode="edit" user={selectedUser} onBack={goList} onSaved={handleSaved}
      regions={regions} areas={areas} dealers={dealers} areaManagers={areaManagers}
      serviceEngineers={serviceEngineers} serviceTechnicians={serviceTechnicians}
      isDealer={isDealer} users={users}
      onProfilePicUpdated={url => {
        setSelectedUser(u => u ? { ...u, profilePic: url ?? undefined } : u)
        setUsers(list => list.map(u => u._id === selectedUser._id ? { ...u, profilePic: url ?? undefined } : u))
      }}
    />
  )

  // ── List view ────────────────────────────────────────────────────────────────

  const selectedStatus = selectedUser?.status ?? 'active'
  const isSelf = selectedUser?._id === selfId
  const canManageSelected = selectedUser ? canManageRoles.includes(selectedUser.role) : false

  const selAreas  = (selectedUser?.areaIds ?? []).map(id => areas.find(a => a._id === id)).filter(Boolean) as AreaOption[]
  const selArea   = selAreas[0] ?? null
  const selRegion = selectedUser?.regionId
    ? regions.find(r => r._id === selectedUser.regionId) ?? null
    : selArea ? (regions.find(r => r._id === selArea.regionId) ?? null) : null
  const selDealer = selectedUser?.dealerId ? dealers.find(d => d._id === selectedUser.dealerId) ?? null : null

  const selRsm = (selectedUser?.role !== 'rsm' && selRegion?.managerId)
    ? users.find(u => u._id === selRegion.managerId) ?? null
    : null

  const areaIdsForHierarchy: string[] = selectedUser?.areaIds?.length
    ? selectedUser.areaIds
    : (selectedUser?.role === 'mechanic' && selectedUser.dealerId
        ? users.find(u => u._id === selectedUser.dealerId)?.areaIds ?? []
        : [])

  const selAreaManager = (selectedUser?.role !== 'area_manager' && areaIdsForHierarchy.length)
    ? areaManagers.find(am => (am.areaIds ?? []).some(id => areaIdsForHierarchy.includes(id))) ?? null
    : null

  return (
    <div className="px-6 py-6 h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">{isDealer ? 'My Team' : 'Users'}</h1>
          <p className="text-sm text-gray-400">{isDealer ? 'Manage your mechanics' : 'Manage system users'}</p>
        </div>
        {canManageRoles.length > 0 && (
          <button onClick={() => setView('create')}
            className="flex items-center gap-1.5 bg-[#1E1951] hover:bg-[#16133d] text-white text-sm font-semibold rounded-xl px-4 py-2 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {isDealer ? 'New Mechanic' : 'New User'}
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4 shrink-0">{error}</div>}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-12">Loading…</p>
      ) : (
        <div className="flex gap-0 flex-1 min-h-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

          {/* ── Left sidebar ── */}
          <div className="w-52 shrink-0 border-r border-gray-100 flex flex-col py-4 overflow-y-auto">
            {/* Role section */}
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 mb-2">Role</p>
            <div className="space-y-0.5 px-2">
              {(isDealer ? (['mechanic'] as (UserRole | 'all')[]) : visibleTabs).map(t => {
                const count = tabCounts[t as UserRole] ?? 0
                const isActive = activeTab === t
                return (
                  <button key={t}
                    onClick={() => { setActiveTab(t); if (t === 'rsm') setFilterArea('') }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left ${isActive ? 'bg-[#1E1951]/8 text-[#1E1951] font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <span className={isActive ? 'text-[#1E1951]' : 'text-gray-400'}>{ROLE_ICON[t]}</span>
                    <span className="flex-1 truncate">{t === 'all' ? 'All Users' : ROLE_LABEL[t]}</span>
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-[#E76124]/15 text-[#E76124]' : 'bg-gray-100 text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Status section */}
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 mt-6 mb-2">Status</p>
            <div className="space-y-0.5 px-2">
              {(['inactive', 'archived', 'locked'] as const).map(s => {
                const isActive = statusFilter === s
                const count = s === 'locked'
                  ? users.filter(u => isUserLocked(u)).length
                  : users.filter(u => (u.status ?? 'active') === s).length
                return (
                  <button key={s}
                    onClick={() => setStatusFilter(isActive ? 'all' : s)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left ${isActive ? 'bg-[#1E1951]/8 text-[#1E1951] font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${s === 'inactive' ? 'bg-gray-400' : s === 'archived' ? 'bg-amber-400' : 'bg-red-500'}`} />
                    <span className="flex-1 capitalize">{s}</span>
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-[#E76124]/15 text-[#E76124]' : 'bg-gray-100 text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

          </div>

          {/* ── Middle: search + user cards ── */}
          <div className="w-80 shrink-0 border-r border-gray-100 flex flex-col z-2">
            {/* Search + Filter */}
            <div className="p-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, mobile or email…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E76124]"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {!isDealer && (userRole === 'admin' || userRole === 'rsm') && (
                <div className="flex items-center gap-1.5">
                  {userRole === 'admin' && (
                    <select value={filterRegion} onChange={e => { setFilterRegion(e.target.value); setFilterArea('') }}
                      className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#E76124] bg-white text-gray-600">
                      <option value="">All Regions</option>
                      {regions.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                    </select>
                  )}
                  {activeTab !== 'rsm' && (
                    <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
                      className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#E76124] bg-white text-gray-600">
                      <option value="">All Areas</option>
                      {filteredAreasForDropdown.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                    </select>
                  )}
                  {(filterRegion || filterArea) && (
                    <button onClick={() => { setFilterRegion(''); setFilterArea('') }}
                      className="shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* User card list */}
            <div className="flex-2 overflow-y-auto overflow-x-visible">
              {displayedUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                  <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm">No users found</p>
                </div>
              ) : (
                <div className="p-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 py-2">
                    {isDealer ? 'My Team' : 'Team Members'} · {displayedUsers.length}
                  </p>
                  {pageUsers.map(u => {
                    const status = u.status ?? 'active'
                    const statusDot = status === 'active' ? 'bg-green-400' : status === 'archived' ? 'bg-amber-400' : 'bg-gray-300'
                    const isSelected = selectedUser?._id === u._id
                    return (
                      <div
                        key={u._id}
                        onClick={() => { setSelectedUser(u); setRightPanelMode('detail'); closeDeleteModal(); setPwdId(null) }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors group ${isSelected ? 'bg-[#1E1951]/8' : 'hover:bg-gray-50'}`}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <Avatar name={u.name} role={u.role} dealerName={u.dealerName} photo={u.profilePic} userId={u._id} size="lg" />
                          <span className={`w-2 h-2 rounded-full absolute bottom-0 right-0 ${statusDot} mr-1`} title={status} />
                          {isUserLocked(u) && (
                            <span
                              className="w-4 h-4 rounded-full absolute -top-0.5 -right-0.5 bg-red-500 border-2 border-white flex items-center justify-center"
                              title="Account locked"
                            >
                              <Lock className="w-2 h-2 text-white" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        {/* Name + role */}
                        {u.role === 'dealer' ? (
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[#1E1951]' : 'text-gray-800'}`}>
                              {u.dealerName || u.name}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate leading-3">
                              {u.vendorCode && <span className="font-mono text-gray-500">#{u.vendorCode} · </span>}
                              {u.name}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate leading-3">
                              {u.address?.city && <span>@{u.address.city}</span>}
                              {(() => { const am = areaManagers.find(a => (a.areaIds ?? []).some(id => u.areaIds?.includes(id))); return am ? <span> · {am.name}</span> : null })()}
                            </p>
                          </div>
                        ) : (
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#1E1951]' : 'text-gray-800'}`}>{u.name}</p>
                            <p className="text-[11px] text-gray-400 truncate">
                              {ROLE_LABEL[u.role]}
                              {u.role === 'rsm' && (() => { const rg = regions.find(r => r._id === u.regionId); return rg ? <span className="text-gray-400"> · @{rg.name}</span> : null })()}
                              {u.role === 'area_manager' && (() => { const ar = areas.find(a => u.areaIds?.includes(a._id)); return ar ? <span className="text-gray-400"> · @{ar.name}</span> : null })()}
                            </p>
                          </div>
                        )}
                        {/* Action buttons */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {/* Team Members */}
                          {(['rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer'] as UserRole[]).includes(u.role) && (
                            <button
                              onClick={e => { e.stopPropagation(); setSelectedUser(u); setRightPanelMode('team'); closeDeleteModal(); setPwdId(null) }}
                              className=" w-6 h-6 flex items-center justify-center text-gray-300 hover:text-[#1E1951] transition-all rounded"
                              title="Team Members"
                            >
                              <Users size={14} />
                            </button>
                          )}
                          
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
                <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: detail panel ── */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            {!selectedUser ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
                <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">Select a user to view details</p>
              </div>
            ) : rightPanelMode === 'team' ? (
              <div className="p-5 h-full flex flex-col">
                {/* Team panel header */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                  <Avatar name={selectedUser.name} role={selectedUser.role} dealerName={selectedUser.dealerName} photo={selectedUser.profilePic} userId={selectedUser._id} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Team under</p>
                    <p className="text-base font-bold text-gray-900 truncate">{selectedUser.name}</p>
                  </div>
                  <button
                    onClick={() => setRightPanelMode('detail')}
                    className="shrink-0 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                  >
                    View Profile
                  </button>
                </div>

                {teamMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-300 gap-2">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm">No team members</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                      {teamMembers.length} {teamMembers.length === 1 ? 'Member' : 'Members'}
                    </p>
                    {teamMembers.map(member => {
                      const mStatus = member.status ?? 'active'
                      const mDot = mStatus === 'active' ? 'bg-green-400' : mStatus === 'archived' ? 'bg-amber-400' : 'bg-gray-300'
                      return (
                        <div
                          key={member._id}
                          onClick={() => { setSelectedUser(member); setRightPanelMode('detail'); closeDeleteModal(); setPwdId(null) }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-[#1E1951]/5 cursor-pointer transition-colors group"
                        >
                          <Avatar name={member.dealerName || member.name} role={member.role} dealerName={member.dealerName} photo={member.profilePic} userId={member._id} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {member.role === 'dealer' ? (member.dealerName || member.name) : member.name}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">
                              {member.role === 'dealer' ? member.name : (member.dealerName || member.designation || '')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[member.role]}`}>
                              {ROLE_LABEL[member.role]}
                            </span>
                            <span className={`w-2 h-2 rounded-full ${mDot}`} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 space-y-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar
                      name={selectedUser.role === 'dealer' ? (selectedUser.dealerName || selectedUser.name) : selectedUser.name}
                      role={selectedUser.role}
                      dealerName={selectedUser.dealerName}
                      photo={selectedUser.profilePic}
                      userId={selectedUser._id}
                      size="xxl"
                      showPopover={false}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">
                          {selectedUser.role === 'dealer' ? (selectedUser.dealerName || selectedUser.name) : selectedUser.name}
                        </h2>
                        <EntityHistoryPopover entityType="user" entityId={selectedUser._id} />
                      </div>
                      {selectedUser.role === 'dealer' && selectedUser.dealerName && (
                        <p className="text-sm text-gray-600">{selectedUser.name}</p>
                      )}
                      <p className="text-sm text-gray-400">
                        {selectedUser.dealerType && (
                          <span className="capitalize">{selectedUser.dealerType} - </span>
                        )}
                        {selectedUser.vendorCode && (
                        selectedUser.vendorCode
                    )}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <StatusBadge status={selectedStatus} locked={isUserLocked(selectedUser)} />
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[selectedUser.role]}`}>
                          {ROLE_LABEL[selectedUser.role]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    
                    <button
                      onClick={() => { setSelectedUser(null); closeDeleteModal() }}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Contact */}
                {(selectedUser.email || selectedUser.mobile) && (
                  <div>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedUser.email && (
                        <InfoBlock label="Email">
                          <a href={`mailto:${selectedUser.email}`} className="text-sm text-[#1E1951] hover:underline truncate block">{selectedUser.email}</a>
                        </InfoBlock>
                      )}
                      {selectedUser.mobile && (
                        <InfoBlock label="Phone">
                          <a href={`tel:${selectedUser.mobile}`} className="text-sm text-gray-700 hover:underline">{selectedUser.mobile}</a>
                        </InfoBlock>
                      )}
                    </div>
                  </div>
                )}

                {/* Account */}
                <div>
                  <div className="grid grid-cols-2 gap-3">
                  
                    {selectedUser.employeeId && (
                      <InfoBlock label={selectedUser.role === 'dealer' ? 'Dealer ID' : 'Employee ID'}>
                        <p className="text-sm font-mono text-gray-700">{selectedUser.employeeId}</p>
                      </InfoBlock>
                    )}
                    {selectedUser.designation && (
                      <InfoBlock label="Designation">
                        <p className="text-sm text-gray-700">{selectedUser.designation}</p>
                      </InfoBlock>
                    )}

                 
                   
                  </div>
                </div>

                {/* Hierarchy — non-RSM/AM users only */}
                {(selRegion || selArea || selDealer) && selectedUser.role !== 'rsm' && selectedUser.role !== 'area_manager' && (
                  <InfoBlock label="Hierarchy" span2>
                    <p className="text-sm text-gray-700 truncate">
                      {[
                        selRegion?.name,
                        selArea?.name,
                        selAreaManager ? `AM · ${selAreaManager.name}` : selRsm ? `RSM · ${selRsm.name}` : null,
                        selDealer ? (selDealer.dealerName || selDealer.name) : null,
                      ].filter(Boolean).join('  ·  ')}
                    </p>
                  </InfoBlock>
                )}

                {/* Region History — RSM users */}
                {selectedUser.role === 'rsm' && (selRegion || (selectedUser.regionHistory?.length ?? 0) > 0) && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Region History</p>
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                      {(selectedUser.regionHistory?.length ?? 0) > 0
                        ? [...selectedUser.regionHistory!].reverse().map((h, i) => (
                            <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-gray-50' : ''} ${!h.unassignedAt ? 'bg-green-50' : 'bg-white'}`}>
                              <div className={`w-2 h-2 rounded-full shrink-0 ${!h.unassignedAt ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{h.regionName}</p>
                                {h.assignedBy && (
                                  <p className="text-[11px] text-gray-400">by {h.assignedBy.userName}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                {!h.unassignedAt
                                  ? <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">Current</span>
                                  : <span className="text-[10px] text-gray-400">{fmtDate(h.assignedAt)} → {fmtDate(h.unassignedAt)}</span>
                                }
                                {!h.unassignedAt && (
                                  <p className="text-[10px] text-gray-400 mt-0.5">since {fmtDate(h.assignedAt)}</p>
                                )}
                              </div>
                            </div>
                          ))
                        : selRegion && (
                            <div className="flex items-center gap-3 px-3 py-2.5 bg-green-50">
                              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                              <p className="flex-1 text-sm font-semibold text-gray-800">{selRegion.name}</p>
                              <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">Current</span>
                            </div>
                          )
                      }
                    </div>
                  </div>
                )}

                {/* Area History — Area Manager users */}
                {selectedUser.role === 'area_manager' && (selArea || (selectedUser.areaHistory?.length ?? 0) > 0) && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Area History</p>
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                      {(selectedUser.areaHistory?.length ?? 0) > 0
                        ? [...selectedUser.areaHistory!].reverse().map((h, i) => (
                            <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-gray-50' : ''} ${!h.unassignedAt ? 'bg-green-50' : 'bg-white'}`}>
                              <div className={`w-2 h-2 rounded-full shrink-0 ${!h.unassignedAt ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{h.areaName}</p>
                                {h.assignedBy && (
                                  <p className="text-[11px] text-gray-400">by {h.assignedBy.userName}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                {!h.unassignedAt
                                  ? <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">Current</span>
                                  : <span className="text-[10px] text-gray-400">{fmtDate(h.assignedAt)} → {fmtDate(h.unassignedAt)}</span>
                                }
                                {!h.unassignedAt && (
                                  <p className="text-[10px] text-gray-400 mt-0.5">since {fmtDate(h.assignedAt)}</p>
                                )}
                              </div>
                            </div>
                          ))
                        : selArea && (
                            <div className="flex items-center gap-3 px-3 py-2.5 bg-green-50">
                              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                              <p className="flex-1 text-sm font-semibold text-gray-800">{selArea.name}</p>
                              <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">Current</span>
                            </div>
                          )
                      }
                    </div>
                  </div>
                )}

                {/* Address */}
                {selectedUser.address && Object.values(selectedUser.address).some(Boolean) && (
                  <InfoBlock label="Address" span2>
                    <p className="text-sm text-gray-700">
                      {[
                        selectedUser.address.line1,
                        selectedUser.address.city,
                        selectedUser.address.district,
                        selectedUser.address.state,
                        selectedUser.address.pinCode,
                      ].filter(Boolean).join(', ')}
                    </p>
                  </InfoBlock>
                )}

                {/* Pincodes — dealer only */}
                {selectedUser.role === 'dealer' && (selectedUser.pincodes?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                      Allocated Pincodes ({selectedUser.pincodes!.length})
                    </p>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {selectedUser.pincodes!.map(pin => (
                          <span key={pin} className="bg-indigo-50 text-[#1E1951] text-[11px] font-semibold px-2 py-0.5 rounded-full border border-indigo-100">
                            {pin}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity */}
                <div>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoBlock label="Member since">
                      <p className="text-sm text-gray-700">{fmtDate(selectedUser.createdAt)}</p>
                    </InfoBlock>
                    {selectedUser.updatedAt && (
                      <InfoBlock label="Last updated">
                        <p className="text-sm text-gray-700">{fmtDate(selectedUser.updatedAt)}</p>
                      </InfoBlock>
                    )}
                  </div>
                </div>
                {/* Security */}
                {canManageSelected && (
                  <div>
                    
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Security</p>
                    {pwdId === selectedUser._id ? (
                      <div className="border border-violet-200 rounded-xl overflow-hidden">
                        <div className="p-4 space-y-2">
                          <p className="text-sm font-semibold text-violet-700 mb-1">Change Password</p>
                          {/* New password */}
                          <div className="relative">
                            <input
                              type={showPwd ? 'text' : 'password'}
                              value={newPwd}
                              onChange={e => setNewPwd(e.target.value)}
                              placeholder="New password (min 6 chars)"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPwd(s => !s)}
                              className="absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400 hover:text-gray-600"
                            >
                              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                          {/* Confirm password */}
                          <div className="relative">
                            <input
                              type={showConfirm ? 'text' : 'password'}
                              value={confirmPwd}
                              onChange={e => setConfirmPwd(e.target.value)}
                              placeholder="Confirm new password"
                              className={`w-full border rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${confirmPwd && confirmPwd !== newPwd ? 'border-red-300' : 'border-gray-200'}`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirm(s => !s)}
                              className="absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400 hover:text-gray-600"
                            >
                              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                          {confirmPwd && confirmPwd !== newPwd && (
                            <p className="text-xs text-red-500">Passwords do not match</p>
                          )}
                          {pwdError && <p className="text-xs text-red-500">{pwdError}</p>}
                        </div>
                        <div className="px-4 py-3 bg-violet-50 border-t border-violet-100 flex gap-2 justify-end">
                          <button onClick={() => { setPwdId(null); setNewPwd(''); setConfirmPwd(''); setShowPwd(false); setShowConfirm(false) }}
                            className="text-xs text-gray-400 border border-gray-200 rounded-lg px-4 py-1.5 hover:bg-gray-50">
                            Cancel
                          </button>
                          <button onClick={handleChangePassword} disabled={pwdSaving || newPwd.length < 6 || newPwd !== confirmPwd}
                            className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-lg px-4 py-1.5">
                            {pwdSaving ? 'Saving…' : 'Update Password'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 pb-3">
                        {!isSelf && (
                          <button
                            onClick={() => { setPwdId(selectedUser._id); setNewPwd(''); setPwdError('') }}
                            className="flex items-center justify-center gap-2 p-3 bg-gray-800 hover:bg-gray-900 rounded-xl text-sm text-gray-100 transition-colors"
                          >
                            <Lock size={14} />
                            Change Password
                          </button>
                        )}
                        <button
                          onClick={() => setView('edit')}
                          className="flex items-center justify-center gap-2 p-3 bg-gray-800 hover:bg-gray-900 rounded-xl text-sm text-gray-100 transition-colors"
                        >
                          <Users size={14} />
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* Deactivate User card */}
                {canManageSelected && !isSelf && selectedStatus !== 'archived' && (
                  <div className="border border-amber-200 rounded-xl overflow-hidden">
                    <div className="p-4">
                      <p className="text-sm font-semibold text-amber-800 mb-1">
                        {selectedStatus === 'active' ? 'Deactivate User' : 'Activate User'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedStatus === 'active'
                          ? "Suspends this user's access. They will not be able to log in until reactivated."
                          : "Restores this user's access so they can log in again."}
                      </p>
                    </div>
                    <div className="px-4 py-3 bg-amber-50 border-t border-amber-100 flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Currently <strong className="capitalize">{selectedStatus}</strong>
                      </span>
                      <button
                        onClick={() => selectedStatus === 'active' ? setShowDeactivateModal(true) : handleToggleStatus()}
                        disabled={deactivating}
                        className={`text-sm font-semibold rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50 ${
                          selectedStatus === 'active'
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        {deactivating ? 'Saving…' : selectedStatus === 'active' ? 'Deactivate User' : 'Activate User'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Unlock User card — admin only */}
                {isAdmin && !isSelf && selectedUser && isUserLocked(selectedUser) && (
                  <div className="border border-red-200 rounded-xl overflow-hidden">
                    <div className="p-4">
                      <p className="text-sm font-semibold text-red-700 mb-1">Account Locked</p>
                      <p className="text-sm text-gray-500">
                        Account temporarily locked. Try again later. Too many failed login attempts —
                        unlocking clears the lock immediately so the user can sign in again.
                      </p>
                      {unlockError && <p className="text-sm text-red-500 mt-2">{unlockError}</p>}
                    </div>
                    <div className="px-4 py-3 bg-red-50 border-t border-red-100 flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Locked until <strong>{new Date(selectedUser.lockoutUntil!).toLocaleString()}</strong>
                      </span>
                      <button
                        onClick={handleUnlock}
                        disabled={unlocking}
                        className="text-sm font-semibold rounded-xl px-4 py-1.5 transition-colors disabled:opacity-50 bg-red-500 hover:bg-red-600 text-white"
                      >
                        {unlocking ? 'Unlocking…' : 'Unlock User'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Delete User card */}
                {canManageSelected && !isSelf && (
                  <div className="border border-red-200 rounded-xl overflow-hidden">
                    <div className="p-4">
                      <p className="text-sm font-semibold text-red-700 mb-1">Delete User</p>
                      <p className="text-sm text-gray-500">Permanently removes this user and all associated data, sessions, and history. This action cannot be undone.</p>
                    </div>
                    <div className="px-4 py-3 bg-red-50 border-t border-red-100 flex items-center justify-end">
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="text-sm font-semibold text-red-600 border border-red-200 rounded-xl px-4 py-1.5 hover:bg-red-100 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete User
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Delete User Modal ── */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Delete User</h2>
                <p className="text-sm text-gray-500 mt-1">
                  This user will be permanently removed from the system. This action cannot be reversed.
                </p>
              </div>
              <button
                onClick={closeDeleteModal}
                className="ml-4 shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 space-y-4 pb-4">
              {/* User card */}
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#1E1951] text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {selectedUser.profilePic
                    ? <PhotoImg src={selectedUser.profilePic} alt={selectedUser.name} className="w-full h-full object-cover" />
                    : userInitials(selectedUser.name)
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{selectedUser.name}</p>
                  <p className="text-xs text-gray-400">
                    Type <code className="bg-gray-200 text-gray-700 rounded px-1 font-mono">delete</code> to confirm
                  </p>
                </div>
              </div>

              {/* Confirm text input */}
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder='Type "delete" to confirm'
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 placeholder-gray-300"
                autoFocus
              />

              {/* Reason select */}
              <select
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white text-gray-700 appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px', paddingRight: '40px' }}
              >
                <option value="">Select a reason…</option>
                <option value="left_company">Left the company</option>
                <option value="duplicate">Duplicate account</option>
                <option value="wrong_role">Incorrect role setup</option>
                <option value="no_longer_needed">Account no longer needed</option>
                <option value="test_account">Test account</option>
                <option value="other">Other</option>
              </select>

              {/* Comments */}
              <textarea
                value={deleteComments}
                onChange={e => setDeleteComments(e.target.value)}
                placeholder="Additional comments (optional)"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none placeholder-gray-300"
              />
            </div>

            {/* Footer */}
            <div className="bg-red-50 border-t border-red-100 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="text-sm text-gray-500 border border-gray-200 bg-white rounded-xl px-5 py-2.5 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText.toLowerCase() !== 'delete' || deleting}
                className="text-sm font-semibold text-white bg-red-400 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-5 py-2.5 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivate User Modal ── */}
      {showDeactivateModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Deactivate User</h2>
                <p className="text-sm text-gray-500 mt-1">
                  This user's access will be suspended. They will not be able to log in until reactivated.
                </p>
              </div>
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="ml-4 shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 pb-4 space-y-4">
              {/* User card */}
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#1E1951] text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {selectedUser.profilePic
                    ? <PhotoImg src={selectedUser.profilePic} alt={selectedUser.name} className="w-full h-full object-cover" />
                    : userInitials(selectedUser.name)
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{selectedUser.name}</p>
                  <p className="text-xs text-gray-400">@{selectedUser.username} · <span className="capitalize">{selectedUser.role.replace('_', ' ')}</span></p>
                </div>
              </div>

              {/* Reason */}
              <select
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white text-gray-700 appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px', paddingRight: '40px' }}
              >
                <option value="">Select a reason… (optional)</option>
                <option value="leave">Temporary leave of absence</option>
                <option value="review">Suspended pending review</option>
                <option value="role_change">Role change in progress</option>
                <option value="inactive_region">No longer active in this region</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Footer */}
            <div className="bg-amber-50 border-t border-amber-100 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="text-sm text-gray-500 border border-gray-200 bg-white rounded-xl px-5 py-2.5 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={deactivating}
                className="text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl px-5 py-2.5 transition-colors"
              >
                {deactivating ? 'Saving…' : 'Deactivate User'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
