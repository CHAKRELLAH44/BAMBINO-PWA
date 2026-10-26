import {
  subscribeToMotherContacts,
  subscribeToMotherInfo,
  subscribeToMotherWeights,
} from '../../services/repositories/motherRepository'
import type { MotherContact, MotherInfo, MotherWeight } from '../../types/mother'
import { useSubscription } from '../../utils/useSubscription'
import { useUserId } from '../auth/useAuth'

/** Taille et pense-bête de la maman (null tant qu'elle n'a rien enregistré) */
export function useMotherInfo() {
  const userId = useUserId()
  const { value, ...rest } = useSubscription<MotherInfo | null>(
    userId,
    (onNext, onError) => subscribeToMotherInfo(userId, onNext, onError),
    null,
  )
  return { info: value, ...rest }
}

/** Pesées de la maman, de la plus récente à la plus ancienne */
export function useMotherWeights() {
  const userId = useUserId()
  const { value, ...rest } = useSubscription<MotherWeight[]>(
    userId,
    (onNext, onError) => subscribeToMotherWeights(userId, onNext, onError),
    [],
  )
  return { weights: value, ...rest }
}

export function useMotherContacts() {
  const userId = useUserId()
  const { value, ...rest } = useSubscription<MotherContact[]>(
    userId,
    (onNext, onError) => subscribeToMotherContacts(userId, onNext, onError),
    [],
  )
  return { contacts: value, ...rest }
}
