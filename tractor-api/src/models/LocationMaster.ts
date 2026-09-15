import mongoose, { Schema } from 'mongoose'

const locationMasterSchema = new Schema(
  {
    pincode:     { type: String, required: true, unique: true, trim: true, index: true },
    post_office: { type: String, trim: true },
    taluka:      { type: String, trim: true },
    district:    { type: String, trim: true },
    state:       { type: String, trim: true },
    areaId:      { type: Schema.Types.ObjectId, ref: 'Area', default: null },
  },
  { timestamps: true }
)

export default mongoose.model('LocationMaster', locationMasterSchema)
