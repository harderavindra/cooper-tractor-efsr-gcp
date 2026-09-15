import 'dotenv/config'
import mongoose from 'mongoose'
import { User } from '../models/User'
import { Region } from '../models/Region'
import { Area } from '../models/Area'

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('Connected to DB')

  // ── RSM: backfill regionHistory ─────────────────────────────────────────────
  const rsms = await User.find({ role: 'rsm', regionId: { $exists: true } }).lean()
  let rsmUpdated = 0

  for (const rsm of rsms) {
    const hasOpen = (rsm.regionHistory ?? []).some(h => !h.unassignedAt)
    if (hasOpen) continue // already has a current entry

    const region = await Region.findById(rsm.regionId).lean()
    if (!region) continue

    await User.updateOne(
      { _id: rsm._id },
      {
        $push: {
          regionHistory: {
            regionId:   rsm.regionId,
            regionName: region.name,
            assignedAt: new Date(),
          },
        },
      }
    )
    rsmUpdated++
    console.log(`  RSM ${rsm.name} → ${region.name}`)
  }
  console.log(`Backfilled ${rsmUpdated} RSM(s)`)

  // ── Area Manager: backfill areaHistory ──────────────────────────────────────
  const ams = await User.find({ role: 'area_manager', areaIds: { $exists: true, $not: { $size: 0 } } }).lean()
  let amUpdated = 0

  for (const am of ams) {
    const hasOpen = (am.areaHistory ?? []).some(h => !h.unassignedAt)
    if (hasOpen) continue

    for (const aid of am.areaIds ?? []) {
      const area = await Area.findById(aid).lean()
      if (!area) continue
      await User.updateOne(
        { _id: am._id },
        {
          $push: {
            areaHistory: {
              areaId:    aid,
              areaName:  area.name,
              assignedAt: new Date(),
            },
          },
        }
      )
      amUpdated++
      console.log(`  AM ${am.name} → ${area.name}`)
    }
  }
  console.log(`Backfilled ${amUpdated} Area Manager(s)`)

  await mongoose.disconnect()
  console.log('Done.')
}

run().catch(err => { console.error(err); process.exit(1) })
