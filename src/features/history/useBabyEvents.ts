import { useEffect, useState } from 'react'
import { subscribeToEvents } from '../../services/repositories/eventRepository'
import type { BabyEvent } from '../../types/event'
import { useUserId } from '../auth/useAuth'

interface Options {
  maxCount?: number
  /** Inclus */
  from?: Date | null
  /** Exclu */
  to?: Date | null
}

interface EventsState {
  key: string
  events: BabyEvent[]
  loadError: boolean
}

/** Événements du bébé (du plus récent au plus ancien), mis à jour en direct */
export function useBabyEvents(babyId: string | null, options: Options = {}) {
  const userId = useUserId()
  const maxCount = options.maxCount ?? 200
  const fromMs = options.from?.getTime() ?? null
  const toMs = options.to?.getTime() ?? null
  const key = `${babyId}|${maxCount}|${fromMs}|${toMs}`
  const [state, setState] = useState<EventsState>({ key: '', events: [], loadError: false })

  useEffect(() => {
    if (!babyId) return
    return subscribeToEvents(
      userId,
      babyId,
      {
        maxCount,
        from: fromMs === null ? undefined : new Date(fromMs),
        to: toMs === null ? undefined : new Date(toMs),
      },
      (events) => setState({ key, events, loadError: false }),
      () => setState({ key, events: [], loadError: true }),
    )
  }, [userId, babyId, maxCount, fromMs, toMs, key])

  // Les données affichées doivent toujours correspondre à la demande en cours
  const isCurrent = state.key === key
  return {
    events: isCurrent ? state.events : [],
    loading: babyId !== null && !isCurrent,
    loadError: isCurrent && state.loadError,
  }
}
