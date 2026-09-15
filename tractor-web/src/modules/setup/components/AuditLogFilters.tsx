import type { ChangeLogFilters } from '../../../shared/services/changeLogApi'

const ENTITY_TYPES = [
  { value: '', label: 'All Entities' },
  { value: 'asset',      label: 'Asset' },
  { value: 'user',       label: 'User' },
  { value: 'region',     label: 'Region' },
  { value: 'area',       label: 'Area' },
  { value: 'labor_charge', label: 'Labor Charge' },
  { value: 'part',       label: 'Part' },
]

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'asset_client',      label: 'Client Info' },
  { value: 'asset_contacts',    label: 'Contact Info' },
  { value: 'asset_info',        label: 'Asset Info' },
  { value: 'user_profile',      label: 'User Profile' },
  { value: 'user_role',         label: 'Role' },
  { value: 'user_status',       label: 'Status' },
  { value: 'user_hierarchy',    label: 'Hierarchy' },
  { value: 'master_region',     label: 'Master: Region' },
  { value: 'master_area',       label: 'Master: Area' },
  { value: 'master_labor_charge', label: 'Master: Labor Charge' },
  { value: 'master_part',       label: 'Master: Part' },
]

const ACTIONS = [
  { value: '',        label: 'All Actions' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
]

const SELECT_CLS = 'h-8 px-2 text-sm rounded border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-[#E76124]'

interface Props {
  filters:   ChangeLogFilters
  onChange:  (f: Partial<ChangeLogFilters>) => void
}

export function AuditLogFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select
        className={SELECT_CLS}
        value={filters.entityType ?? ''}
        onChange={e => onChange({ entityType: e.target.value || undefined, page: 1 })}
      >
        {ENTITY_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <select
        className={SELECT_CLS}
        value={filters.category ?? ''}
        onChange={e => onChange({ category: e.target.value || undefined, page: 1 })}
      >
        {CATEGORIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <select
        className={SELECT_CLS}
        value={filters.action ?? ''}
        onChange={e => onChange({ action: e.target.value || undefined, page: 1 })}
      >
        {ACTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <div className="flex items-center gap-1">
        <input
          type="date"
          className={SELECT_CLS}
          value={filters.from ?? ''}
          onChange={e => onChange({ from: e.target.value || undefined, page: 1 })}
        />
        <span className="text-gray-400 text-xs">to</span>
        <input
          type="date"
          className={SELECT_CLS}
          value={filters.to ?? ''}
          onChange={e => onChange({ to: e.target.value || undefined, page: 1 })}
        />
      </div>

      {(filters.entityType || filters.category || filters.action || filters.from || filters.to) && (
        <button
          onClick={() => onChange({ entityType: undefined, category: undefined, action: undefined, from: undefined, to: undefined, page: 1 })}
          className="h-8 px-3 text-xs text-gray-500 hover:text-red-500 border border-gray-200 rounded"
        >
          Clear
        </button>
      )}
    </div>
  )
}
