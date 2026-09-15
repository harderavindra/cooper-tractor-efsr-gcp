import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'success' | 'muted' | 'neutral'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: Variant
  loading?: boolean
  flush?: boolean  // true = no border-radius, uppercase tracking (card-bottom style)
  fullWidth?: boolean
}

const COLORS: Record<Variant, string> = {
  primary: 'bg-indigo-700 hover:bg-indigo-800 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  muted:   'bg-gray-500   hover:bg-gray-600   text-white',
  neutral: 'bg-gray-100   hover:bg-gray-200   text-gray-600',
}

export function CardActionButton({
  variant = 'primary',
  loading = false,
  flush = false,
  fullWidth = true,
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      {...rest}
      className={[
        fullWidth ? 'w-full' : 'flex-1',
        'flex items-center rounded-full justify-center gap-2 transition-colors disabled:opacity-50',
        COLORS[variant],
        flush
          ? 'px-4 py-3 text-xs font-bold tracking-widest uppercase'
          : 'px-4 py-2 text-xs font-semibold rounded-xl',
      ].join(' ')}
    >
      {loading ? '…' : children}
    </button>
  )
}
