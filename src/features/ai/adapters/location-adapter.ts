import type { Location } from '@/types/world'
import type { FieldAdapter } from '../types'

/** Fields the world expansion tool may propose changes to. */
export const LOCATION_FIELD_KEYS = ['kind', 'summary', 'description', 'atmosphere'] as const

export type LocationFieldKey = (typeof LOCATION_FIELD_KEYS)[number]

export const LOCATION_FIELD_LABELS: Record<LocationFieldKey, string> = {
  kind: 'Kind of place',
  summary: 'One-line summary',
  description: 'Description',
  atmosphere: 'Atmosphere',
}

export function readLocationField(location: Location, key: string): string {
  const value = location[key as keyof Location]
  return typeof value === 'string' ? value : ''
}

export function writeLocationField(_location: Location, key: string, value: string): Partial<Location> {
  return { [key]: value } as Partial<Location>
}

export const locationAdapter: FieldAdapter<Location> = {
  read: readLocationField,
  write: writeLocationField,
}
