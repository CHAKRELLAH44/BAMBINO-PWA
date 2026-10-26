import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import type { PersonalEvent } from '../../types/personal'
import { summarizeMotherDay } from './motherDaySummary'

const ts = (day: number, hour: number) => Timestamp.fromDate(new Date(2026, 9, day, hour))
const base = { comment: '', createdAt: ts(21, 0), updatedAt: ts(21, 0) }

const water = (id: string, day: number, amountMl: number | null): PersonalEvent => ({
  ...base,
  id,
  type: 'hydration',
  occurredAt: ts(day, 10),
  details: { amountMl },
})

describe('summarizeMotherDay', () => {
  it('compte les verres d’eau du jour, quantité inconnue = 0 ml', () => {
    const summary = summarizeMotherDay(
      [water('a', 21, 250), water('b', 21, null), water('c', 20, 500)],
      new Date(2026, 9, 21),
    )
    expect(summary.hydration).toEqual({ count: 2, totalMl: 250 })
  })

  it('compte repas, médicaments et vitamines, sans double comptage', () => {
    const meal: PersonalEvent = {
      ...base,
      id: 'm',
      type: 'meal',
      occurredAt: ts(21, 12),
      details: { mealType: 'lunch', composition: '' },
    }
    const pill: PersonalEvent = {
      ...base,
      id: 'p',
      type: 'motherMedication',
      occurredAt: ts(21, 8),
      details: { reminderId: null, name: 'Fer' },
    }
    const vitamin: PersonalEvent = { ...pill, id: 'v', type: 'supplement' }
    expect(summarizeMotherDay([meal, meal, pill, vitamin], new Date(2026, 9, 21))).toEqual({
      hydration: { count: 0, totalMl: 0 },
      meals: 1,
      medications: 1,
      supplements: 1,
    })
  })
})
