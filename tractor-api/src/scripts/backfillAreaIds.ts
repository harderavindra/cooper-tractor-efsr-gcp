import 'dotenv/config'
import mongoose from 'mongoose'
import { User } from '../models/User'
import { Area } from '../models/Area'

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!)
  console.log('Connected to DB')

  // 1. Backfill User.areaIds from legacy User.areaId (stored in DB but removed from schema)
  const usersResult = await (User.collection as unknown as { updateMany: Function }).updateMany(
    { areaId: { $exists: true }, $or: [{ areaIds: { $exists: false } }, { areaIds: { $size: 0 } }] },
    [{ $set: { areaIds: ['$areaId'] } }]
  )
  console.log(`Backfilled ${usersResult.modifiedCount} user(s) with areaIds`)

  // 2. Backfill Area.managerIds from legacy Area.managerId
  const areasResult = await (Area.collection as unknown as { updateMany: Function }).updateMany(
    { managerId: { $exists: true }, $or: [{ managerIds: { $exists: false } }, { managerIds: { $size: 0 } }] },
    [{ $set: { managerIds: ['$managerId'] } }]
  )
  console.log(`Backfilled ${areasResult.modifiedCount} area(s) with managerIds`)

  await mongoose.disconnect()
  console.log('Done.')
}

run().catch(err => { console.error(err); process.exit(1) })
