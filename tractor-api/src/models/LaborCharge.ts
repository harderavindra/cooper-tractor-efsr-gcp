import { Schema, model, type Document } from 'mongoose'

export interface ILaborCharge extends Document {
  defectCode:   string
  defect:       string
  aggregate:    string
  subAggregate: string
}

const LaborChargeSchema = new Schema<ILaborCharge>({
  defectCode:   { type: String, required: true, unique: true, trim: true },
  defect:       { type: String, required: true, trim: true },
  aggregate:    { type: String, required: true, trim: true },
  subAggregate: { type: String, required: true, trim: true },
})

LaborChargeSchema.index({ defectCode: 'text', defect: 'text' })

export const LaborCharge = model<ILaborCharge>('LaborCharge', LaborChargeSchema)
