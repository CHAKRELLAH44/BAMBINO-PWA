import type { PersonalEvent } from '../../types/personal'
import { dayBounds } from '../../utils/timeRanges'

export interface MotherDaySummary {
  hydration: { count: number; totalMl: number }
  meals: number
  medications: number
  supplements: number
}

/**
 * Résumé de la journée de la maman (vue séparée, §17.1).
 * Simple décompte de ce qui a été saisi : aucun objectif ni diagnostic (§12).
 */
export function summarizeMotherDay(events: PersonalEvent[], day: Date): MotherDaySummary {
  const { start, end } = dayBounds(day)
  const summary: MotherDaySummary = { hydration: { count: 0, totalMl: 0 }, meals: 0, medications: 0, supplements: 0 }
  const unique = new Map(events.map((event) => [event.id, event]))

  for (const event of unique.values()) {
    const at = event.occurredAt.toDate()
    if (at < start || at >= end) continue
    switch (event.type) {
      case 'hydration':
        summary.hydration.count += 1
        summary.hydration.totalMl += event.details.amountMl ?? 0
        break
      case 'meal':
        summary.meals += 1
        break
      case 'motherMedication':
        summary.medications += 1
        break
      case 'supplement':
        summary.supplements += 1
        break
    }
  }
  return summary
}
