import { describe, expect, it } from 'vitest'
import { overlapMs, splitByDay } from './timeRanges'

const HOUR = 3_600_000

describe('splitByDay (§9 : sommeil traversant minuit)', () => {
  it('un sommeil de 22 h à 6 h est réparti sur deux dates', () => {
    expect(splitByDay(new Date(2026, 9, 20, 22, 0), new Date(2026, 9, 21, 6, 0))).toEqual([
      { day: '2026-10-20', ms: 2 * HOUR },
      { day: '2026-10-21', ms: 6 * HOUR },
    ])
  })

  it('une période dans la même journée reste sur une date', () => {
    expect(splitByDay(new Date(2026, 9, 21, 13, 0), new Date(2026, 9, 21, 14, 30))).toEqual([
      { day: '2026-10-21', ms: 1.5 * HOUR },
    ])
  })

  it('une période vide ou inversée ne donne rien', () => {
    const t = new Date(2026, 9, 21, 13, 0)
    expect(splitByDay(t, t)).toEqual([])
    expect(splitByDay(t, new Date(2026, 9, 21, 12, 0))).toEqual([])
  })
})

describe('overlapMs', () => {
  it('ne garde que la partie commune', () => {
    const dayStart = new Date(2026, 9, 21)
    const dayEnd = new Date(2026, 9, 22)
    expect(overlapMs(new Date(2026, 9, 20, 22), new Date(2026, 9, 21, 6), dayStart, dayEnd)).toBe(6 * HOUR)
    expect(overlapMs(new Date(2026, 9, 19, 22), new Date(2026, 9, 20, 6), dayStart, dayEnd)).toBe(0)
  })
})
