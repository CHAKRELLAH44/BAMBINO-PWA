import type { Timestamp } from 'firebase/firestore'

export type MilkType = 'formula' | 'breastMilk'
export type BreastSide = 'left' | 'right'
export type PumpingSide = BreastSide | 'both'
export type DiaperKind = 'wet' | 'dirty' | 'both'
export type BreastfeedingStatus = 'running' | 'paused' | 'done'
export type SleepStatus = 'running' | 'done'

/**
 * Biberon : seulement la quantité bue (décision d'équipe du 22/10, écart au §6 : plus de « préparé » ni de reste).
 * « Lait maternel (stock) » = lait maternel + `containerId` : la quantité bue est retirée de ce contenant.
 */
export interface BottleDetails {
  consumedMl: number
  milkType: MilkType
  /** Contenant du stock utilisé, absent sur les biberons sans stock */
  containerId?: string | null
}

export interface FeedingSegment {
  side: BreastSide
  startAt: Timestamp
  endAt: Timestamp | null
}

export interface BreastfeedingDetails {
  segments: FeedingSegment[]
  /** Quantités estimées (§7.2), toujours affichées comme estimations, jamais déduites de la durée */
  estimatedLeftMl: number | null
  estimatedRightMl: number | null
}

export interface PumpingDetails {
  side: PumpingSide
  totalMl: number
  leftMl: number | null
  rightMl: number | null
  durationMin: number | null
}

export interface DiaperDetails {
  kind: DiaperKind
}

interface BaseEvent {
  id: string
  occurredAt: Timestamp
  comment: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface BottleEvent extends BaseEvent {
  type: 'bottle'
  details: BottleDetails
}

export interface BreastfeedingEvent extends BaseEvent {
  type: 'breastfeeding'
  startAt: Timestamp
  endAt: Timestamp | null
  status: BreastfeedingStatus
  details: BreastfeedingDetails
}

export interface PumpingEvent extends BaseEvent {
  type: 'milkPumping'
  details: PumpingDetails
}

export interface SleepEvent extends BaseEvent {
  type: 'sleep'
  startAt: Timestamp
  endAt: Timestamp | null
  status: SleepStatus
  details: Record<string, never>
}

export interface DiaperEvent extends BaseEvent {
  type: 'diaper'
  details: DiaperDetails
}

/** Document users/{userId}/babies/{babyId}/events/{eventId} (cahier §27) */
export type BabyEvent =
  | BottleEvent
  | BreastfeedingEvent
  | PumpingEvent
  | SleepEvent
  | DiaperEvent

export type BabyEventType = BabyEvent['type']

/** Événements à chronomètre, qui peuvent être en cours */
export type SessionEvent = BreastfeedingEvent | SleepEvent

export const isOngoing = (event: BabyEvent) =>
  (event.type === 'breastfeeding' || event.type === 'sleep') && event.status !== 'done'

// --- Données saisies (dates JavaScript), converties par les repositories ---

export interface BottleInput {
  occurredAt: Date
  details: { consumedMl: number; milkType: MilkType }
  comment: string
}

export interface DiaperInput {
  occurredAt: Date
  kind: DiaperKind
  comment: string
}

export interface PumpingInput {
  occurredAt: Date
  details: PumpingDetails
  comment: string
}

/**
 * Chronomètre de tirage (§5, §8.1) : document users/{userId}/babies/{babyId}/pumpingSessions/{id}
 * le temps de la séance. À la fin, il devient un tirage ordinaire (durée calculée) et le document est supprimé.
 */
export interface PumpingSession {
  side: PumpingSide
  status: 'running' | 'paused'
  segments: { startAt: Date; endAt: Date | null }[]
}

export interface OngoingPumping {
  sessionId: string
  session: PumpingSession
}

export interface SessionSegment {
  side: BreastSide
  startAt: Date
  endAt: Date | null
}

/** Séance d'allaitement (§7.1) : une liste de segments, un seul ouvert à la fois */
export interface FeedingSession {
  status: BreastfeedingStatus
  segments: SessionSegment[]
}
