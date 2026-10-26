import { useEffect, useState } from 'react'
import { subscribeToEvent } from '../../services/repositories/eventRepository'
import type { BabyEvent } from '../../types/event'
import { useUserId } from '../auth/useAuth'

type EventState =
  | { status: 'loading'; event: null }
  | { status: 'missing'; event: null }
  | { status: 'error'; event: null }
  | { status: 'ready'; event: BabyEvent }

/** Un événement du bébé, à jour en direct (pour les écrans de modification) */
export function useEvent(babyId: string, eventId: string): EventState {
  const userId = useUserId()
  const key = `${babyId}/${eventId}`
  const [state, setState] = useState<{ key: string; value: EventState } | null>(null)

  useEffect(
    () =>
      subscribeToEvent(
        userId,
        babyId,
        eventId,
        (event) =>
          setState({ key, value: event ? { status: 'ready', event } : { status: 'missing', event: null } }),
        () => setState({ key, value: { status: 'error', event: null } }),
      ),
    [userId, babyId, eventId, key],
  )

  return state?.key === key ? state.value : { status: 'loading', event: null }
}
