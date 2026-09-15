import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from '../models/User'

async function createAdmin() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')

  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  // Check if admin already exists
  const existing = await User.findOne({ username: 'admin' })
  if (existing) {
    console.log('Admin user already exists')
    await mongoose.disconnect()
    return
  }

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = new User({
    username: 'admin',
    passwordHash,
    name: 'Admin User',
    role: 'admin',
  })

  await admin.save()
  console.log('✓ Admin user created')
  console.log('  Username: admin')
  console.log('  Password: admin123')

  await mongoose.disconnect()
  console.log('Done')
}

createAdmin().catch(err => {
  console.error(err)
  process.exit(1)
})
