import { describe, expect, it } from 'vitest'
import { isPlannedOn, isTimeOfDay, normalizeTimes } from './schedule'

const everyDay = [1, 2, 3, 4, 5, 6, 7]
// 21 octobre 2026 = mercredi (3)
const wednesday = new Date(2026, 9, 21, 15, 0)

describe('isPlannedOn', () => {
  it('tous les jours, sans période', () => {
    expect(isPlannedOn({ daysOfWeek: everyDay, startDate: null, endDate: null }, wednesday)).toBe(true)
  })

  it('respecte les jours de la semaine', () => {
    expect(isPlannedOn({ daysOfWeek: [1, 3, 5], startDate: null, endDate: null }, wednesday)).toBe(true)
    expect(isPlannedOn({ daysOfWeek: [6, 7], startDate: null, endDate: null }, wednesday)).toBe(false)
  })

  it('respecte les dates de début et de fin, incluses', () => {
    const schedule = { daysOfWeek: everyDay, startDate: new Date(2026, 9, 21), endDate: new Date(2026, 9, 25) }
    expect(isPlannedOn(schedule, wednesday)).toBe(true)
    expect(isPlannedOn(schedule, new Date(2026, 9, 25, 23, 0))).toBe(true)
    expect(isPlannedOn(schedule, new Date(2026, 9, 20))).toBe(false)
    expect(isPlannedOn(schedule, new Date(2026, 9, 26))).toBe(false)
  })
})

describe('heures', () => {
  it('reconnaît « HH:mm »', () => {
    expect(isTimeOfDay('08:00')).toBe(true)
    expect(isTimeOfDay('23:59')).toBe(true)
    expect(isTimeOfDay('24:00')).toBe(false)
    expect(isTimeOfDay('8h')).toBe(false)
  })

  it('trie et retire les doublons', () => {
    expect(normalizeTimes(['20:00', '08:00', '20:00', 'x'])).toEqual(['08:00', '20:00'])
  })
})
