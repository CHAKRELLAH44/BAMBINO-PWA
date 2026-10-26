import { subscribeToGrowthRecord, subscribeToGrowthRecords } from '../../services/repositories/growthRepository'
import type { GrowthRecord } from '../../types/growth'
import { useSubscription } from '../../utils/useSubscription'
import { useUserId } from '../auth/useAuth'

const EMPTY: GrowthRecord[] = []

/** Toutes les mesures du bébé, en direct, de la plus récente à la plus ancienne */
export function useGrowthRecords(babyId: string) {
  const userId = useUserId()
  const { value, ...rest } = useSubscription(
    `${userId}/${babyId}`,
    (onNext, onError) => subscribeToGrowthRecords(userId, babyId, onNext, onError),
    EMPTY,
  )
  return { records: value, ...rest }
}

export function useGrowthRecord(babyId: string, recordId: string) {
  const userId = useUserId()
  const { value, ...rest } = useSubscription<GrowthRecord | null>(
    `${userId}/${babyId}/${recordId}`,
    (onNext, onError) => subscribeToGrowthRecord(userId, babyId, recordId, onNext, onError),
    null,
  )
  return { record: value, ...rest }
}
