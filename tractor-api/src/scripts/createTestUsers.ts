import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from '../models/User'

const TEST_USERS = [
  {
    username: 'pditest_admin', name: 'Vikram Rao', role: 'admin',
    email: 'vikram.rao@coopercorp.in', mobile: '9876543210', employeeId: 'CC-EMP-1001', designation: 'Admin',
    address: { line1: 'M60-1, Additional MIDC Area', city: 'Satara', district: 'Satara', state: 'Maharashtra', pinCode: '415004' },
  },
  {
    username: 'pditest_rsm', name: 'Anil Kumar', role: 'rsm',
    email: 'anil.kumar@coopercorp.in', mobile: '9876543211', employeeId: 'CC-EMP-1002', designation: 'RSM',
    address: { line1: '204, Shivaji Nagar', city: 'Pune', district: 'Pune', state: 'Maharashtra', pinCode: '411001' },
  },
  {
    username: 'pditest_am', name: 'Sanjay Deshmukh', role: 'area_manager',
    email: 'sanjay.deshmukh@coopercorp.in', mobile: '9876543212', employeeId: 'CC-EMP-1003', designation: 'Area Manager',
    address: { line1: '12, Rajarampuri', city: 'Kolhapur', district: 'Kolhapur', state: 'Maharashtra', pinCode: '416003' },
  },
  {
    username: 'pditest_se', name: 'Rahul Joshi', role: 'service_engineer',
    email: 'rahul.joshi@coopercorp.in', mobile: '9876543213', employeeId: 'CC-EMP-1004', designation: 'Service Engineer',
    address: { line1: '45, Vishrambag', city: 'Sangli', district: 'Sangli', state: 'Maharashtra', pinCode: '416416' },
  },
  {
    username: 'pditest_st', name: 'Amit Kulkarni', role: 'service_technician',
    email: 'amit.kulkarni@coopercorp.in', mobile: '9876543214', employeeId: 'CC-EMP-1005', designation: 'Sr. Service Engineer',
    address: { line1: '78, Railway Lines', city: 'Solapur', district: 'Solapur', state: 'Maharashtra', pinCode: '413001' },
  },
  {
    username: 'pditest_dealer', name: 'Mahesh Agro Traders', role: 'dealer', dealerName: 'Mahesh Agro Traders',
    email: 'mahesh.agro@dealer.in', mobile: '9876543215', vendorCode: 'VEN-2201', dealerType: 'Sales & Service',
    address: { line1: 'Plot 9, MIDC Industrial Area', city: 'Karad', district: 'Satara', state: 'Maharashtra', pinCode: '415110' },
  },
  {
    username: 'pditest_mechanic', name: 'Ganesh Shinde', role: 'mechanic', dealerName: 'Mahesh Agro Traders',
    email: 'ganesh.shinde@dealer.in', mobile: '9876543216', designation: 'Mechanic',
    address: { line1: 'Plot 9, MIDC Industrial Area', city: 'Karad', district: 'Satara', state: 'Maharashtra', pinCode: '415110' },
  },
] as const

async function createTestUsers() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')

  await mongoose.connect(uri)
  console.log('Connected to MongoDB\n')

  const passwordHash = await bcrypt.hash('123456', 10)

  for (const u of TEST_USERS) {
    await User.findOneAndUpdate(
      { username: u.username },
      {
        $set: {
          passwordHash,
          name: u.name,
          role: u.role,
          dealerName: 'dealerName' in u ? u.dealerName : undefined,
          email: u.email,
          mobile: u.mobile,
          address: u.address,
          employeeId: 'employeeId' in u ? u.employeeId : undefined,
          designation: 'designation' in u ? u.designation : undefined,
          vendorCode: 'vendorCode' in u ? u.vendorCode : undefined,
          dealerType: 'dealerType' in u ? u.dealerType : undefined,
          status: 'active',
        },
      },
      { upsert: true, new: true }
    )
    console.log(`  • ${u.username.padEnd(16)} (${u.role}) — ${u.email}, ${u.mobile}`)
  }

  console.log('\nAll test users set to password: 123456')
  await mongoose.disconnect()
  console.log('Done')
}

createTestUsers().catch(err => {
  console.error(err)
  process.exit(1)
})
