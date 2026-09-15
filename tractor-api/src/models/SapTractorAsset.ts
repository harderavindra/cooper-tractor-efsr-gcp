import { Schema, model, type Document } from 'mongoose'

export interface ISapTractorAsset extends Document {
  srNo?:           number
  tractorModel?:   string
  chassisNo:       string
  engineNo?:       string
  hmr?:            number
  dispatchDate?:   Date
  invoiceNo?:      string
  invoiceDate?:    Date
  registrationNo?: string
  customerName?:   string
  customerPhone?:  string
  pdiDate?:        Date
  dateOfSale?:     Date
  dealerName?:     string
  importedAt:      Date
}

const SapTractorAssetSchema = new Schema<ISapTractorAsset>(
  {
    srNo:           { type: Number },
    tractorModel:   { type: String, trim: true },
    chassisNo:      { type: String, required: true, unique: true, trim: true },
    engineNo:       { type: String, trim: true },
    hmr:            { type: Number, min: 0 },
    dispatchDate:   { type: Date },
    invoiceNo:      { type: String, trim: true },
    invoiceDate:    { type: Date },
    registrationNo: { type: String, trim: true },
    customerName:   { type: String, trim: true },
    customerPhone:  { type: String, trim: true },
    pdiDate:        { type: Date },
    dateOfSale:     { type: Date },
    dealerName:     { type: String, trim: true },
    importedAt:     { type: Date, default: () => new Date() },
  },
  { timestamps: true }
)

export const SapTractorAsset = model<ISapTractorAsset>('SapTractorAsset', SapTractorAssetSchema)
