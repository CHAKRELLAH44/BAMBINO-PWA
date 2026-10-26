import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import type { BabyEvent } from '../../types/event'
import { belongsToDay, summarizeDay, summarizeRange } from './daySummary'

const ts = (day: number, hour: number, minute = 0) => Timestamp.fromDate(new Date(2026, 9, day, hour, minute))
const base = { comment: '', createdAt: ts(21, 0), updatedAt: ts(21, 0) }
const HOUR = 3_600_000
const MIN = 60_000

const bottle = (id: string, day: number, hour: number, consumedMl: number): BabyEvent => ({
  ...base,
  id,
  type: 'bottle',
  occurredAt: ts(day, hour),
  details: { consumedMl, milkType: 'formula' },
})

const sleep = (id: string, start: Timestamp, end: Timestamp | null): BabyEvent => ({
  ...base,
  id,
  type: 'sleep',
  occurredAt: start,
  startAt: start,
  endAt: end,
  status: end ? 'done' : 'running',
  details: {},
})

const feeding = (id: string, status: 'running' | 'done'): BabyEvent => ({
  ...base,
  id,
  type: 'breastfeeding',
  occurredAt: ts(21, 9),
  startAt: ts(21, 9),
  endAt: status === 'done' ? ts(21, 9, 20) : null,
  status,
  details: {
    segments: [
      { side: 'left', startAt: ts(21, 9), endAt: ts(21, 9, 12) },
      { side: 'right', startAt: ts(21, 9, 12), endAt: status === 'done' ? ts(21, 9, 20) : null },
    ],
    estimatedLeftMl: 40,
    estimatedRightMl: null,
  },
})

const diaper = (id: string, kind: 'wet' | 'dirty' | 'both'): BabyEvent => ({
  ...base,
  id,
  type: 'diaper',
  occurredAt: ts(21, 11),
  details: { kind },
})

const day = new Date(2026, 9, 21)

describe('summarizeDay (§17.3)', () => {
  it('biberons : nombre et volume bu, uniquement du jour', () => {
    const summary = summarizeDay([bottle('a', 21, 8, 90), bottle('b', 21, 14, 120), bottle('c', 20, 23, 100)], day)
    expect(summary.bottles).toEqual({ count: 2, consumedMl: 210 })
  })

  it('un événement présent deux fois n’est compté qu’une fois', () => {
    const b = bottle('a', 21, 8, 90)
    expect(summarizeDay([b, b], day).bottles).toEqual({ count: 1, consumedMl: 90 })
  })

  it('sommeil traversant minuit : seule la partie du jour compte, sur chaque date', () => {
    const night = sleep('s', ts(20, 22), ts(21, 6))
    expect(summarizeDay([night], new Date(2026, 9, 20)).sleeps).toEqual({ count: 1, durationMs: 2 * HOUR })
    expect(summarizeDay([night], day).sleeps).toEqual({ count: 1, durationMs: 6 * HOUR })
  })

  it('un sommeil en cours n’est jamais compté comme durée définitive', () => {
    expect(summarizeDay([sleep('s', ts(21, 13), null)], day).sleeps).toEqual({ count: 0, durationMs: 0 })
  })

  it('tétées : seules les terminées comptent, durée = somme des segments', () => {
    expect(summarizeDay([feeding('f1', 'done'), feeding('f2', 'running')], day).feedings).toEqual({
      count: 1,
      durationMs: 20 * MIN,
    })
  })

  it('couches : « les deux » compte comme urine et selles, mais une seule couche', () => {
    expect(summarizeDay([diaper('d1', 'wet'), diaper('d2', 'both'), diaper('d3', 'dirty')], day).diapers).toEqual({
      count: 3,
      wet: 2,
      dirty: 2,
    })
  })
})

describe('belongsToDay', () => {
  it('un sommeil de la nuit apparaît dans le journal des deux dates', () => {
    const night = sleep('s', ts(20, 22), ts(21, 6))
    expect(belongsToDay(night, new Date(2026, 9, 20))).toBe(true)
    expect(belongsToDay(night, day)).toBe(true)
    expect(belongsToDay(night, new Date(2026, 9, 22))).toBe(false)
  })

  it('un sommeil en cours apparaît jusqu’à maintenant', () => {
    const running = sleep('s', ts(21, 22), null)
    expect(belongsToDay(running, new Date(2026, 9, 22), new Date(2026, 9, 22, 1, 0))).toBe(true)
  })
})

describe('résumé d’une période (rapport §18)', () => {
  it('une nuit qui traverse minuit compte une seule fois sur la semaine, pour toute sa durée', () => {
    const night = sleep('s1', ts(20, 22), ts(21, 6))
    const week = summarizeRange([night], new Date(2026, 9, 15), new Date(2026, 9, 22))
    expect(week.sleeps).toEqual({ count: 1, durationMs: 8 * HOUR })
    // Somme des jours : la même nuit apparaîtrait deux fois
    expect(summarizeDay([night], new Date(2026, 9, 20)).sleeps.count + summarizeDay([night], new Date(2026, 9, 21)).sleeps.count).toBe(2)
  })

  it('ne compte que la partie d’une nuit à l’intérieur de la période', () => {
    const night = sleep('s1', ts(20, 22), ts(21, 6))
    expect(summarizeRange([night], new Date(2026, 9, 21), new Date(2026, 9, 22)).sleeps.durationMs).toBe(6 * HOUR)
  })
})
