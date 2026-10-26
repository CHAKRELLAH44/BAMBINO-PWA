import type { Timestamp } from 'firebase/firestore'

/** Service concerné par un rappel ou un traitement (§11, §12, §14) */
export const REMINDER_SERVICES = [
  'medication',
  'supplement',
  'hydration',
  'meal',
  'bottle',
  'breastfeeding',
  'diaper',
  'sleep',
  'custom',
] as const
export type ReminderService = (typeof REMINDER_SERVICES)[number]

export type ScheduleType = 'fixedTimes' | 'interval'

/** Jours ISO : 1 = lundi … 7 = dimanche */
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]

/**
 * Document users/{userId}/reminders/{id} (§14, §27).
 * Sert aussi de « traitement » pour les médicaments et vitamines (§11, §12) :
 * nom = title, instructions saisies par la maman = description.
 * Avant la phase notifications (P2), rien n'est envoyé : `enabled` est seulement enregistré.
 */
export interface Reminder {
  id: string
  serviceId: ReminderService
  /** null = la maman */
  babyId: string | null
  title: string
  description: string
  scheduleType: ScheduleType
  /** « HH:mm » */
  scheduledTimes: string[]
  daysOfWeek: number[]
  intervalMinutes: number | null
  /** Réservés aux notifications (P2) */
  maxRepeats: number
  repeatEveryMinutes: number | null
  startDate: Timestamp | null
  endDate: Timestamp | null
  timezone: string
  enabled: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ReminderInput {
  serviceId: ReminderService
  babyId: string | null
  title: string
  description: string
  scheduleType: ScheduleType
  scheduledTimes: string[]
  daysOfWeek: number[]
  intervalMinutes: number | null
  startDate: Date | null
  endDate: Date | null
  enabled: boolean
}
