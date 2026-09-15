import { useEffect } from 'react'

export interface FeedbackData {
  customerName: string
  comment:      string
}

interface Props {
  data:     FeedbackData
  onChange: (data: FeedbackData) => void
  contact?: { name?: string; phone?: string }
}

export default function CustomerFeedback({ data, onChange, contact }: Props) {
  useEffect(() => {
    if (contact?.name && !data.customerName) {
      onChange({ ...data, customerName: contact.name })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.name])

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
          Primary Contact
        </label>
        {contact?.name ? (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#1E1951] truncate">{contact.name}</p>
              <p className="text-xs text-gray-400">{contact.phone ?? '—'}</p>
            </div>
          </div>
        ) : (
          <input
            type="text"
            value={data.customerName}
            onChange={e => onChange({ ...data, customerName: e.target.value })}
            placeholder="Enter customer name…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-[#1E1951] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#E76124] focus:border-[#E76124] transition"
          />
        )}
      </div>

      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
          Feedback
        </label>
        <textarea
          value={data.comment}
          onChange={e => onChange({ ...data, comment: e.target.value })}
          rows={4}
          placeholder="Customer feedback or remarks…"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-[#1E1951] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#E76124] focus:border-[#E76124] transition resize-none"
        />
      </div>
    </div>
  )
}
