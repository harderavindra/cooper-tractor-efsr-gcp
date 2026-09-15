 export const VALIDATION_SECTIONS = [
  {
    letter: 'A', title: 'Air Intake System',
    items: [
      { id: 'A1', label: 'Air Cleaner Condition',  options: ['Ok', 'Replaced'] as string[], input: false, commentOn: 'Replaced' },
      { id: 'A2', label: 'Environment Condition',  options: ['Dusty', 'Clean'] as string[], input: false },
      { id: 'A3', label: 'Hoses Condition',        options: ['Ok', 'Replaced'] as string[], input: false, commentOn: 'Replaced' },
    ],
  },
  {
    letter: 'B', title: 'Exhaust System',
    items: [
      { id: 'B1', label: 'Exhaust Leakage',             options: ['Ok', 'Arrested'] as string[], input: false, commentOn: 'Arrested' },
      { id: 'B2', label: 'Visible Exhaust Smoke Level', options: ['OK', 'Not OK'] as string[], input: false, commentOn: 'Not OK' },
      { id: 'B3', label: 'Exhaust Bellow Free Fitment', options: ['OK', 'Not OK'] as string[], input: false, commentOn: 'Not OK' },
    ],
  },
  {
    letter: 'C', title: 'Lub Oil System',
    items: [
      { id: 'C1', label: 'Lub Oil Level',               options: ['Ok', 'Replaced'] as string[], input: false, commentOn: 'Replaced' },
      { id: 'C2', label: 'Brand and Grade of Oil Used',  options: ['15W40 CH4', '15W40 CI4', '15W40 CI4 Plus'] as string[], input: false },
      { id: 'C3', label: 'Oil Leakage',                  options: ['Ok', 'Corrected'] as string[], input: false, commentOn: 'Corrected' },
      { id: 'C4', label: 'Lub Oil Filter',               options: ['Ok', 'Replaced'] as string[], input: false, commentOn: 'Replaced' },
    ],
  },
  {
    letter: 'D', title: 'Cooling System',
    items: [
      { id: 'D1', label: 'Coolant Level and Condition',        options: ['Ok', 'Replaced'] as string[], input: false, commentOn: 'Replaced' },
      { id: 'D2', label: 'Coolant Leakage',                    options: ['Ok', 'Arrested'] as string[], input: false, commentOn: 'Arrested' },
      { id: 'D3', label: 'Belt Condition',                     options: ['Ok', 'Replaced'] as string[], input: false, commentOn: 'Replaced' },
      { id: 'D4', label: 'Radiator Condition and Cleanliness', options: ['OK', 'Not OK'] as string[], input: false, commentOn: 'Not OK' },
      { id: 'D5', label: 'Condition of all Hoses and Clamps',  options: ['Ok', 'Replaced'] as string[], input: false, commentOn: 'Replaced' },
    ],
  },
  {
    letter: 'E', title: 'Fuel System',
    items: [
      { id: 'E1', label: 'Fuel Tank Cleanliness',                options: ['OK', 'Not OK'] as string[], input: false, commentOn: 'Not OK' },
      { id: 'E2', label: 'Condition of Fuel Hoses and Leakages', options: ['Ok', 'Replaced'] as string[], input: false, commentOn: 'Replaced' },
      { id: 'E3', label: 'Fuel Filter',                          options: ['Ok', 'Replaced'] as string[], input: false, commentOn: 'Replaced' },
    ],
  },
  {
    letter: 'F', title: 'Electrical Wiring',
    items: [
      { id: 'F1', label: 'Battery',                                             options: ['Ok', 'Replaced'] as string[], input: false, commentOn: 'Replaced' },
      { id: 'F2', label: 'Electrolyte Level and Terminal Condition of Battery', options: ['OK', 'Not OK'] as string[], input: false, commentOn: 'Not OK' },
      { id: 'F3', label: 'Battery Voltage in DC',                               options: [] as string[], input: true },
      { id: 'F4', label: 'Voltage Drop at Battery During Cranking Within 9V',   options: ['OK', 'Not OK'] as string[], input: false, commentOn: 'Not OK' },
      { id: 'F5', label: 'Functioning of Charging Alternator',                  options: ['Ok', 'Replaced'] as string[], input: false, commentOn: 'Replaced', note: 'Remove the fan belt & check bearing condition' },
      { id: 'F6', label: 'Tightness of All S/W & Sensors',                     options: ['OK', 'Not OK'] as string[], input: false, commentOn: 'Not OK' },
      { id: 'F7', label: 'Functions of ESU (HWT, LLOP, CLS LFL)',              options: ['Ok', 'Replaced'] as string[], input: false, commentOn: 'Replaced' },
    ],
  },
  {
    letter: 'G', title: 'General',
    items: [
      { id: 'G1', label: 'Abnormal Sound from Engine',                 options: ['OK', 'Not OK'] as string[], input: false, commentOn: 'Not OK' },
      { id: 'G2', label: 'Overall Condition of Engine and Alternator', options: ['OK', 'Not OK'] as string[], input: false, commentOn: 'Not OK' },
    ],
  },
]

export type ValidationCheckEntry = { value: string; label?: string; comment?: string }
export type ValidationChecks = Record<string, ValidationCheckEntry>

export const LABEL_BY_ID: Record<string, string> = Object.fromEntries(
  VALIDATION_SECTIONS.flatMap(s => s.items.map(i => [i.id, i.label]))
)

export function getLabelForId(id: string): string {
  return LABEL_BY_ID[id] ?? id
}

export function getCheckValue(checks: Record<string, unknown> | undefined, id: string): string {
  const v = checks?.[id]
  if (typeof v === 'string') return v
  if (v && typeof v === 'object') return (v as ValidationCheckEntry).value ?? ''
  return ''
}

export function getCheckComment(checks: Record<string, unknown> | undefined, id: string): string {
  const v = checks?.[id]
  if (typeof v === 'string') return (checks?.[`${id}_comment`] as string) ?? ''
  if (v && typeof v === 'object') return (v as ValidationCheckEntry).comment ?? ''
  return ''
}

export function getCheckLabel(checks: Record<string, unknown> | undefined, id: string): string {
  const v = checks?.[id]
  if (v && typeof v === 'object') return (v as ValidationCheckEntry).label ?? getLabelForId(id)
  return getLabelForId(id)
}
