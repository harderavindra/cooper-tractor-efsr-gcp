import { Schema, model, type Document, type Types } from 'mongoose'

export interface IRegion extends Document {
  name:       string
  managerId?: Types.ObjectId
  states:     string[]
}

const RegionSchema = new Schema<IRegion>(
  {
    name:      { type: String, required: true, unique: true, trim: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    states:    { type: [String], default: [] },
  },
  { timestamps: true }
)

export const Region = model<IRegion>('Region', RegionSchema)
