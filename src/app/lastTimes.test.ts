import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import type { BabyEvent } from '../types/event'
import { lastFeedingSide, lastTimes } from './lastTimes'

const ts = (hour: number, minute = 0) => Timestamp.fromDate(new Date(2026, 9, 22, hour, minute))
const base = { comment: '', createdAt: ts(0), updatedAt: ts(0) }

const bottle = (id: string, hour: number): BabyEvent => ({
  ...base,
  id,
  type: 'bottle',
  occurredAt: ts(hour),
  details: { consumedMl: 90, milkType: 'formula' },
})

const feeding = (id: string, hour: number, done: boolean, lastSide: 'left' | 'right' = 'right'): BabyEvent => ({
  ...base,
  id,
  type: 'breastfeeding',
  occurredAt: ts(hour),
  startAt: ts(hour),
  endAt: done ? ts(hour, 20) : null,
  status: done ? 'done' : 'running',
  details: {
    segments: [
      { side: lastSide === 'right' ? 'left' : 'right', startAt: ts(hour), endAt: ts(hour, 10) },
      { side: lastSide, startAt: ts(hour, 10), endAt: done ? ts(hour, 20) : null },
    ],
    estimatedLeftMl: null,
    estimatedRightMl: null,
  },
})

const sleep = (id: string, start: number, end: number | null): BabyEvent => ({
  ...base,
  id,
  type: 'sleep',
  occurredAt: ts(start),
  startAt: ts(start),
  endAt: end === null ? null : ts(end),
  status: end === null ? 'running' : 'done',
  details: {},
})

describe('dernières fois (accueil)', () => {
  it('garde la plus récente de chaque activité, dans un ordre fixe', () => {
    const result = lastTimes([bottle('b1', 8), feeding('f1', 6, true), bottle('b2', 11), feeding('f2', 9, true, 'left')])
    expect(result.map((item) => item.event.id)).toEqual(['f2', 'b2'])
    expect(result[0].at).toEqual(ts(9).toDate())
  })

  it('une séance en cours est ignorée (elle a sa propre carte) : on montre la précédente terminée', () => {
    const result = lastTimes([feeding('en-cours', 12, false), feeding('finie', 9, true), sleep('dort', 13, null)])
    expect(result.map((item) => item.event.id)).toEqual(['finie'])
  })

  it('sommeil : compté depuis le réveil, pas depuis l’endormissement', () => {
    const [item] = lastTimes([sleep('nuit', 1, 6), sleep('sieste', 4, 5)])
    expect(item.event.id).toBe('nuit')
    expect(item.at).toEqual(ts(6).toDate())
  })

  it('dernier sein = sein du dernier segment', () => {
    expect(lastFeedingSide(feeding('f', 9, true, 'right'))).toBe('right')
    expect(lastFeedingSide(feeding('f', 9, true, 'left'))).toBe('left')
    expect(lastFeedingSide(bottle('b', 9))).toBeNull()
    expect(lastTimes([])).toEqual([])
  })
})
