import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import type { PersonalEvent } from '../../types/personal'
import type { Reminder } from '../../types/reminder'
import { dailyProgress, nextTime, spreadTimes, timesPerDay } from './dailyIntakes'

const at = (day: number, hour: number) => Timestamp.fromDate(new Date(2026, 9, day, hour))
const day = new Date(2026, 9, 22, 12)

const plan = (extra: Partial<Reminder> = {}): Reminder => ({
  id: 'fer',
  serviceId: 'medication',
  babyId: null,
  title: 'Fer (test)',
  description: '',
  scheduleType: 'fixedTimes',
  scheduledTimes: ['08:00'],
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  intervalMinutes: null,
  maxRepeats: 0,
  repeatEveryMinutes: null,
  startDate: null,
  endDate: null,
  timezone: 'Africa/Casablanca',
  enabled: false,
  createdAt: at(1, 0),
  updatedAt: at(1, 0),
  ...extra,
})

const intake = (id: string, reminderId: string | null, when: Timestamp): PersonalEvent => ({
  id,
  type: 'motherMedication',
  occurredAt: when,
  details: { reminderId, name: 'Fer (test)' },
  comment: '',
  createdAt: when,
  updatedAt: when,
})

describe('prises du jour d’un traitement', () => {
  it('une fois par jour : une prise suffit, c’est fait', () => {
    const progress = dailyProgress(plan(), [intake('a', 'fer', at(22, 8))], day)
    expect(progress).toMatchObject({ taken: 1, total: 1, done: true })
    expect(progress.lastIntake?.id).toBe('a')
  })

  it('deux fois par jour : seules les prises du jour et de ce traitement comptent', () => {
    const events = [
      intake('hier', 'fer', at(21, 20)),
      intake('autre', 'vitamine', at(22, 9)),
      intake('ponctuelle', null, at(22, 10)),
      intake('matin', 'fer', at(22, 8)),
    ]
    const progress = dailyProgress(plan({ scheduledTimes: ['08:00', '20:00'] }), events, day)
    expect(progress).toMatchObject({ taken: 1, total: 2, done: false })
  })

  it('dernière prise = la plus récente du jour ; ancien traitement à intervalle : pas de total', () => {
    const events = [intake('matin', 'fer', at(22, 8)), intake('soir', 'fer', at(22, 20))]
    expect(dailyProgress(plan({ scheduledTimes: ['08:00', '20:00'] }), events, day).lastIntake?.id).toBe('soir')
    const interval = plan({ scheduleType: 'interval', scheduledTimes: [], intervalMinutes: 480 })
    expect(timesPerDay(interval)).toBeNull()
    expect(dailyProgress(interval, events, day)).toMatchObject({ taken: 2, total: null, done: false })
  })

  it('heures proposées réparties de 08:00 à 20:00, toutes différentes', () => {
    expect(spreadTimes(1)).toEqual(['08:00'])
    expect(spreadTimes(2)).toEqual(['08:00', '20:00'])
    expect(spreadTimes(3)).toEqual(['08:00', '14:00', '20:00'])
    for (let count = 1; count <= 12; count += 1) expect(new Set(spreadTimes(count)).size).toBe(count)
  })

  it('prise ajoutée à la main : 2 h après la dernière, jamais en double', () => {
    expect(nextTime(['09:15'])).toBe('11:15')
    expect(nextTime(['23:00'])).toBe('01:00')
    expect(nextTime(['08:00', '10:00', ''])).toBe('12:00')
    expect(nextTime(['12:00', '10:00'])).toBe('12:30')
  })
})
