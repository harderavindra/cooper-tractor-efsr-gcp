import { Schema, model, type Document } from 'mongoose'

export interface IPart extends Document {
  componentNumber: string
  description:     string
  category?:       string
  maxQty?:         number
}

const PartSchema = new Schema<IPart>({
  componentNumber: { type: String, required: true, unique: true, trim: true },
  description:     { type: String, required: true, trim: true },
  category:         { type: String, trim: true },
  maxQty:           { type: Number, min: 0 },
}) 

PartSchema.index({ componentNumber: 'text', description: 'text' })

export const Part = model<IPart>('Part', PartSchema)
