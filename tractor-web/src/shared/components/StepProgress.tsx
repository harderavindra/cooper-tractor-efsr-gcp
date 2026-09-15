import { Check } from 'lucide-react'

interface StepDef {
  number: number
  label?: string
}

export function StepProgress({
  steps,
  total,
  currentStep,
  onStepClick,
}: {
  steps?: StepDef[]
  total?: number
  currentStep: number
  onStepClick?: (step: number) => void
}) {
  const list: StepDef[] = steps
    ?? Array.from({ length: total ?? 0 }, (_, i) => ({ number: i + 1 }))

  return (
    <div className="flex rounded-full bg-white border border-gray-200 px-3 py-2 items-center justify-between gap-3 ">
      {list.map((s) => {
        const done    = s.number < currentStep
        const current = s.number === currentStep
        return (
          <button
            key={s.number}
            type="button"
            disabled={!done}
            onClick={() => done && onStepClick?.(s.number)}
            className="disabled:cursor-default shrink-0"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
              done    ? 'bg-green-500 text-white' :
              current ? 'bg-[#E76124] text-white' :
                        'bg-white text-gray-500 border border-gray-200'
            }`}>
              {done ? <Check className="w-3.5 h-3.5" /> : s.number}
            </div>
          </button>
        )
      })}
    </div>
  )
}
