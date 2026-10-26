import type { Timestamp } from 'firebase/firestore'

export type AppointmentStatus = 'planned' | 'done' | 'cancelled'

/**
 * Document users/{userId}/appointments/{id} (§13, §27) : une seule collection,
 * `concerne` vaut 'mother' ou l'identifiant d'un bébé.
 */
export interface Appointment {
  id: string
  concerne: string
  title: string
  scheduledAt: Timestamp
  location: string | null
  contact: string | null
  comment: string
  status: AppointmentStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface AppointmentInput {
  concerne: string
  title: string
  scheduledAt: Date
  location: string | null
  contact: string | null
  comment: string
  status: AppointmentStatus
}

export const MOTHER = 'mother'
