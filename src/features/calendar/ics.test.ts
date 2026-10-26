import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import type { Appointment } from '../../types/appointment'
import type { Reminder } from '../../types/reminder'
import { fileSlug } from '../../utils/download'
import { appointmentEvent, buildCalendar, escapeText, foldLine, reminderCalendarIssue, reminderEvents } from './ics'

const now = new Date(Date.UTC(2026, 9, 22, 8, 0, 0))
const today = new Date(2026, 9, 22, 9, 30) // jeudi
const stamp = Timestamp.fromDate(today)

const appointment: Appointment = {
  id: 'a1',
  concerne: 'mother',
  title: 'Pesée, contrôle; suivi',
  scheduledAt: Timestamp.fromDate(new Date(Date.UTC(2026, 9, 30, 14, 30))),
  location: 'Cabinet (test)',
  contact: 'Dr Test',
  comment: 'Apporter le carnet',
  status: 'planned',
  createdAt: stamp,
  updatedAt: stamp,
}

const reminder = (extra: Partial<Reminder> = {}): Reminder => ({
  id: 'r1',
  serviceId: 'medication',
  babyId: null,
  title: 'Fer (test)',
  description: 'Après le repas',
  scheduleType: 'fixedTimes',
  scheduledTimes: ['20:00', '08:00'],
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  intervalMinutes: null,
  maxRepeats: 0,
  repeatEveryMinutes: null,
  startDate: null,
  endDate: null,
  timezone: 'Africa/Casablanca',
  enabled: true,
  createdAt: stamp,
  updatedAt: stamp,
  ...extra,
})

const lines = (ics: string) => ics.split('\r\n')

describe('fichier de calendrier (.ics)', () => {
  it('rendez-vous : heure exacte en UTC, 1 h, alertes la veille et 1 h avant, textes échappés', () => {
    const ics = buildCalendar([appointmentEvent(appointment, appointment.title)], now)
    const content = lines(ics)
    expect(content[0]).toBe('BEGIN:VCALENDAR')
    expect(content).toContain('DTSTART:20261030T143000Z')
    expect(content).toContain('DTEND:20261030T153000Z')
    expect(content).toContain('SUMMARY:Pesée\\, contrôle\\; suivi')
    expect(content).toContain('DESCRIPTION:Dr Test\\nApporter le carnet')
    expect(content).toContain('TRIGGER:-P1D')
    expect(content).toContain('TRIGGER:-PT1H')
    expect(content).toContain('UID:appointment-a1@bambino')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('traitement tous les jours : un événement par heure, heure locale, répété chaque jour', () => {
    const events = reminderEvents(reminder(), 'Fer (test)', today)
    expect(events.map((event) => event.uid)).toEqual(['reminder-r1-0800@bambino', 'reminder-r1-2000@bambino'])
    const content = lines(buildCalendar(events, now))
    expect(content).toContain('DTSTART:20261022T080000')
    expect(content).toContain('RRULE:FREQ=DAILY')
    expect(content).toContain('TRIGGER:PT0M')
  })

  it('certains jours et date de fin : répétition hebdomadaire, premier jour prévu, fin incluse', () => {
    const events = reminderEvents(
      reminder({
        scheduledTimes: ['09:00'],
        daysOfWeek: [1, 3],
        endDate: Timestamp.fromDate(new Date(2026, 10, 15)),
      }),
      'Fer (test)',
      today,
    )
    expect(events[0].rrule).toBe('FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261115T235959')
    // Jeudi 22 → premier lundi ou mercredi : lundi 26
    expect(events[0].start).toEqual(new Date(2026, 9, 26, 9, 0))
  })

  it('rappel à intervalle ou terminé : pas d’export (rien d’inventé)', () => {
    expect(reminderCalendarIssue(reminder({ scheduleType: 'interval', scheduledTimes: [], intervalMinutes: 180 }), today)).toBe('interval')
    expect(reminderCalendarIssue(reminder({ endDate: Timestamp.fromDate(new Date(2026, 9, 1)) }), today)).toBe('ended')
    expect(reminderEvents(reminder({ endDate: Timestamp.fromDate(new Date(2026, 9, 1)) }), 'x', today)).toEqual([])
    expect(reminderCalendarIssue(reminder(), today)).toBeNull()
  })

  it('lignes coupées à 75 octets sans couper une lettre arabe ; échappement', () => {
    const folded = foldLine(`SUMMARY:${'موعد الطبيب '.repeat(10)}`)
    for (const part of folded.split('\r\n')) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75)
    expect(folded.split('\r\n ').join('')).toBe(`SUMMARY:${'موعد الطبيب '.repeat(10)}`)
    expect(escapeText('a\\b')).toBe('a\\\\b')
    expect(fileSlug('Pesée bébé', 'rendez-vous')).toBe('pesee-bebe')
    expect(fileSlug('موعد', 'rendez-vous')).toBe('rendez-vous')
  })
})
