import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
import mongoose from 'mongoose'
import { User }   from '../models/User'
import { Area }   from '../models/Area'
import { Region } from '../models/Region'

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '')
  const [users, areas, regions] = await Promise.all([
    User.find({}).select('username name role email employeeId areaIds regionId').lean(),
    Area.find({}).select('name regionId').lean(),
    Region.find({}).select('name').lean(),
  ])
  console.log(`\nRegions (${regions.length}):`)
  regions.forEach(r => console.log(`  ${r.name}  id=${r._id}`))
  console.log(`\nAreas (${areas.length}):`)
  areas.forEach(a => console.log(`  ${a.name}  regionId=${a.regionId}  id=${a._id}`))
  console.log(`\nUsers (${users.length}):`)
  users.forEach(u => console.log(
    `  [${u.role.padEnd(12)}]  ${u.username.padEnd(40)}  emp=${String(u.employeeId ?? '-').padEnd(8)}  areaIds=${(u.areaIds ?? []).join(',') || '-'}  regionId=${u.regionId ?? '-'}`
  ))
  await mongoose.disconnect()
}
run().catch(console.error)
