import { segmentsFromFirestore } from '../../services/repositories/eventRepository'
import type { FeedingSession, SessionEvent } from '../../types/event'

export interface OngoingFeeding {
  eventId: string
  session: FeedingSession
}

export interface OngoingSleep {
  eventId: string
  startAt: Date
}

export interface OngoingSessions {
  feeding: OngoingFeeding | null
  sleep: OngoingSleep | null
}

export const NO_SESSIONS: OngoingSessions = { feeding: null, sleep: null }

/** Garde la séance la plus récente de chaque type parmi les événements non terminés */
export function toOngoingSessions(events: SessionEvent[]): OngoingSessions {
  const sorted = [...events].sort((a, b) => b.startAt.toMillis() - a.startAt.toMillis())
  const feeding = sorted.find((event) => event.type === 'breastfeeding')
  const sleep = sorted.find((event) => event.type === 'sleep')
  return {
    feeding:
      feeding?.type === 'breastfeeding'
        ? {
            eventId: feeding.id,
            session: { status: feeding.status, segments: segmentsFromFirestore(feeding.details.segments) },
          }
        : null,
    sleep: sleep ? { eventId: sleep.id, startAt: sleep.startAt.toDate() } : null,
  }
}
