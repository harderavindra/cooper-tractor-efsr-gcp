import { api } from './api'

export interface LocationArea {
  _id:      string
  name:     string
  regionId: { _id: string; name: string } | string
}

export interface LocationRecord {
  _id:         string
  pincode:     string
  post_office: string
  taluka:      string
  district:    string
  state:       string
  areaId?:     LocationArea | null
}

export async function lookupPincode(pin: string): Promise<LocationRecord | null> {
  if (pin.length !== 6) return null
  try {
    return await api.get<LocationRecord | null>(`/api/location-master?pincode=${pin}`)
  } catch {
    return null
  }
}
