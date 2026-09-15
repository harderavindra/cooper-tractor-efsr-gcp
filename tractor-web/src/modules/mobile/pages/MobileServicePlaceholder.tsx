import { Wrench } from 'lucide-react'

export default function MobileServicePlaceholder() {
  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      <p className="text-xl font-bold text-gray-900">Service</p>
      <div className="flex flex-col items-center justify-center gap-3 bg-white rounded-3xl p-10 mt-6">
        <span className="w-14 h-14 rounded-full bg-[#E76124] flex items-center justify-center text-white">
          <Wrench size={24} />
        </span>
        <p className="text-sm font-semibold text-gray-700">Coming soon</p>
        <p className="text-xs text-gray-400 text-center">The Service workflow will appear here.</p>
      </div>
    </div>
  )
}
