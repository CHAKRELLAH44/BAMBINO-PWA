import type { Timestamp } from 'firebase/firestore'

export const GROWTH_TYPES = ['weight', 'height', 'headCircumference', 'custom'] as const
export type GrowthType = (typeof GROWTH_TYPES)[number]

/** Unité fixe des mesures standard ; une mesure personnalisée choisit la sienne */
export const STANDARD_UNITS: Record<Exclude<GrowthType, 'custom'>, string> = {
  weight: 'kg',
  height: 'cm',
  headCircumference: 'cm',
}

/** Document users/{userId}/babies/{babyId}/growthRecords/{id} (§15, §27) */
export interface GrowthRecord {
  id: string
  type: GrowthType
  /** Nom d'une mesure personnalisée, null sinon */
  label: string | null
  value: number
  unit: string
  measuredAt: Timestamp
  comment: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface GrowthInput {
  type: GrowthType
  label: string | null
  value: number
  unit: string
  measuredAt: Date
  comment: string
}
