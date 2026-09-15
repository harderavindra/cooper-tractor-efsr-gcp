import { Schema, model, type Document, type Types } from 'mongoose'

export interface IArea extends Document {
  name:        string
  regionId:    Types.ObjectId
  managerIds?: Types.ObjectId[]
}

const AreaSchema = new Schema<IArea>(
  {
    name:       { type: String, required: true, trim: true },
    regionId:   { type: Schema.Types.ObjectId, ref: 'Region', required: true },
    managerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

AreaSchema.index({ name: 1, regionId: 1 }, { unique: true })

export const Area = model<IArea>('Area', AreaSchema)
