import type { Timestamp } from 'firebase/firestore'

// Profil maman (Bébés → Profil maman) : ce que la maman garde pour elle, visible par elle seule.
// Aucun calcul (pas d'IMC, pas d'objectif) : seulement les valeurs saisies.

/** Document users/{userId}/motherInfo/profile */
export interface MotherInfo {
  heightCm: number | null
  /** Pense-bête libre : allergies, groupe sanguin, questions pour la prochaine visite… */
  notes: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

/** Document users/{userId}/motherWeights/{id} */
export interface MotherWeight {
  id: string
  weightKg: number
  measuredAt: Timestamp
  comment: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface MotherWeightInput {
  weightKg: number
  measuredAt: Date
  comment: string
}

export const CONTACT_ROLES = ['midwife', 'gynecologist', 'pediatrician', 'doctor', 'pharmacy', 'family', 'other'] as const
export type ContactRole = (typeof CONTACT_ROLES)[number]

/** Document users/{userId}/motherContacts/{id} : contacts utiles (sage-femme, pédiatre…) */
export interface MotherContact {
  id: string
  role: ContactRole
  name: string
  phone: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface MotherContactInput {
  role: ContactRole
  name: string
  phone: string
}
