import { useEffect, useState } from 'react'
import { subscribeToPumpingSession } from '../../services/repositories/pumpingSessionRepository'
import type { OngoingPumping } from '../../types/event'
import { useUserId } from '../auth/useAuth'
import { readPumpingBackup, savePumpingBackup } from './sessionBackup'

interface ServerState {
  babyId: string
  pumping: OngoingPumping | null
  confirmed: boolean
}

/**
 * Tirage en cours du bébé (§5) : Firestore fait foi dès que le serveur a répondu ;
 * avant (démarrage, hors ligne, erreur), on reprend la copie de secours de l'appareil.
 */
export function useOngoingPumping(babyId: string | null) {
  const userId = useUserId()
  const [server, setServer] = useState<ServerState | null>(null)

  useEffect(() => {
    if (!babyId) return
    return subscribeToPumpingSession(
      userId,
      babyId,
      (pumping, fromCache) => {
        if (!fromCache) savePumpingBackup(userId, babyId, pumping)
        setServer({ babyId, pumping, confirmed: !fromCache })
      },
      () => setServer({ babyId, pumping: null, confirmed: false }),
    )
  }, [userId, babyId])

  if (!babyId) return { pumping: null, loading: false }

  const current = server?.babyId === babyId ? server : null
  if (current?.confirmed) return { pumping: current.pumping, loading: false }

  const backup = readPumpingBackup(userId, babyId)
  return { pumping: current?.pumping ?? backup, loading: current === null && backup === null }
}
