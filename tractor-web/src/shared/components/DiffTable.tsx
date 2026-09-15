import type { ChangeEntry } from '../services/changeLogApi'

export function DiffTable({ changes }: { changes: ChangeEntry[] }) {
  if (!changes.length) return null
  return (
    <div className="mt-2 overflow-x-auto rounded border border-gray-100">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 text-gray-400 uppercase tracking-wide">
            <th className="px-3 py-1.5 text-left font-semibold">Field</th>
            <th className="px-3 py-1.5 text-left font-semibold">From</th>
            <th className="px-3 py-1.5 text-left font-semibold">To</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="px-3 py-1.5 font-medium text-gray-600 whitespace-nowrap">{c.label}</td>
              <td className="px-3 py-1.5 text-red-500 line-through">
                {formatValue(c.from)}
              </td>
              <td className="px-3 py-1.5 text-green-600 font-semibold">
                {formatValue(c.to)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'string') return v || '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (v instanceof Date) return v.toLocaleDateString()
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
