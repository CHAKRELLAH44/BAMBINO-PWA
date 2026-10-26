import { addDays, startOfDay } from 'date-fns'
import { isPlannedOn, normalizeTimes } from '../features/reminders/schedule'
import type { Appointment } from '../types/appointment'
import type { Reminder } from '../types/reminder'

export type TodayPlan =
  | { kind: 'appointment'; id: string; time: string | null; appointment: Appointment }
  | { kind: 'reminder'; id: string; time: string | null; reminder: Reminder }

const pad = (value: number) => String(value).padStart(2, '0')
const timeOf = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

/**
 * Ce qui est planifié pour le jour J (accueil) : rendez-vous prévus ce jour-là (maman ou bébé),
 * traitements et rappels dont le calendrier tombe ce jour-là. Triés par heure ; les rappels « à intervalle »
 * (sans heure fixe) viennent en dernier. `hidden` : identifiants masqués de l'accueil par la maman.
 */
export function todayPlans(appointments: Appointment[], reminders: Reminder[], day: Date, hidden: string[] = []): TodayPlan[] {
  const start = startOfDay(day)
  const end = addDays(start, 1)

  const plans: TodayPlan[] = [
    ...appointments
      .filter((appointment) => {
        const at = appointment.scheduledAt.toDate()
        return appointment.status === 'planned' && at >= start && at < end
      })
      .map((appointment): TodayPlan => ({
        kind: 'appointment',
        id: `appointment:${appointment.id}`,
        time: timeOf(appointment.scheduledAt.toDate()),
        appointment,
      })),
    ...reminders
      .filter((reminder) =>
        isPlannedOn(
          {
            daysOfWeek: reminder.daysOfWeek,
            startDate: reminder.startDate?.toDate() ?? null,
            endDate: reminder.endDate?.toDate() ?? null,
          },
          day,
        ),
      )
      .map((reminder): TodayPlan => ({
        kind: 'reminder',
        id: `reminder:${reminder.id}`,
        time: reminder.scheduleType === 'fixedTimes' ? (normalizeTimes(reminder.scheduledTimes)[0] ?? null) : null,
        reminder,
      })),
  ]

  return plans
    .filter((plan) => !hidden.includes(plan.id))
    .sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
}
