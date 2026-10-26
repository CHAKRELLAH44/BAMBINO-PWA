import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import type { Appointment } from '../types/appointment'
import type { Reminder } from '../types/reminder'
import { todayPlans } from './todayPlans'

// Jeudi 22 octobre 2026
const day = new Date(2026, 9, 22, 9, 0)
const ts = (date: number, hour: number) => Timestamp.fromDate(new Date(2026, 9, date, hour, 0))
const base = { comment: '', createdAt: ts(20, 0), updatedAt: ts(20, 0) }

const appointment = (id: string, date: number, hour: number, status: Appointment['status'] = 'planned'): Appointment => ({
  ...base,
  id,
  concerne: 'mother',
  title: `Rendez-vous ${id}`,
  scheduledAt: ts(date, hour),
  location: null,
  contact: null,
  status,
})

const reminder = (id: string, extra: Partial<Reminder> = {}): Reminder => ({
  id,
  serviceId: 'medication',
  babyId: null,
  title: `Traitement ${id}`,
  description: '',
  scheduleType: 'fixedTimes',
  scheduledTimes: ['20:00', '08:00'],
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  intervalMinutes: null,
  maxRepeats: 0,
  repeatEveryMinutes: null,
  startDate: null,
  endDate: null,
  timezone: 'Africa/Casablanca',
  enabled: false,
  createdAt: ts(20, 0),
  updatedAt: ts(20, 0),
  ...extra,
})

describe('planifications épinglées sur l’accueil (jour J)', () => {
  it('seulement les rendez-vous prévus aujourd’hui', () => {
    const plans = todayPlans(
      [appointment('a1', 22, 10), appointment('a2', 23, 10), appointment('a3', 22, 15, 'cancelled')],
      [],
      day,
    )
    expect(plans.map((plan) => plan.id)).toEqual(['appointment:a1'])
  })

  it('traitements et rappels selon les jours et la période, triés par heure', () => {
    const plans = todayPlans(
      [appointment('a1', 22, 10)],
      [
        reminder('r1'),
        reminder('r2', { daysOfWeek: [1] }), // seulement le lundi
        reminder('r3', { endDate: ts(21, 0) }), // terminé hier
        reminder('r4', { scheduleType: 'interval', scheduledTimes: [], intervalMinutes: 180 }),
        reminder('r5', { serviceId: 'custom', scheduledTimes: ['09:30'] }),
      ],
      day,
    )
    expect(plans.map((plan) => [plan.id, plan.time])).toEqual([
      ['reminder:r1', '08:00'],
      ['reminder:r5', '09:30'],
      ['appointment:a1', '10:00'],
      ['reminder:r4', null],
    ])
  })

  it('une planification masquée disparaît de l’accueil seulement', () => {
    const appointments = [appointment('a1', 22, 10)]
    expect(todayPlans(appointments, [reminder('r1')], day, ['reminder:r1']).map((plan) => plan.id)).toEqual([
      'appointment:a1',
    ])
  })
})
