import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import type { BabyEvent } from '../../types/event'
import { buildTimeline } from './dayTimeline'

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute)
const ts = (day: number, hour: number, minute = 0) => Timestamp.fromDate(at(day, hour, minute))
const base = { comment: '', createdAt: ts(21, 0), updatedAt: ts(21, 0) }

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

const bottle = (id: string, day: number, hour: number): BabyEvent => ({
  ...base,
  id,
  type: 'bottle',
  occurredAt: ts(day, hour),
  details: { consumedMl: 90, milkType: 'formula' },
})

const feeding = (id: string, status: 'running' | 'paused' | 'done'): BabyEvent => ({
  ...base,
  id,
  type: 'breastfeeding',
  occurredAt: ts(21, 9),
  startAt: ts(21, 9),
  endAt: status === 'done' ? ts(21, 9, 40) : null,
  status,
  details: {
    segments: [
      { side: 'left', startAt: ts(21, 9), endAt: ts(21, 9, 12) },
      // Pause de 9 h 12 à 9 h 30, puis sein droit
      { side: 'right', startAt: ts(21, 9, 30), endAt: status === 'done' ? ts(21, 9, 40) : null },
    ],
    estimatedLeftMl: null,
    estimatedRightMl: null,
  },
})

const diaper: BabyEvent = { ...base, id: 'd1', type: 'diaper', occurredAt: ts(21, 8), details: { kind: 'wet' } }

// Jours affichés : 20 et 21 octobre (fin exclue = 22 octobre à minuit)
const from = at(20, 0)
const to = at(22, 0)
const now = at(21, 23)

describe('frise de 24 h de l’historique', () => {
  it('un jour par ligne, du plus récent au plus ancien', () => {
    expect(buildTimeline([], from, to, now).map((day) => day.key)).toEqual(['2026-10-21', '2026-10-20'])
  })

  it('un sommeil qui traverse minuit est coupé sur les deux jours, avec ses vraies heures', () => {
    const [day21, day20] = buildTimeline([sleep('s1', ts(20, 22), ts(21, 6))], from, to, now)
    expect(day20.sleep).toHaveLength(1)
    expect(day20.sleep[0].from).toBeCloseTo(22 / 24)
    expect(day20.sleep[0].to).toBe(1)
    expect(day21.sleep[0].from).toBe(0)
    expect(day21.sleep[0].to).toBeCloseTo(6 / 24)
    expect(day21.sleep[0].start).toEqual(at(20, 22))
  })

  it('un sommeil en cours s’arrête à « maintenant » et reste marqué en cours', () => {
    const [day21] = buildTimeline([sleep('s1', ts(21, 21), null)], from, to, now)
    expect(day21.sleep[0].ongoing).toBe(true)
    expect(day21.sleep[0].to).toBeCloseTo(23 / 24)
  })

  it('tétée : un trait par segment, sans la pause', () => {
    const [day21] = buildTimeline([feeding('f1', 'done')], from, to, now)
    expect(day21.milk.map((mark) => [mark.from * 24 * 60, mark.to * 24 * 60].map(Math.round))).toEqual([
      [540, 552],
      [570, 580],
    ])
  })

  it('tétée en cours : le segment ouvert va jusqu’à maintenant ; en pause, il n’y a rien d’ouvert', () => {
    expect(buildTimeline([feeding('f1', 'running')], from, to, now)[0].milk[1].ongoing).toBe(true)
    expect(buildTimeline([feeding('f1', 'paused')], from, to, now)[0].milk).toHaveLength(1)
  })

  it('biberon = un instant sur la ligne du lait ; les couches ne sont pas dessinées', () => {
    const [day21, day20] = buildTimeline([bottle('b1', 21, 14), diaper], from, to, now)
    expect(day21.milk).toHaveLength(1)
    expect(day21.milk[0].from).toBeCloseTo(14 / 24)
    expect(day21.milk[0].to).toBeCloseTo(14 / 24)
    expect(day20.milk).toHaveLength(0)
    expect(day21.sleep).toHaveLength(0)
  })
})
