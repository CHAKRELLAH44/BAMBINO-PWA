import { getISODay, startOfDay } from 'date-fns'

export interface ScheduleWindow {
  daysOfWeek: number[]
  startDate: Date | null
  endDate: Date | null
}

/** Le traitement ou rappel est-il prévu ce jour-là (jours de la semaine et période) ? */
export function isPlannedOn(schedule: ScheduleWindow, day: Date) {
  const date = startOfDay(day)
  if (schedule.startDate && date < startOfDay(schedule.startDate)) return false
  if (schedule.endDate && date > startOfDay(schedule.endDate)) return false
  return schedule.daysOfWeek.includes(getISODay(date))
}

/** « HH:mm » valide */
export const isTimeOfDay = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

/** Heures triées et sans doublon */
export const normalizeTimes = (times: string[]) => [...new Set(times.filter(isTimeOfDay))].sort()
