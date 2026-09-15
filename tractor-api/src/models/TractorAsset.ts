import { Schema, model, type Document, type Types } from 'mongoose'

export interface ITractorAsset extends Document {
  tractorModel:    string
  chassisNo:       string
  engineNo:        string
  hmr?:            number
  dispatchDate?:   Date
  invoiceNo?:      string
  invoiceDate?:    Date
  registrationNo?: string
  customerId?:     Types.ObjectId
  pdiDate?:        Date
  dateOfSale?:     Date
  dealerName?:     string
  address?: {
    line1?:    string
    line2?:    string
    city?:     string
    taluk?:    string
    district?: string
    state?:    string
    pinCode?:  string
  }
}

const TractorAssetSchema = new Schema<ITractorAsset>(
  {
    tractorModel:   { type: String, required: true, trim: true },
    chassisNo:      { type: String, required: true, unique: true, trim: true },
    engineNo:       { type: String, required: true, trim: true },
    hmr:            { type: Number, min: 0 },
    dispatchDate:   { type: Date },
    invoiceNo:      { type: String, trim: true },
    invoiceDate:    { type: Date },
    registrationNo: { type: String, trim: true },
    customerId:     { type: Schema.Types.ObjectId, ref: 'Customer' },
    pdiDate:        { type: Date },
    dateOfSale:     { type: Date },
    dealerName:     { type: String, trim: true },
    address: {
      line1:    { type: String, trim: true },
      line2:    { type: String, trim: true },
      city:     { type: String, trim: true },
      taluk:    { type: String, trim: true },
      district: { type: String, trim: true },
      state:    { type: String, trim: true },
      pinCode:  { type: String, trim: true },
    },
  },
  { timestamps: true }
)

TractorAssetSchema.index({ chassisNo: 'text', engineNo: 'text', tractorModel: 'text', registrationNo: 'text' })

export const TractorAsset = model<ITractorAsset>('TractorAsset', TractorAssetSchema)
