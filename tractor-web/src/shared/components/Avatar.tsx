import { useState } from 'react'
import { PhotoImg } from './PhotoImg'
import { avatarColorFromId } from '../utils/avatarColor'

// ── Size map ──────────────────────────────────────────────────────────────────

const SIZE: Record<string, { wrap: string; text: string }> = {
  xs:  { wrap: 'w-5 h-5',   text: 'text-[8px]'  },
  sm:  { wrap: 'w-6 h-6',   text: 'text-[9px]'  },
  md:  { wrap: 'w-8 h-8',   text: 'text-[11px]' },
  lg:  { wrap: 'w-10 h-10', text: 'text-xs'     },
  xl:  { wrap: 'w-12 h-12', text: 'text-sm'     },
  xxl: { wrap: 'w-16 h-16', text: 'text-base'   },
}

// ── Popover position configs ──────────────────────────────────────────────────

const POPOVER_POS = {
  top: {
    bubble: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow:  'w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#1E1951]',
  },
  right: {
    bubble: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow:  'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-[#1E1951]',
  },
  left: {
    bubble: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow:  'absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-[#1E1951]',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function fmtRole(role: string, dealerName?: string): string {
  const label = role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return dealerName ? `${label} · ${dealerName}` : label
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface AvatarProps {
  name:         string
  role?:        string
  dealerName?:  string
  photo?:       string
  size?:        'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  bg?:          string
  userId?:      string
  showPopover?: boolean
  popoverPos?:  'top' | 'right' | 'left'
  className?:   string
}

export function Avatar({
  name,
  role,
  dealerName,
  photo,
  size = 'sm',
  bg = 'bg-[#1E1951]',
  userId,
  showPopover = true,
  popoverPos  = 'right',
  className = '',
}: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const s   = SIZE[size]
  const pos = POPOVER_POS[popoverPos]
  const showPhoto = !!photo && !imgError

  const circle = (
    <div
      className={`${s.wrap} ${userId ? '' : bg} rounded-full overflow-hidden flex items-center justify-center text-white font-semibold shrink-0 cursor-default ring-2 ring-white ${s.text} ${className}`}
      style={userId ? { backgroundColor: avatarColorFromId(userId) } : undefined}
    >
      {showPhoto ? (
        <PhotoImg
          src={photo!}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        toInitials(name)
      )}
    </div>
  )

  if (!showPopover) return circle

  return (
    <div className="relative group/avatar shrink-0">
      {circle}
      <div className={`absolute ${pos.bubble} z-30 pointer-events-none opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-150  `}>
        <div className="relative bg-[#1E1951] text-white rounded-lg px-3 py-2 whitespace-nowrap shadow-xl ">
          <p className="text-[11px] font-bold leading-tight">{name}</p>
          {role && (
            <p className="text-[10px] text-white/60 leading-tight ">{fmtRole(role, dealerName)}</p>
          )}
          {/* side arrows (right / left positions) */}
          {popoverPos !== 'top' && <div className={pos.arrow} />}
        </div>
        {/* bottom arrow (top position) */}
        {popoverPos === 'top' && <div className={pos.arrow} />}
      </div>
    </div>
  )
}
