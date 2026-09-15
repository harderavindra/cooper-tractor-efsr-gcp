import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from '../models/User'

// ── Users ─────────────────────────────────────────────────────────────────────

const userSeed = [
  { username: 'admin',    password: 'admin123',  name: 'Admin User',           role: 'admin'         },
  { username: 'rsm1',     password: 'rsm123',    name: 'Ravi Sharma',          role: 'rsm'           },
  { username: 'ccpl1',    password: 'ccpl123',   name: 'Arjun Singh',          role: 'area_manager' },
  { username: 'ccpl2',    password: 'ccpl123',   name: 'Priya Mehta',          role: 'area_manager' },
  { username: 'dealer1',  password: 'dealer123', name: 'Maharashtra Gensets',  role: 'dealer',       dealerName: 'Maharashtra Gensets' },
  { username: 'dealer2',  password: 'dealer123', name: 'Pune Power Solutions', role: 'dealer',       dealerName: 'Pune Power Solutions' },
  { username: 'deng1',    password: 'deng123',   name: 'Suresh Patel',         role: 'mechanic',     dealerName: 'Maharashtra Gensets' },
  { username: 'deng2',    password: 'deng123',   name: 'Mohan Das',            role: 'mechanic',     dealerName: 'Pune Power Solutions' },
] as const

// ── Runner ────────────────────────────────────────────────────────────────────

async function seed() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')

  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  // Clear all
  await User.deleteMany({})
  console.log('Cleared users\n')

  // Seed users
  const hashedUsers = await Promise.all(
    userSeed.map(async u => ({
      username:     u.username,
      passwordHash: await bcrypt.hash(u.password, 10),
      name:         u.name,
      role:         u.role,
      dealerName:   'dealerName' in u ? u.dealerName : undefined,
    }))
  )
  const users = await User.insertMany(hashedUsers)
  console.log(`Inserted ${users.length} users:`)
  users.forEach(u => console.log(`  • ${u.username.padEnd(10)} (${u.role}) — ${u.name}`))

  console.log('\nLogin credentials:')
  console.log('  admin   / admin123   → Admin')
  console.log('  rsm1    / rsm123     → RSM (Ravi Sharma)')
  console.log('  ccpl1   / ccpl123    → CCPL Engineer (Arjun Singh)')
  console.log('  ccpl2   / ccpl123    → CCPL Engineer (Priya Mehta)')
  console.log('  dealer1 / dealer123  → Dealer (Maharashtra Gensets)')
  console.log('  dealer2 / dealer123  → Dealer (Pune Power Solutions)')
  console.log('  deng1   / deng123    → Engineer (Suresh Patel @ Maharashtra Gensets)')
  console.log('  deng2   / deng123    → Engineer (Mohan Das @ Pune Power Solutions)')

  await mongoose.disconnect()
  console.log('\nDone')
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
