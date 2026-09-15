import { Check, X } from 'lucide-react'

interface Props {
  options: [string, string] // [pass, fail]
  value?: string
  onChange: (v: string) => void
  disabled?: boolean
}

export function OkNotOkToggle({ options, value, onChange, disabled }: Props) {
  const [pass, fail] = options
  return (
    <div className="flex shrink-0 bg-gray-100 border border-gray-300 rounded-xl p-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(fail)}
        className={`w-11 h-11 rounded-l-lg border flex items-center justify-center transition-colors ${
          value === fail ? 'bg-red-500/70 border-red-600 text-white' : 'bg-white border-gray-300 text-gray-300'
        }`}
        aria-label={fail}
      >
        <X size={18} />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(pass)}
        className={`w-11 h-11 rounded-r-lg border flex items-center justify-center transition-colors ${
          value === pass ? 'bg-green-500/80 border-green-600 text-white' : 'bg-white border-gray-200 text-gray-300'
        }`}
        aria-label={pass}
      >
        <Check size={18} />
      </button>
    </div>
  )
}
