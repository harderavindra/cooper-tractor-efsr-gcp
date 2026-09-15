import { Schema, model, type Document, type Types } from 'mongoose'

export const PdiStatus = ['assigned', 'acknowledgment', 'started', 'continue', 'completed'] as const
export type PdiStatusValue = typeof PdiStatus[number]

export interface UserRef {
  userId: Types.ObjectId
  name:   string
  role:   string
}

export interface IOeDataRow {
  parameter: string
  make?:     string
  serialNo?: string
}

export interface IPartUsed {
  componentNumber: string
  description?:    string
}

export interface IChecklistItem {
  section:         string
  sectionLabel:    string
  srNo:            number
  parameter:       string
  statusOptions:   [string, string]
  status?:         string
  observation?:    string
  actionTaken?:    string
  consumptionText?: string
  partsUsed:       IPartUsed[]
}

export interface IReassignment {
  fromUser:     UserRef
  toUser:       UserRef
  reassignedBy: UserRef
  reason?:      string
  at:           Date
}

export interface IStatusHistoryEntry {
  status: PdiStatusValue
  at:     Date
  by:     UserRef
}

export interface IPdiEntry extends Document {
  srNumber:       string
  tractorId:      Types.ObjectId
  status:         PdiStatusValue
  assignedTo:     UserRef
  createdBy:      UserRef
  reassignments:  IReassignment[]
  pdiDate?:       Date          // auto-filled with the completion date when the PDI is marked Completed
  remark?:        string
  hmr?:           number
  pdiLocation?:   string
  bomCode?:       string
  modelDesc?:     string
  oeData:         IOeDataRow[]
  checklist:      IChecklistItem[]
  checkedByName?: string
  acknowledgedAt?: Date
  startedAt?:     Date
  completedAt?:   Date
  statusHistory:  IStatusHistoryEntry[]
}

const UserRefSchema = new Schema<UserRef>(
  { userId: { type: Schema.Types.ObjectId, required: true }, name: { type: String, required: true }, role: { type: String, required: true } },
  { _id: false }
)

const OeDataRowSchema = new Schema<IOeDataRow>(
  { parameter: { type: String, required: true }, make: { type: String, trim: true }, serialNo: { type: String, trim: true } },
  { _id: false }
)

const PartUsedSchema = new Schema<IPartUsed>(
  { componentNumber: { type: String, required: true, trim: true }, description: { type: String, trim: true } },
  { _id: false }
)

const ChecklistItemSchema = new Schema<IChecklistItem>(
  {
    section:         { type: String, required: true },
    sectionLabel:    { type: String, required: true },
    srNo:            { type: Number, required: true },
    parameter:       { type: String, required: true },
    statusOptions:   { type: [String], required: true },
    status:          { type: String, trim: true },
    observation:     { type: String, trim: true },
    actionTaken:     { type: String, trim: true },
    consumptionText: { type: String, trim: true },
    partsUsed:       { type: [PartUsedSchema], default: [] },
  },
  { _id: false }
)

const ReassignmentSchema = new Schema<IReassignment>(
  {
    fromUser:     { type: UserRefSchema, required: true },
    toUser:       { type: UserRefSchema, required: true },
    reassignedBy: { type: UserRefSchema, required: true },
    reason:       { type: String, trim: true },
    at:           { type: Date, required: true, default: () => new Date() },
  },
  { _id: false }
)

const StatusHistoryEntrySchema = new Schema<IStatusHistoryEntry>(
  {
    status: { type: String, enum: PdiStatus, required: true },
    at:     { type: Date, required: true, default: () => new Date() },
    by:     { type: UserRefSchema, required: true },
  },
  { _id: false }
)

const PdiEntrySchema = new Schema<IPdiEntry>(
  {
    srNumber:      { type: String, required: true, unique: true },
    tractorId:     { type: Schema.Types.ObjectId, ref: 'TractorAsset', required: true },
    status:        { type: String, enum: PdiStatus, required: true, default: 'assigned' },
    assignedTo:    { type: UserRefSchema, required: true },
    createdBy:     { type: UserRefSchema, required: true },
    reassignments: { type: [ReassignmentSchema], default: [] },
    pdiDate:       { type: Date },
    remark:        { type: String, trim: true },
    hmr:           { type: Number, min: 0 },
    pdiLocation:   { type: String, trim: true },
    bomCode:       { type: String, trim: true },
    modelDesc:     { type: String, trim: true },
    oeData:        { type: [OeDataRowSchema], default: [] },
    checklist:     { type: [ChecklistItemSchema], default: [] },
    checkedByName: { type: String, trim: true },
    acknowledgedAt: { type: Date },
    startedAt:      { type: Date },
    completedAt:    { type: Date },
    statusHistory:  { type: [StatusHistoryEntrySchema], default: [] },
  },
  { timestamps: true }
)

PdiEntrySchema.index({ tractorId: 1, createdAt: -1 })
PdiEntrySchema.index({ 'assignedTo.userId': 1, status: 1 })

export const PdiEntry = model<IPdiEntry>('PdiEntry', PdiEntrySchema)
