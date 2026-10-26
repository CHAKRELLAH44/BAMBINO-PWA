import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { subscribeToBabies } from '../../services/repositories/babyRepository'
import type { Baby } from '../../types/baby'
import { useUserId } from '../auth/useAuth'
import { ActiveBabyContext, type ActiveBabyState } from './ActiveBabyContext'

// Le bébé actif est mémorisé sur l'appareil (préférence d'affichage, pas une donnée de suivi)
const storageKey = (userId: string) => `bambino.activeBaby.${userId}`

function readStoredBabyId(userId: string) {
  try {
    return localStorage.getItem(storageKey(userId))
  } catch {
    return null
  }
}

function writeStoredBabyId(userId: string, babyId: string) {
  try {
    localStorage.setItem(storageKey(userId), babyId)
  } catch {
    // stockage indisponible (navigation privée) : le choix reste valable pour la session
  }
}

export function ActiveBabyProvider({ children }: { children: ReactNode }) {
  const userId = useUserId()
  const [babies, setBabies] = useState<Baby[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [selectedId, setSelectedId] = useState(() => readStoredBabyId(userId))

  useEffect(
    () =>
      subscribeToBabies(
        userId,
        (list) => {
          setBabies(list)
          setLoading(false)
        },
        () => {
          setLoadError(true)
          setLoading(false)
        },
      ),
    [userId],
  )

  const setActiveBabyId = useCallback(
    (babyId: string) => {
      setSelectedId(babyId)
      writeStoredBabyId(userId, babyId)
    },
    [userId],
  )

  const value = useMemo<ActiveBabyState>(() => {
    const available = babies.filter((baby) => !baby.archivedAt)
    const activeBaby = available.find((baby) => baby.id === selectedId) ?? available[0] ?? null
    return { babies, activeBaby, loading, loadError, setActiveBabyId }
  }, [babies, selectedId, loading, loadError, setActiveBabyId])

  return <ActiveBabyContext value={value}>{children}</ActiveBabyContext>
}
