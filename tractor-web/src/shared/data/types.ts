export interface AddressDetail {
  line1?:    string
  line2?:    string
  locality?: string
  city?:     string
  taluk?:    string
  district?: string
  state?:    string
  pinCode?:  string
  country?:  string
}

export function fmtAddress(a?: AddressDetail | null): string {
  if (!a) return '—'
  return [a.line1, a.line2, a.locality, a.city, a.taluk, a.district, a.state, a.pinCode, a.country]
    .filter(Boolean)
    .join(', ') || '—'
}

export const EMPTY_ADDRESS: AddressDetail = {
  line1: '', line2: '', locality: '', city: '', taluk: '', district: '', state: '', pinCode: '', country: 'India',
}

export interface Customer {
  _id: string
  fullName: string
  gender?: 'Male' | 'Female' | 'Other'
  dob?: string
  address?: AddressDetail
  primaryContactName?:   string
  primaryContactNo?:     string
  alternateContactName?: string
  alternateContactNo?:   string
  createdAt: string
  updatedAt: string
}

export type TractorStatus = 'not_dispatched' | 'dispatched' | 'pdi_completed' | 'sold'

export interface TractorAsset {
  _id: string
  tractorModel: string
  chassisNo: string
  engineNo: string
  hmr?: number
  dispatchDate?: string
  invoiceNo?: string
  invoiceDate?: string
  registrationNo?: string
  customerId?: string | Pick<Customer, '_id' | 'fullName' | 'primaryContactName' | 'primaryContactNo'>
  pdiDate?: string
  dateOfSale?: string
  dealerName?: string
  address?: AddressDetail
  status: TractorStatus
  createdAt: string
  updatedAt: string
}

export interface SapTractorAsset {
  _id: string
  srNo?: number
  tractorModel?: string
  chassisNo: string
  engineNo?: string
  hmr?: number
  dispatchDate?: string
  invoiceNo?: string
  invoiceDate?: string
  registrationNo?: string
  customerName?: string
  customerPhone?: string
  pdiDate?: string
  dateOfSale?: string
  dealerName?: string
  importedAt: string
  _status: { registered: boolean; tractorId: string | null }
}

export type PdiStatus = 'assigned' | 'acknowledgment' | 'started' | 'continue' | 'completed'

export interface UserRef {
  userId: string
  name:   string
  role:   string
}

export interface OeDataRow {
  parameter: string
  make?:     string
  serialNo?: string
}

export interface PartUsed {
  componentNumber: string
  description?:    string
}

export interface ChecklistItem {
  section:          string
  sectionLabel:     string
  srNo:             number
  parameter:        string
  statusOptions:    [string, string]
  status?:          string
  observation?:     string
  actionTaken?:     string
  consumptionText?: string
  partsUsed:        PartUsed[]
}

export interface Reassignment {
  fromUser:     UserRef
  toUser:       UserRef
  reassignedBy: UserRef
  reason?:      string
  at:           string
}

export interface StatusHistoryEntry {
  status: PdiStatus
  at:     string
  by:     UserRef
}

export interface PdiEntry {
  _id: string
  srNumber: string
  tractorId: string | Pick<TractorAsset, '_id' | 'tractorModel' | 'chassisNo' | 'engineNo'>
  status: PdiStatus
  assignedTo: UserRef
  createdBy: UserRef
  reassignments: Reassignment[]
  pdiDate?: string
  remark?: string
  hmr?: number
  pdiLocation?: string
  bomCode?: string
  modelDesc?: string
  oeData: OeDataRow[]
  checklist: ChecklistItem[]
  checkedByName?: string
  acknowledgedAt?: string
  startedAt?: string
  completedAt?: string
  statusHistory: StatusHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export interface DashboardCounts {
  active: number
  completed: number
  total: number
}

export interface DashboardSummary {
  myActive: number
  teamActive: number
  myCompleted: number
}

export interface TeamAvatar {
  _id: string
  name: string
  role: string
  dealerName?: string
  profilePic?: string
  activeCount: number
}

export interface MobileDashboardData {
  counts: DashboardCounts
  activeTasks: PdiEntry[]
  recentCompleted: PdiEntry[]
  team: TeamAvatar[]
  summary?: DashboardSummary
}
