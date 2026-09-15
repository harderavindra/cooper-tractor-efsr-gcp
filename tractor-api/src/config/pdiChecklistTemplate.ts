export interface OeDataTemplateRow {
  parameter: string
}

export const PDI_OE_DATA_TEMPLATE: OeDataTemplateRow[] = [
  { parameter: 'Alternator' },
  { parameter: 'Battery' },
  { parameter: 'Fuel Injection Pump' },
  { parameter: 'Hydraulic Pump' },
  { parameter: 'Power Steering Pump' },
  { parameter: 'Starter Motor' },
  { parameter: 'Tyre Front Left' },
  { parameter: 'Tyre Front Right' },
  { parameter: 'Tyre Rear Left' },
  { parameter: 'Tyre Rear Right' },
]

export interface ChecklistTemplateItem {
  section: string
  sectionLabel: string
  srNo: number
  parameter: string
  statusOptions: [string, string]
}

const OK_NOT_OK: [string, string] = ['OK', 'NOT OK']
const YES_NO: [string, string] = ['Yes', 'No']

interface SectionDef {
  section: string
  sectionLabel: string
  statusOptions: [string, string]
  items: string[]
}

const SECTIONS: SectionDef[] = [
  {
    section: 'A', sectionLabel: 'Consumables - Level', statusOptions: OK_NOT_OK,
    items: ['Oil level 4WD Axle', 'Engine Oil Level', 'Coolant Level', 'Transmission Oil Level'],
  },
  {
    section: 'B', sectionLabel: 'Tractor Aesthetics', statusOptions: OK_NOT_OK,
    items: [
      'All Cooper Stickers (Decals) On tractor',
      'Sheet Metal - Alignment',
      'Sheet Metal - Dent/Scratch',
      'No scratches & Dent on Bonnet, Dash Board & Fender',
      'Silencer Paint Damage',
      'Bonnet Lock Function',
      'Bonnet Locating Pin Loose',
      'Fuel Tank Cap (Locking of cap to be checked After Removing Keys)',
      'Sheet Metal - Others issue',
      'Fender Inclination',
      'Paint issue',
      'Paint touch up check (All chassis)',
      'Rust Marks - Specify Location',
      'Mirror Bolt Rusty',
      'Clear Punching/Matching of Chassis & Engine No',
      'Condition of Tyres front',
      'Condition of Tyres Rear',
      'Wheel Rim Front',
      'Wheel Rim Rear',
    ],
  },
  {
    section: 'C', sectionLabel: 'Engine Agg.', statusOptions: OK_NOT_OK,
    items: ['Tractor starting', 'Engine Idle & Max RPM', 'Engine Sound', 'FIP Seal condition', 'No cracks on Hoses'],
  },
  {
    section: 'D', sectionLabel: 'Clutch Agg.', statusOptions: OK_NOT_OK,
    items: ['Clutch Pedal free Play', 'Pedal efforts'],
  },
  {
    section: 'E', sectionLabel: 'Transmission Agg.', statusOptions: OK_NOT_OK,
    items: ['Transmission Noise', 'Gear Shifting', 'Forward Gear (Hi-Low)', 'PTO operation / Noise'],
  },
  {
    section: 'F', sectionLabel: 'Brakes Agg.', statusOptions: OK_NOT_OK,
    items: ['Latch Brakes (Straight Movement)', 'LH/RH Brakes (Point Turning)', 'Brake Operation - Turning/Straight', 'Brake Pedal free Play'],
  },
  {
    section: 'G', sectionLabel: 'Hydraulics Agg.', statusOptions: OK_NOT_OK,
    items: ['PC/DC Sticker no peel off', 'Hyd. Lifting & lowering Operation, Others'],
  },
  {
    section: 'H', sectionLabel: 'Electricals Agg.', statusOptions: OK_NOT_OK,
    items: ['Battery Voltage', 'Cluster Hazard Switch', 'Fitment & working of Combination Switch', 'Water entry in Cluster', 'Wire Harness Clamping', 'Head Lamp & Tail Lamp', 'All Lights'],
  },
  {
    section: 'I', sectionLabel: 'Others Agg.', statusOptions: OK_NOT_OK,
    items: ['Driver Seat Movement', 'Hyd. Levers Movement', '4WD Operation'],
  },
  {
    section: 'J', sectionLabel: 'Free Play & Adjustments', statusOptions: OK_NOT_OK,
    items: ['Fan Belt Tension', 'St. Movement (Lock to Lock)'],
  },
  {
    section: 'K', sectionLabel: 'Lubrication/Greasing Points', statusOptions: OK_NOT_OK,
    items: ['Check all greasing & Lub. Points'],
  },
  {
    section: 'L', sectionLabel: 'Leakages', statusOptions: OK_NOT_OK,
    items: [
      'No Seepage - gear shifter cover', 'Leakage - Timing Cover', 'Leakages all hoses & pipes',
      'Leakages from Hyd. Arm', 'Leakages from Rear axle seal', 'Leakages from PS Cyl. / HSU Unit',
      'Leakages PTO Seal', 'Leakages - Other Location',
    ],
  },
  {
    section: 'M', sectionLabel: 'Documents Check List', statusOptions: YES_NO,
    items: ['Invoice Received', 'Insurance Received', 'PDI Report Received', 'Form 22/BL Received', 'Operator Manual Received'],
  },
  {
    section: 'N', sectionLabel: 'Others', statusOptions: OK_NOT_OK,
    items: ['Tool Kit', 'Top Link'],
  },
]

export const PDI_CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = SECTIONS.flatMap(s =>
  s.items.map((parameter, i) => ({
    section: s.section,
    sectionLabel: s.sectionLabel,
    srNo: i + 1,
    parameter,
    statusOptions: s.statusOptions,
  }))
)
