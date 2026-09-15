export function fmtDateTime(d: string | Date | undefined | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function fmtDate(d: string | Date | undefined | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function timeAgo(d: string | Date | undefined | null): string {
  if (!d) return '—'
  const date = new Date(d)
  const now   = new Date()
  const ms    = now.getTime() - date.getTime()
  const secs  = Math.floor(ms / 1000)
  const mins  = Math.floor(secs / 60)
  const hrs   = Math.floor(mins / 60)
  const days  = Math.floor(hrs / 24)

  if (secs < 60)  return 'Just now'
  if (mins < 60)  return `${mins} min ago`
  if (hrs  < 24)  return `${hrs} hour${hrs === 1 ? '' : 's'} ago`

  if (days < 7) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (
      date.getDate()     === yesterday.getDate() &&
      date.getMonth()    === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return `Yesterday, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    }
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export type AgeResult = { label: string; pill: string; text: string }

export function relativeAge(date: string | Date | undefined | null): AgeResult {
  if (!date) return { label: '—', pill: 'bg-gray-100 text-gray-400', text: 'text-gray-400' }
  const ms      = Date.now() - new Date(date).getTime()
  const isPast  = ms >= 0
  const absMins = Math.floor(Math.abs(ms) / 60_000)
  const absHrs  = Math.floor(absMins / 60)
  const absDays = Math.floor(absHrs / 24)

  const compact = absDays > 0
    ? `${absDays}d ${absHrs % 24 > 0 ? `${absHrs % 24}h` : ''}`.trim()
    : absHrs > 0
      ? `${absHrs}h ${absMins % 60 > 0 ? `${absMins % 60}m` : ''}`.trim()
      : `${absMins || 1}m`

  if (!isPast) {
    const label = `${compact} left`
    if (absHrs < 24) return { label, pill: 'bg-yellow-100 text-yellow-700', text: 'text-yellow-600' }
    return               { label, pill: 'bg-green-100 text-green-700',   text: 'text-green-600' }
  }

  const label = compact
  if (absHrs < 4)  return { label, pill: 'bg-green-100 text-green-700',  text: 'text-green-600' }
  if (absHrs < 24) return { label, pill: 'bg-[#fde9df] text-[#E76124]', text: 'text-[#E76124]' }
  return               { label, pill: 'bg-red-100 text-red-600',       text: 'text-red-600' }
}
