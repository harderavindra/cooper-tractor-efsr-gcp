// Source of truth for SR categories and approval gating rules.
// Exposed via GET /api/service/category-config — no need to duplicate in any client.

export const SR_CATEGORIES = [
  { letter: 'A', title: 'Free Service',     subCategories: ['First Free Service', 'Second Free Service', 'Third Free Service', 'Fourth Free Service'] },
  { letter: 'B', title: 'Warranty Repair',  subCategories: ['Breakdown', 'BIS', 'Goodwill', 'Campaign'] },
  { letter: 'C', title: 'Out Of Warranty',  subCategories: ['PM Service', 'Breakdown', 'Goodwill', 'Accidental Repair'] },
  { letter: 'D', title: 'Cooper AMC',       subCategories: ['AMC Visit', 'PM Service', 'Diesel Filling Rental Genset', 'Breakdown'] },
  { letter: 'E', title: 'Cooper CAMC',      subCategories: ['AMC In Scope', 'AMC Out Of Scope', 'Breakdown', 'Demonstration', 'PM Service'] },
  { letter: 'F', title: 'Campaign',         subCategories: ['Genset', 'Engine', 'Alternator', 'Control System'] },
  { letter: 'G', title: 'Other',            subCategories: ['Load Calculation & Site Inspection', 'Installation', 'Demonstration & Load Trial', 'Shifting', 'Rental Diesel Filling', 'CCPL Inhouse'] },
  { letter: 'H', title: 'Dealer AMC',       subCategories: ['AMC Visit', 'PM Service', 'Diesel Filling Rental Genset', 'Breakdown'] },
  { letter: 'I', title: 'Dealer CAMC',      subCategories: ['AMC In Scope', 'AMC Out Of Scope', 'Breakdown', 'Demonstration', 'PM Service'] },
] as const

export const PRE_APPROVAL_REQUIRED: Record<string, string[]> = {
  A: [],
  B: ['Goodwill', 'Campaign'],
  C: [],
  D: ['Diesel Filling Rental Genset'],
  E: ['AMC Out Of Scope'],
  F: ['Genset', 'Engine', 'Alternator', 'Control System'],
  G: ['Rental Diesel Filling'],
  H: ['Diesel Filling Rental Genset'],
  I: ['AMC Out Of Scope'],
}

export const PART_APPROVAL_REQUIRED: Record<string, string[]> = {
  A: [],
  B: ['Breakdown'],
  C: [],
  D: ['Breakdown'],
  E: ['AMC Out Of Scope', 'Breakdown'],
  F: ['Genset', 'Engine', 'Alternator', 'Control System'],
  G: [],
  H: ['Breakdown'],
  I: ['AMC Out Of Scope', 'Breakdown'],
}

export function requiresPreApproval(category: string, subCategory: string): boolean {
  return PRE_APPROVAL_REQUIRED[category]?.includes(subCategory) ?? false
}

export function requiresPartApproval(category: string, subCategory: string): boolean {
  const required = PART_APPROVAL_REQUIRED[category] ?? []
  return required.some(req => subCategory === req || (!!subCategory && subCategory.startsWith(req + ' / ')))
}

export const FREE_SERVICE_DEFS = [
  { label: 'First Free Service',  startMonth: 0,  endMonth: 6,  graceEndMonth: 7,  no: 1 },
  { label: 'Second Free Service', startMonth: 6,  endMonth: 12, graceEndMonth: 13, no: 2 },
  { label: 'Third Free Service',  startMonth: 12, endMonth: 18, graceEndMonth: 19, no: 3 },
  { label: 'Fourth Free Service', startMonth: 19, endMonth: 24, graceEndMonth: 24, no: 4 },
] as const

export function requiresWorkApproval(category: string, subCategory: string): boolean {
  if (category === 'D' || category === 'E' || category === 'H' || category === 'I') return true
  if (category === 'C') return subCategory === 'Goodwill'
  if (category === 'B') return !!subCategory && subCategory.endsWith('/ Goodwill')
  return false
}
