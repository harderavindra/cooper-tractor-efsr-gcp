import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import { User } from '../models/User'

const TEMP_PASSWORD  = 'Cooper@2026'
const FORCE_RESET_AT = new Date(0)

function parseCSV(raw: string): string[][] {
  const rows: string[][] = []
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue
    const cols: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ }
      else if (c === ',' && !inQ) { cols.push(cur); cur = '' }
      else { cur += c }
    }
    cols.push(cur)
    rows.push(cols)
  }
  return rows
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!)
  const hash    = await bcrypt.hash(TEMP_PASSWORD, 10)
  const csvPath = path.join(__dirname, 'data/dealer-engineers.csv')
  const rows    = parseCSV(fs.readFileSync(csvPath, 'utf8'))

  let currentDealer = ''
  let upserted = 0, skipped = 0
  const unmatched: string[] = []

  for (const row of rows.slice(1)) {
    if (row[3]?.trim()) currentDealer = row[3].trim()

    const engineerName = row[6]?.trim()
    if (!engineerName || engineerName === 'INACTIVE DEALER') { skipped++; continue }

    const email    = row[7]?.trim().toLowerCase() || undefined
    const mobile   = row[8]?.replace(/\D/g, '').trim() || undefined
    const username = email || mobile
    if (!username) { skipped++; continue }

    const escaped = currentDealer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const dealer = await User.findOne({
      role: 'dealer',
      dealerName: { $regex: new RegExp(`^${escaped}$`, 'i') },
    }).lean()

    if (!dealer) {
      if (!unmatched.includes(currentDealer)) unmatched.push(currentDealer)
      skipped++; continue
    }

    await User.findOneAndUpdate(
      { username },
      {
        $setOnInsert: { username, passwordHash: hash, passwordChangedAt: FORCE_RESET_AT },
        $set: {
          name: engineerName,
          role: 'mechanic',
          dealerId: dealer._id,
          dealerName: dealer.dealerName,
          ...(email  && { email }),
          ...(mobile && { mobile }),
          status: 'active',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
    upserted++
  }

  console.log(`Done: ${upserted} upserted, ${skipped} skipped`)
  if (unmatched.length) console.warn('Unmatched dealers (not in DB):', unmatched)
  await mongoose.disconnect()
}

run().catch(e => { console.error(e); process.exit(1) })
