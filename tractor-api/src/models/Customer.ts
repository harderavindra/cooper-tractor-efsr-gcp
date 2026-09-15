import { Schema, model, type Document } from 'mongoose'

export interface ICustomer extends Document {
  fullName: string
  gender?: 'Male' | 'Female' | 'Other'
  dob?: Date
  address?: {
    line1?:    string
    line2?:    string
    city?:     string
    taluk?:    string
    district?: string
    state?:    string
    pinCode?:  string
  }
  primaryContactName?:   string
  primaryContactNo?:     string
  alternateContactName?: string
  alternateContactNo?:   string
}

const CustomerSchema = new Schema<ICustomer>(
  {
    fullName: { type: String, required: true, trim: true },
    gender:   { type: String, enum: ['Male', 'Female', 'Other'] },
    dob:      { type: Date },
    address: {
      line1:    { type: String, trim: true },
      line2:    { type: String, trim: true },
      city:     { type: String, trim: true },
      taluk:    { type: String, trim: true },
      district: { type: String, trim: true },
      state:    { type: String, trim: true },
      pinCode:  { type: String, trim: true },
    },
    primaryContactName:   { type: String, trim: true },
    primaryContactNo:     { type: String, trim: true },
    alternateContactName: { type: String, trim: true },
    alternateContactNo:   { type: String, trim: true },
  },
  { timestamps: true }
)

CustomerSchema.index({ fullName: 'text', primaryContactNo: 'text' })

export const Customer = model<ICustomer>('Customer', CustomerSchema)
