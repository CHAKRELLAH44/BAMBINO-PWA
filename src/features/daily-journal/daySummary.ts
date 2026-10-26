import type { BabyEvent } from '../../types/event'
import { dayBounds, overlapMs } from '../../utils/timeRanges'

export interface DaySummary {
  bottles: { count: number; consumedMl: number }
  feedings: { count: number; durationMs: number }
  pumpings: { count: number; totalMl: number }
  sleeps: { count: number; durationMs: number }
  diapers: { count: number; wet: number; dirty: number }
}

/** Vrai si l'événement concerne la journée : ponctuel dans la journée, ou période qui la chevauche */
export function belongsToDay(event: BabyEvent, day: Date, now: Date = new Date()) {
  const { start, end } = dayBounds(day)
  if (event.type === 'sleep' || event.type === 'breastfeeding') {
    const from = event.startAt.toDate()
    const to = event.endAt?.toDate() ?? now
    return from < end && (to > start || (from >= start && from < end))
  }
  const at = event.occurredAt.toDate()
  return at >= start && at < end
}

/** Résumé du jour (§17.3) : voir `summarizeRange` */
export function summarizeDay(events: BabyEvent[], day: Date): DaySummary {
  const { start, end } = dayBounds(day)
  return summarizeRange(events, start, end)
}

/**
 * Résumé d'une période [start, end) : un jour (§17.3) ou la période d'un rapport (§18).
 * - Un événement n'est jamais compté deux fois (dédoublonnage par identifiant), même s'il traverse minuit.
 * - Seules les tétées et les nuits terminées comptent ; une période sans fin n'a pas de durée définitive.
 * - Une période qui dépasse les bornes ne compte que sa partie à l'intérieur.
 * - Le volume bu au sein n'est jamais inventé : il n'apparaît pas ici.
 */
export function summarizeRange(events: BabyEvent[], start: Date, end: Date): DaySummary {
  const inDay = (date: Date) => date >= start && date < end
  const summary: DaySummary = {
    bottles: { count: 0, consumedMl: 0 },
    feedings: { count: 0, durationMs: 0 },
    pumpings: { count: 0, totalMl: 0 },
    sleeps: { count: 0, durationMs: 0 },
    diapers: { count: 0, wet: 0, dirty: 0 },
  }

  const unique = new Map(events.map((event) => [event.id, event]))
  for (const event of unique.values()) {
    switch (event.type) {
      case 'bottle':
        if (inDay(event.occurredAt.toDate())) {
          summary.bottles.count += 1
          summary.bottles.consumedMl += event.details.consumedMl
        }
        break
      case 'milkPumping':
        if (inDay(event.occurredAt.toDate())) {
          summary.pumpings.count += 1
          summary.pumpings.totalMl += event.details.totalMl
        }
        break
      case 'diaper':
        if (inDay(event.occurredAt.toDate())) {
          summary.diapers.count += 1
          if (event.details.kind !== 'dirty') summary.diapers.wet += 1
          if (event.details.kind !== 'wet') summary.diapers.dirty += 1
        }
        break
      case 'sleep': {
        if (event.status !== 'done' || !event.endAt) break
        const ms = overlapMs(event.startAt.toDate(), event.endAt.toDate(), start, end)
        if (ms > 0) {
          summary.sleeps.count += 1
          summary.sleeps.durationMs += ms
        }
        break
      }
      case 'breastfeeding': {
        if (event.status !== 'done') break
        let ms = 0
        for (const segment of event.details.segments) {
          if (segment.endAt) ms += overlapMs(segment.startAt.toDate(), segment.endAt.toDate(), start, end)
        }
        if (ms > 0) {
          summary.feedings.count += 1
          summary.feedings.durationMs += ms
        }
        break
      }
    }
  }
  return summary
}
