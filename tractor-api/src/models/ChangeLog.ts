import { Schema, model, type Document, type Types } from 'mongoose'

export const ChangeEntityTypes = ['asset', 'user', 'region', 'area', 'labor_charge', 'part', 'customer', 'tractor_asset', 'pdi_entry'] as const
export type ChangeEntityType = typeof ChangeEntityTypes[number]

export const ChangeCategories = [
  'asset_info', 'asset_client', 'asset_contacts',
  'user_profile', 'user_role', 'user_status', 'user_hierarchy',
  'master_region', 'master_area', 'master_labor_charge', 'master_part',
  'customer_info', 'tractor_info', 'pdi_info',
] as const
export type ChangeCategory = typeof ChangeCategories[number]

export const ChangeActions = ['created', 'updated', 'deleted'] as const
export type ChangeAction = typeof ChangeActions[number]

export interface ChangeEntry {
  field: string
  label: string
  from:  unknown
  to:    unknown
}

export interface IChangeLog extends Document {
  entityType:  ChangeEntityType
  entityId:    Types.ObjectId
  entityLabel: string
  category:    ChangeCategory
  action:      ChangeAction
  changes:     ChangeEntry[]
  by:          { userId: string; name: string; role: string } | null
  at:          Date
}

const ChangeEntrySchema = new Schema<ChangeEntry>(
  { field: String, label: String, from: Schema.Types.Mixed, to: Schema.Types.Mixed },
  { _id: false }
)

const ChangeLogSchema = new Schema<IChangeLog>(
  {
    entityType:  { type: String, enum: ChangeEntityTypes, required: true },
    entityId:    { type: Schema.Types.ObjectId, required: true },
    entityLabel: { type: String, required: true },
    category:    { type: String, enum: ChangeCategories, required: true },
    action:      { type: String, enum: ChangeActions, required: true },
    changes:     { type: [ChangeEntrySchema], default: [] },
    by:          {
      type: new Schema(
        { userId: String, name: String, role: String },
        { _id: false }
      ),
      default: null,
    },
    at: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: false }
)

ChangeLogSchema.index({ entityId: 1, at: -1 })
ChangeLogSchema.index({ entityType: 1, at: -1 })
ChangeLogSchema.index({ category: 1, at: -1 })
ChangeLogSchema.index({ at: -1 })
ChangeLogSchema.index({ 'by.userId': 1, at: -1 })

export const ChangeLog = model<IChangeLog>('ChangeLog', ChangeLogSchema)
