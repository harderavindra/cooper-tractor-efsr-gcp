import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'

export function StepNavBar({
  onBack,
  onNext,
  backDisabled = false,
  nextDisabled = false,
  loading = false,
}: {
  onBack: () => void
  onNext: () => void
  backDisabled?: boolean
  nextDisabled?: boolean
  loading?: boolean
}) {
  return (
    <div className="flex items-center justify-between pb-4">
      <button
        onClick={onBack}
        disabled={backDisabled}
        aria-label="Back"
        className="w-12 h-12 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-30"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <button
        onClick={onNext}
        disabled={nextDisabled || loading}
        aria-label={loading ? 'Loading' : 'Next'}
        className="w-12 h-12 rounded-full bg-[#E76124] hover:bg-[#cf5520] flex items-center justify-center text-white active:scale-95 transition-all disabled:opacity-40"
      >
        {loading
          ? <Loader2 className="w-5 h-5 animate-spin" />
          : <ArrowRight className="w-5 h-5" />
        }
      </button>
    </div>
  )
}
