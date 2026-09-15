export const EngineType = {
  TC3000:  'TC 3000',
  NA3000:  'NA 3000',
  TC1500:  'TC 1500',
  NA1500:  'NA 1500',
  Other:   'Other',
} as const
export type EngineType = typeof EngineType[keyof typeof EngineType]

export const EngineFamily = {
  Cyl:           'Cyl',
  VTwin:         'V Twin',
  Bosch3Cycl:    '3Cycl Bosch',
  Stanadyne3Cyl: '3 Cyl Stanadyne',
  FourCyl45:     '4 Cyl 4.5 Ltr',
  SixCyl68:      '6 Cyl 6.8 Ltr',
  SixCyl78:      '6 Cyl 7.8 Ltr',
  EscortKubota:  'Escort Kubota',
  VECV:          'VECV',
} as const
export type EngineFamily = typeof EngineFamily[keyof typeof EngineFamily]

export const FuelType = {
  Diesel:  'Diesel',
  CNG:     'CNG',
  LNG:     'LNG',
  LPG:     'LPG',
  PNG:     'PNG',
  Biogas:  'Biogas',
} as const
export type FuelType = typeof FuelType[keyof typeof FuelType]

export const ApplicationMaterial = {
  Genset:         'Genset',
  GDrive:         'G-Drive',
  FirePump:       'Fire Pump',
  Marine:         'Marine',
  APU:            'APU',
  PumpSet:        'Pump Set',
  Tractor:        'Tractor',
  Compressor:     'Compressor',
  LightingTower:  'Lighting Tower',
} as const
export type ApplicationMaterial = typeof ApplicationMaterial[keyof typeof ApplicationMaterial]

export const KVAType = {
  KVA25: '25', KVA40: '40', KVA62: '62', KVA82: '82',
  KVA125: '125', KVA160: '160', KVA200: '200',
  KVA250: '250', KVA320: '320', KVA500: '500',
} as const
export type KVAType = typeof KVAType[keyof typeof KVAType]

export const KWType = {
  KW20: '20', KW32: '32', KW50: '50', KW65: '65',
  KW100: '100', KW128: '128', KW160: '160',
  KW200: '200', KW256: '256', KW400: '400',
} as const
export type KWType = typeof KWType[keyof typeof KWType]

export const PhaseType = {
  Single: 'Single Phase',
  Three:  'Three Phase',
} as const
export type PhaseType = typeof PhaseType[keyof typeof PhaseType]

export const PanelType = {
  STD:  'STD',
  ASAS: 'ASAS',
  AMF:  'AMF',
  SYNC: 'SYNC',
} as const
export type PanelType = typeof PanelType[keyof typeof PanelType]

export const CPCBType = {
  CPCB1:    'CPCB I',
  CPCB2:    'CPCB II',
  CPCB4Plus:'CPCB IV+',
} as const
export type CPCBType = typeof CPCBType[keyof typeof CPCBType]

export const StatusType = {
  OK:    'OK',
  NotOK: 'Not OK',
} as const
export type StatusType = typeof StatusType[keyof typeof StatusType]
