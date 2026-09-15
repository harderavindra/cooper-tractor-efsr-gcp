import { ChangeLog, type ChangeCategory, type ChangeEntityType, type ChangeEntry } from '../models/ChangeLog.js'

export type FieldMap = Record<string, string>

// ── Field maps ────────────────────────────────────────────────────────────────

export const ASSET_CLIENT_FIELDS: FieldMap = {
  clientName:  'Client Name',
  clientCode:  'Client Code',
  clientEmail: 'Client Email',
}

export const ASSET_CONTACT_FIELDS: FieldMap = {
  primaryContactName:     'Primary Contact',
  primaryContactNumber:   'Primary Phone',
  alternateContactName:   'Alternate Contact',
  alternateContactNumber: 'Alternate Phone',
  'address.line1':    'Address Line 1',
  'address.city':     'City',
  'address.district': 'District',
  'address.state':    'State',
  'address.pinCode':  'PIN Code',
}

export const ASSET_INFO_FIELDS: FieldMap = {
  gensetNumber:              'Genset Number',
  gensetModel:               'Genset Model',
  engineModel:               'Engine Model',
  engineNumber:              'Engine Number',
  engineType:                'Engine Type',
  engineFamily:              'Engine Family',
  fuelType:                  'Fuel Type',
  applicationMaterial:       'Application / Material',
  kva:                       'KVA',
  kw:                        'KW',
  phase:                     'Phase',
  panelType:                 'Panel Type',
  controlPanelSerialNumber:  'Control Panel S/N',
  controllerType:            'Controller Type',
  controllerSerialNumber:    'Controller S/N',
  alternatorMake:            'Alternator Make',
  alternatorModel:           'Alternator Model',
  alternatorSerialNumber:    'Alternator S/N',
  atsSerialNumber:           'ATS S/N',
  batteryType:               'Battery Type',
  battery1SerialNumber:      'Battery 1 S/N',
  battery2SerialNumber:      'Battery 2 S/N',
  cpcb:                      'CPCB',
  dispatchDate:              'Dispatch Date',
}

export const USER_PROFILE_FIELDS: FieldMap = {
  name:         'Name',
  email:        'Email',
  mobile:       'Mobile',
  designation:  'Designation',
  employeeId:   'Employee ID',
  vendorCode:   'Vendor Code',
  dealerType:   'Dealer Type',
  dealerName:   'Dealer Name',
  'address.line1':    'Address Line 1',
  'address.city':     'City',
  'address.district': 'District',
  'address.state':    'State',
  'address.pinCode':  'PIN Code',
}

export const USER_ROLE_FIELDS: FieldMap = {
  role: 'Role',
}

export const USER_STATUS_FIELDS: FieldMap = {
  status: 'Status',
}

export const USER_HIERARCHY_FIELDS: FieldMap = {
  regionId:              'Region',
  areaIds:               'Areas',
  areaManagerIds:        'Area Managers',
  serviceEngineerIds:    'Service Engineers',
  serviceTechnicianIds:  'Service Technicians',
  dealerId:              'Dealer',
}

export const REGION_FIELDS: FieldMap = {
  name:   'Name',
  states: 'States',
}

export const AREA_FIELDS: FieldMap = {
  name:     'Name',
  regionId: 'Region',
}

export const LABOR_CHARGE_FIELDS: FieldMap = {
  defectCode:   'Defect Code',
  defect:       'Defect',
  aggregate:    'Aggregate',
  subAggregate: 'Sub Aggregate',
}

export const PART_FIELDS: FieldMap = {
  componentNumber: 'Component Number',
  description:     'Description',
  category:        'Category',
  maxQty:          'Max Qty',
}

export const CUSTOMER_FIELDS: FieldMap = {
  fullName:              'Full Name',
  gender:                'Gender',
  dob:                   'Date of Birth',
  primaryContactName:    'Primary Contact Name',
  primaryContactNo:      'Primary Contact No',
  alternateContactName:  'Alternate Contact Name',
  alternateContactNo:    'Alternate Contact No',
  'address.line1':    'Address Line 1',
  'address.line2':    'Address Line 2',
  'address.city':     'City/Village',
  'address.taluk':    'Taluka',
  'address.district': 'District',
  'address.state':    'State',
  'address.pinCode':  'PIN Code',
}

export const TRACTOR_FIELDS: FieldMap = {
  tractorModel:   'Model',
  chassisNo:      'Chassis No',
  engineNo:       'Engine No',
  hmr:            'HMR',
  dispatchDate:   'Dispatch Date',
  invoiceNo:      'Invoice No',
  invoiceDate:    'Invoice Date',
  registrationNo: 'Registration No',
  customerId:     'Customer',
  pdiDate:        'PDI Date',
  dateOfSale:     'Date of Sale',
  dealerName:     'Dealer',
}

// ── Diff utility ──────────────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key] ?? null
    }
    return null
  }, obj)
}

function normalise(val: unknown): unknown {
  if (val === undefined) return null
  if (Array.isArray(val)) return val.map(v => (v?.toString ? v.toString() : v)).sort().join(',')
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    const v = val as Record<string, unknown>
    if (v._id) return v._id.toString()
  }
  return val
}

export function diffFields(
  before: Record<string, unknown>,
  after:  Record<string, unknown>,
  fieldMap: FieldMap
): ChangeEntry[] {
  const entries: ChangeEntry[] = []
  for (const [field, label] of Object.entries(fieldMap)) {
    const fromRaw = getNestedValue(before, field)
    const toRaw   = getNestedValue(after,  field)
    const from    = normalise(fromRaw)
    const to      = normalise(toRaw)
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      entries.push({ field, label, from: fromRaw ?? null, to: toRaw ?? null })
    }
  }
  return entries
}

// ── Fire-and-forget logger ────────────────────────────────────────────────────

export interface LogChangeOpts {
  entityType:  ChangeEntityType
  entityId:    string
  entityLabel: string
  category:    ChangeCategory
  action:      'created' | 'updated' | 'deleted'
  changes:     ChangeEntry[]
  by:          { userId: string; name: string; role: string } | null
}

export function logChange(opts: LogChangeOpts): void {
  if (opts.action === 'updated' && opts.changes.length === 0) return
  ChangeLog.create(opts).catch(err =>
    console.error('[ChangeLog] write failed:', (err as Error).message)
  )
}
