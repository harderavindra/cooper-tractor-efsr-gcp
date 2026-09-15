import { Counter } from '../models/Counter'

export async function nextSeq(key: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  )
  return doc!.seq
}

/** DDMMYY + 4-digit zero-padded sequence, e.g. "1204260001" */
export function generateSrNumber(date: Date, seq: number): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = String(date.getFullYear() % 100).padStart(2, '0')
  const s = String(seq).padStart(4, '0')
  return `${d}${m}${y}${s}`
}
