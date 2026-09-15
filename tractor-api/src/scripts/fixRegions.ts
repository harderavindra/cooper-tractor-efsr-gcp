/**
 * One-time fix: the seed created uppercase duplicate regions (EAST, NORTH, WEST, SOUTH)
 * instead of finding the existing proper-case ones (East, North, West, South).
 * This script:
 *   1. Deletes the 4 duplicate uppercase region docs
 *   2. Re-links the 4 seeded RSMs to the correct proper-case regions
 *   3. Sets managerId on the proper-case regions to the RSM users
 */
import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
import mongoose from 'mongoose'
import { Region } from '../models/Region'
import { User }   from '../models/User'

const ZONE_MAP: Record<string, string> = {
  'East':  'bikash.bose@coopercorp.in',
  'North': 'amit.sharma@coopercorp.in',
  'West':  'sudharm.chobharkar@coopercorp.in',
  'South': 'suresh.chakali@coopercorp.in',
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '')
  console.log('Connected to MongoDB')

  // Step 1: Delete uppercase duplicates
  const deleted = await Region.deleteMany({ name: { $in: ['EAST', 'NORTH', 'WEST', 'SOUTH'] } })
  console.log(`Deleted ${deleted.deletedCount} duplicate uppercase regions`)

  // Step 2: Re-link RSMs to proper-case regions
  for (const [regionName, email] of Object.entries(ZONE_MAP)) {
    const region = await Region.findOne({ name: regionName }).lean()
    if (!region) { console.warn(`  WARN: region "${regionName}" not found`); continue }

    const user = await User.findOneAndUpdate(
      { username: email },
      { $set: { regionId: region._id } },
      { returnDocument: 'after' }
    )
    if (!user) { console.warn(`  WARN: RSM user "${email}" not found`); continue }

    await Region.findByIdAndUpdate(region._id, { managerId: user._id })
    console.log(`  ${regionName} → ${user.name} (${user._id})`)
  }

  console.log('\nDone.')
  await mongoose.disconnect()
}
run().catch(console.error)
