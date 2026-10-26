import { useEffect, useState } from 'react'
import { subscribeToOngoingSessions } from '../../services/repositories/eventRepository'
import { useUserId } from '../auth/useAuth'
import { NO_SESSIONS, toOngoingSessions, type OngoingSessions } from './ongoing'
import { readSessionBackups, syncSessionBackups } from './sessionBackup'

interface ServerState {
  babyId: string
  sessions: OngoingSessions
  confirmed: boolean
}

/**
 * Séances en cours du bébé (§5) : Firestore fait foi dès que le serveur a répondu ;
 * avant (démarrage, hors ligne, erreur), on complète avec la copie de secours de l'appareil.
 */
export function useOngoingSessions(babyId: string | null) {
  const userId = useUserId()
  const [server, setServer] = useState<ServerState | null>(null)

  useEffect(() => {
    if (!babyId) return
    return subscribeToOngoingSessions(
      userId,
      babyId,
      (events, fromCache) => {
        const sessions = toOngoingSessions(events)
        if (!fromCache) syncSessionBackups(userId, babyId, sessions)
        setServer({ babyId, sessions, confirmed: !fromCache })
      },
      () => setServer({ babyId, sessions: NO_SESSIONS, confirmed: false }),
    )
  }, [userId, babyId])

  if (!babyId) return { ...NO_SESSIONS, loading: false }

  const current = server?.babyId === babyId ? server : null
  if (current?.confirmed) return { ...current.sessions, loading: false }

  const backup = readSessionBackups(userId, babyId)
  return {
    feeding: current?.sessions.feeding ?? backup.feeding,
    sleep: current?.sessions.sleep ?? backup.sleep,
    loading: current === null && backup === NO_SESSIONS,
  }
}
