import {
  subscribeToPersonalEvent,
  subscribeToPersonalEvents,
} from '../../services/repositories/personalRepository'
import type { PersonalEvent } from '../../types/personal'
import { useSubscription } from '../../utils/useSubscription'
import { useUserId } from '../auth/useAuth'

const EMPTY: PersonalEvent[] = []

/** Derniers événements de la maman (eau, repas, médicaments, vitamines) */
export function usePersonalEvents(maxCount = 200) {
  const userId = useUserId()
  const { value, ...rest } = useSubscription(
    `${userId}/${maxCount}`,
    (onNext, onError) => subscribeToPersonalEvents(userId, maxCount, onNext, onError),
    EMPTY,
  )
  return { events: value, ...rest }
}

export function usePersonalEvent(eventId: string) {
  const userId = useUserId()
  const { value, ...rest } = useSubscription<PersonalEvent | null>(
    `${userId}/${eventId}`,
    (onNext, onError) => subscribeToPersonalEvent(userId, eventId, onNext, onError),
    null,
  )
  return { event: value, ...rest }
}
