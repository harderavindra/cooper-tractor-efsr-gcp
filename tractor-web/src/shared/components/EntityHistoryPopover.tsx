import { useState, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { ChangeLogTimeline } from './ChangeLogTimeline'

const ENTITY_LABEL: Record<string, string> = {
  asset:      'Asset',
  user:       'User',
  region:     'Region',
  area:       'Area',
  labor_charge: 'Labor Charge',
  part:       'Part',
  customer:      'Customer',
  tractor_asset: 'Tractor',
  pdi_entry:     'PDI',
}

interface Props {
  entityType: string
  entityId:   string
}

export function EntityHistoryPopover({ entityType, entityId }: Props) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function onEnter() {
    timer.current = setTimeout(() => setOpen(true), 300)
  }

  function onLeave() {
    clearTimeout(timer.current)
    setOpen(false)
  }

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <AlertCircle
        size={14}
        className={`cursor-help transition-colors ${open ? 'text-[#E76124]' : 'text-gray-300 hover:text-[#E76124]'}`}
      />

      {open && (
        <div className="absolute z-50 right-0 top-full mt-1 w-80 max-h-96 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 sticky top-0 bg-white">
            <p className="text-xs font-semibold text-gray-600">Change History</p>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
              {ENTITY_LABEL[entityType] ?? entityType}
            </span>
          </div>
          <ChangeLogTimeline entityType={entityType} entityId={entityId} />
        </div>
      )}
    </div>
  )
}
