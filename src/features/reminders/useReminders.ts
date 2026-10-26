import { subscribeToReminders } from '../../services/repositories/reminderRepository'
import type { Reminder } from '../../types/reminder'
import { useSubscription } from '../../utils/useSubscription'
import { useUserId } from '../auth/useAuth'

const EMPTY: Reminder[] = []

/** Tous les rappels et traitements de l'utilisatrice */
export function useReminders() {
  const userId = useUserId()
  const { value, ...rest } = useSubscription(
    userId,
    (onNext, onError) => subscribeToReminders(userId, onNext, onError),
    EMPTY,
  )
  return { reminders: value, ...rest }
}
