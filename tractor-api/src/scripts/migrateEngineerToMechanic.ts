import 'dotenv/config'
import mongoose from 'mongoose'
import { User } from '../models/User'

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('Connected to DB')

  // 'engineer' is the pre-migration role value, no longer part of the current UserRole enum.
  const result = await User.updateMany({ role: 'engineer' as never }, { $set: { role: 'mechanic' } })
  console.log(`Renamed ${result.modifiedCount} user(s) from role 'engineer' to 'mechanic'`)

  await mongoose.disconnect()
  console.log('Done.')
}

run().catch(err => { console.error(err); process.exit(1) })
