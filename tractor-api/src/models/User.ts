import { Schema, model, type Document, type Types } from 'mongoose'

export const UserRole = ['admin', 'rsm', 'area_manager', 'service_engineer', 'service_technician', 'dealer', 'mechanic'] as const
export type UserRoleValue = typeof UserRole[number]

export interface IUser extends Document {
  username:          string
  passwordHash:      string
  name:              string
  role:              UserRoleValue
  dealerName?:       string
  address?: {
    line1?:    string
    city?:     string
    district?: string
    state?:    string
    pinCode?:  string
  }
  employeeId?:       string
  email?:            string
  mobile?:           string
  regionId?:             Types.ObjectId   // rsm: region they manage
  areaIds?:              Types.ObjectId[] // area_manager: areas they manage
  areaManagerIds?:       Types.ObjectId[] // service_engineer: Area Manager(s) they report to
  serviceEngineerIds?:   Types.ObjectId[] // service_technician: Service Engineer(s) they report to
  serviceTechnicianIds?: Types.ObjectId[] // dealer: Service Technician(s) they report to
  dealerId?:             Types.ObjectId   // mechanic: their dealer
  pincodes?:         string[]         // dealer: allocated service pincodes
  designation?:      string           // "RSM" | "Service Engineer" | "Sr. Service Engineer" | "Executive Service"
  vendorCode?:       string           // dealer: numeric vendor code from master data
  dealerType?:       string           // dealer: "Service" | "Sales & Service" | "OEM"
  status?:           'active' | 'inactive' | 'archived'
  profilePic?:       string
  lastLogin?:        Date
  passwordHistory?:  { hash: string; changedAt: Date }[]
  passwordChangedAt?: Date
  loginAttempts?:    number
  lockoutUntil?:     Date | null
  refreshTokenHash?:   string
  refreshTokenExpiry?: Date
  fcmTokens?: { token: string; platform: string; deviceId: string; registeredAt: Date }[]
  regionHistory?: { regionId: Types.ObjectId; regionName: string; assignedAt: Date; unassignedAt?: Date; assignedBy?: { userId: Types.ObjectId; userName: string } }[]
  areaHistory?:   { areaId:   Types.ObjectId; areaName:   string; assignedAt: Date; unassignedAt?: Date; assignedBy?: { userId: Types.ObjectId; userName: string } }[]
}

const passwordHistorySchema = new Schema(
  {
    hash:      { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const UserSchema = new Schema<IUser>(
  {
    username:     { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name:         { type: String, required: true, trim: true },
    role:         { type: String, enum: UserRole, required: true },
    dealerName:   { type: String, trim: true },
    address: {
      line1:    { type: String, trim: true },
      city:     { type: String, trim: true },
      district: { type: String, trim: true },
      state:    { type: String, trim: true },
      pinCode:  { type: String, trim: true },
    },
    employeeId: { type: String, trim: true },
    email:    { type: String, trim: true, lowercase: true },
    mobile:   { type: String, trim: true },
    regionId: { type: Schema.Types.ObjectId, ref: 'Region' },
    areaIds:              [{ type: Schema.Types.ObjectId, ref: 'Area' }],
    areaManagerIds:       [{ type: Schema.Types.ObjectId, ref: 'User' }],
    serviceEngineerIds:   [{ type: Schema.Types.ObjectId, ref: 'User' }],
    serviceTechnicianIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    dealerId:             { type: Schema.Types.ObjectId, ref: 'User' },
    pincodes:    { type: [String], default: [] },
    designation: { type: String, trim: true },
    vendorCode:  { type: String, trim: true },
    dealerType:  { type: String, trim: true },
    status:     { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
    profilePic: { type: String, trim: true },

    lastLogin:         { type: Date },
    passwordHistory:   { type: [passwordHistorySchema], default: [], select: false },
    passwordChangedAt: { type: Date, default: Date.now },
    loginAttempts:     { type: Number, default: 0 },
    lockoutUntil:      { type: Date, default: null },
    refreshTokenHash:   { type: String, select: false },
    refreshTokenExpiry: { type: Date,   select: false },
    fcmTokens: {
      type: [{
        token:        { type: String, required: true },
        platform:     { type: String, default: 'android' },
        deviceId:     { type: String, required: true },
        registeredAt: { type: Date,   default: Date.now },
      }],
      default: [],
      select: false,
    },
    regionHistory: [{
      regionId:     { type: Schema.Types.ObjectId, ref: 'Region' },
      regionName:   { type: String },
      assignedAt:   { type: Date },
      unassignedAt: { type: Date },
      assignedBy:   { userId: { type: Schema.Types.ObjectId }, userName: { type: String }, _id: false },
      _id:          false,
    }],
    areaHistory: [{
      areaId:       { type: Schema.Types.ObjectId, ref: 'Area' },
      areaName:     { type: String },
      assignedAt:   { type: Date },
      unassignedAt: { type: Date },
      assignedBy:   { userId: { type: Schema.Types.ObjectId }, userName: { type: String }, _id: false },
      _id:          false,
    }],
  },
  { timestamps: true }
)

export const User = model<IUser>('User', UserSchema)
