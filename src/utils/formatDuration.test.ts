import { describe, expect, it } from 'vitest'
import { durationParts, formatClock } from './formatDuration'

describe('formatClock', () => {
  it('affiche mm:ss puis h:mm:ss', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(125_000)).toBe('02:05')
    expect(formatClock(3_725_000)).toBe('1:02:05')
  })

  it('ne descend jamais sous zéro', () => {
    expect(formatClock(-5_000)).toBe('00:00')
  })
})

describe('durationParts', () => {
  it('arrondit à la minute', () => {
    expect(durationParts(8 * 3_600_000 + 40 * 60_000)).toEqual({ hours: 8, minutes: 40 })
    expect(durationParts(89_000)).toEqual({ hours: 0, minutes: 1 })
  })
})
