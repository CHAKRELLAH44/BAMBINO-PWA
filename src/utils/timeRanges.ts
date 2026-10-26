import { addDays, startOfDay } from 'date-fns'
import { toDateInputValue } from './dateInput'

/** Clé de jour locale « yyyy-MM-dd » */
export const dayKey = (date: Date) => toDateInputValue(date)

/** Début et fin (exclue) du jour local contenant la date */
export function dayBounds(date: Date) {
  const start = startOfDay(date)
  return { start, end: addDays(start, 1) }
}

/** Durée (ms) commune à [start, end) et [rangeStart, rangeEnd) */
export function overlapMs(start: Date, end: Date, rangeStart: Date, rangeEnd: Date) {
  const from = Math.max(start.getTime(), rangeStart.getTime())
  const to = Math.min(end.getTime(), rangeEnd.getTime())
  return Math.max(0, to - from)
}

/** Répartit une période sur les jours qu'elle traverse (§9 : sommeil qui passe minuit) */
export function splitByDay(start: Date, end: Date): { day: string; ms: number }[] {
  const parts: { day: string; ms: number }[] = []
  let cursor = start
  while (cursor < end) {
    const nextDay = startOfDay(addDays(cursor, 1))
    const sliceEnd = nextDay < end ? nextDay : end
    parts.push({ day: dayKey(cursor), ms: sliceEnd.getTime() - cursor.getTime() })
    cursor = sliceEnd
  }
  return parts
}
