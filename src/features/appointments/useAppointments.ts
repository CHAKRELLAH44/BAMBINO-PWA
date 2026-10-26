import {
  subscribeToAppointment,
  subscribeToAppointments,
  subscribeToAppointmentsFor,
} from '../../services/repositories/appointmentRepository'
import type { Appointment } from '../../types/appointment'
import { useSubscription } from '../../utils/useSubscription'
import { useUserId } from '../auth/useAuth'

const EMPTY: Appointment[] = []

/** Rendez-vous triés par date : tous, ou ceux d'une personne ('mother' ou un bébé) */
export function useAppointments(concerne: string | null = null) {
  const userId = useUserId()
  const { value, ...rest } = useSubscription(
    `${userId}/${concerne ?? '*'}`,
    (onNext, onError) =>
      concerne
        ? subscribeToAppointmentsFor(userId, concerne, onNext, onError)
        : subscribeToAppointments(userId, onNext, onError),
    EMPTY,
  )
  return { appointments: value, ...rest }
}

export function useAppointment(appointmentId: string) {
  const userId = useUserId()
  const { value, ...rest } = useSubscription<Appointment | null>(
    `${userId}/${appointmentId}`,
    (onNext, onError) => subscribeToAppointment(userId, appointmentId, onNext, onError),
    null,
  )
  return { appointment: value, ...rest }
}
