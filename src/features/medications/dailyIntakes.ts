import { isSameDay } from 'date-fns'
import type { IntakeEvent, PersonalEvent } from '../../types/personal'
import type { Reminder } from '../../types/reminder'

// Prises du jour d'un traitement (§11, §12) : on compte seulement ce que la maman a noté « Prise effectuée ».
// Aucune dose ni calcul médical : « 2 fois par jour » = 2 heures enregistrées dans le traitement.

export interface DailyProgress {
  taken: number
  /** Prises prévues ce jour-là ; null pour un ancien traitement « à intervalle » (pas de nombre fixe) */
  total: number | null
  done: boolean
  /** Dernière prise du jour (pour « Annuler la dernière prise ») */
  lastIntake: IntakeEvent | null
}

export const timesPerDay = (plan: Reminder) => (plan.scheduleType === 'fixedTimes' ? plan.scheduledTimes.length : null)

const isIntake = (event: PersonalEvent): event is IntakeEvent =>
  event.type === 'motherMedication' || event.type === 'supplement'

export function dailyProgress(plan: Reminder, events: PersonalEvent[], day: Date): DailyProgress {
  const intakes = events
    .filter(isIntake)
    .filter((event) => event.details.reminderId === plan.id && isSameDay(event.occurredAt.toDate(), day))
    .sort((a, b) => b.occurredAt.toMillis() - a.occurredAt.toMillis())
  const total = timesPerDay(plan)
  return { taken: intakes.length, total, done: total !== null && intakes.length >= total, lastIntake: intakes[0] ?? null }
}

const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/**
 * Heures proposées pour n prises, réparties de 08:00 à 20:00 par demi-heures. Simple point de départ
 * modifiable : la maman recopie les heures de son ordonnance (ce n'est pas un conseil).
 */
export function spreadTimes(count: number): string[] {
  if (count <= 1) return ['08:00']
  const step = 720 / (count - 1)
  return Array.from({ length: count }, (_, index) => toTime(Math.round((480 + index * step) / 30) * 30))
}

/** Heure d'une prise ajoutée : 2 h après la dernière, sans doublon */
export function nextTime(times: string[]): string {
  const valid = times.filter((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))
  const last = valid.at(-1) ?? '06:00'
  const [hours, minutes] = last.split(':').map(Number)
  let candidate = (hours * 60 + minutes + 120) % 1440
  while (valid.includes(toTime(candidate))) candidate = (candidate + 30) % 1440
  return toTime(candidate)
}
