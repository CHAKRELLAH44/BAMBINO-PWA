import { subscribeToUserProfile } from '../../services/repositories/userRepository'
import type { UserProfile } from '../../types/user'
import { useSubscription } from '../../utils/useSubscription'
import { useUserId } from './useAuth'

/** Profil de la maman connectée (prénom, langue…) */
export function useUserProfile() {
  const userId = useUserId()
  const { value, ...rest } = useSubscription<UserProfile | null>(
    userId,
    (onNext, onError) => subscribeToUserProfile(userId, onNext, onError),
    null,
  )
  return { profile: value, ...rest }
}
