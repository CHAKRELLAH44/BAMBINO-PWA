import type { Timestamp } from 'firebase/firestore'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'

interface BasePersonalEvent {
  id: string
  occurredAt: Timestamp
  comment: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

/** Prise d'eau (§12) : quantité facultative, aucun diagnostic */
export interface HydrationEvent extends BasePersonalEvent {
  type: 'hydration'
  details: { amountMl: number | null }
}

/** Repas (§12) : composition détaillée facultative */
export interface MealEvent extends BasePersonalEvent {
  type: 'meal'
  details: { mealType: MealType; composition: string }
}

/** Prise d'un médicament ou d'une vitamine de la maman (§11, §12) */
export interface IntakeEvent extends BasePersonalEvent {
  type: 'motherMedication' | 'supplement'
  details: { reminderId: string | null; name: string }
}

/** Document users/{userId}/personalEvents/{id} (§27) */
export type PersonalEvent = HydrationEvent | MealEvent | IntakeEvent

export type PersonalEventType = PersonalEvent['type']

export type PersonalEventInput =
  | { type: 'hydration'; occurredAt: Date; details: HydrationEvent['details']; comment: string }
  | { type: 'meal'; occurredAt: Date; details: MealEvent['details']; comment: string }
  | { type: 'motherMedication' | 'supplement'; occurredAt: Date; details: IntakeEvent['details']; comment: string }
