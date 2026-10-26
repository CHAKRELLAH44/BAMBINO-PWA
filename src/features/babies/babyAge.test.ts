import { describe, expect, it } from 'vitest'
import { getBabyAge } from './babyAge'

const now = new Date(2026, 9, 21, 15, 0) // 21 octobre 2026, 15h

describe('getBabyAge', () => {
  it('bébé né aujourd’hui → nouveau-né', () => {
    expect(getBabyAge(new Date(2026, 9, 21, 2, 0), now)).toEqual({ unit: 'newborn', count: 0 })
  })

  it('moins de 14 jours → en jours', () => {
    expect(getBabyAge(new Date(2026, 9, 20), now)).toEqual({ unit: 'days', count: 1 })
    expect(getBabyAge(new Date(2026, 9, 8), now)).toEqual({ unit: 'days', count: 13 })
  })

  it('de 2 semaines à 2 mois → en semaines', () => {
    expect(getBabyAge(new Date(2026, 9, 7), now)).toEqual({ unit: 'weeks', count: 2 })
    expect(getBabyAge(new Date(2026, 7, 22), now)).toEqual({ unit: 'weeks', count: 8 })
  })

  it('de 2 mois à 2 ans → en mois', () => {
    expect(getBabyAge(new Date(2026, 7, 21), now)).toEqual({ unit: 'months', count: 2 })
    expect(getBabyAge(new Date(2025, 0, 1), now)).toEqual({ unit: 'months', count: 21 })
  })

  it('2 ans et plus → en années', () => {
    expect(getBabyAge(new Date(2024, 9, 21), now)).toEqual({ unit: 'years', count: 2 })
  })

  it('date de naissance dans le futur → jamais d’âge négatif', () => {
    expect(getBabyAge(new Date(2026, 10, 1), now)).toEqual({ unit: 'newborn', count: 0 })
  })
})
