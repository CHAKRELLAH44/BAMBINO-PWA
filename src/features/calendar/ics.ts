import { addDays, addMinutes, endOfDay, startOfDay } from 'date-fns'
import type { Appointment } from '../../types/appointment'
import { ALL_DAYS, type Reminder } from '../../types/reminder'

// Ajout au calendrier du téléphone (fichier .ics, RFC 5545) : c'est l'agenda du téléphone qui prévient
// la maman, sans serveur ni notification Bambino (budget 0 DH §33 ; les notifications restent la phase P2, §20).

const CRLF = '\r\n'
/** Jours ISO 1 (lundi) … 7 (dimanche) */
const DAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

export interface CalendarEvent {
  uid: string
  summary: string
  description: string
  location: string
  start: Date
  /** Heure « flottante » : 08:00 reste 08:00 dans le fuseau du téléphone (médicament). Sinon heure exacte (rendez-vous). */
  floating: boolean
  durationMinutes: number
  rrule: string | null
  /** Alertes de l'agenda, en minutes avant le début (0 = à l'heure) */
  alarms: number[]
}

const pad = (value: number) => String(value).padStart(2, '0')

export const formatUtc = (date: Date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(
    date.getUTCMinutes(),
  )}${pad(date.getUTCSeconds())}Z`

export const formatLocal = (date: Date) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(
    date.getMinutes(),
  )}${pad(date.getSeconds())}`

export const escapeText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Lignes de 75 octets au plus, sans couper une lettre (une lettre arabe = 2 octets) */
export function foldLine(line: string): string {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = ''
  let size = 0
  for (const character of line) {
    const bytes = encoder.encode(character).length
    // Les lignes de suite commencent par une espace, qui compte
    const limit = parts.length === 0 ? 75 : 74
    if (size + bytes > limit) {
      parts.push(current)
      current = ''
      size = 0
    }
    current += character
    size += bytes
  }
  parts.push(current)
  return parts.join(`${CRLF} `)
}

const trigger = (minutesBefore: number) => {
  if (minutesBefore === 0) return 'PT0M'
  if (minutesBefore % 1440 === 0) return `-P${minutesBefore / 1440}D`
  if (minutesBefore % 60 === 0) return `-PT${minutesBefore / 60}H`
  return `-PT${minutesBefore}M`
}

function eventLines(event: CalendarEvent, now: Date): string[] {
  const time = event.floating ? formatLocal : formatUtc
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${time(event.start)}`,
    `DTEND:${time(addMinutes(event.start, event.durationMinutes))}`,
    `SUMMARY:${escapeText(event.summary)}`,
  ]
  if (event.rrule) lines.push(`RRULE:${event.rrule}`)
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`)
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`)
  for (const minutes of event.alarms) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(event.summary)}`, `TRIGGER:${trigger(minutes)}`, 'END:VALARM')
  }
  lines.push('END:VEVENT')
  return lines
}

/** Fichier complet, prêt à être ouvert par l'agenda du téléphone */
export function buildCalendar(events: CalendarEvent[], now: Date): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bambino//Suivi bebe//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flatMap((event) => eventLines(event, now)),
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join(CRLF) + CRLF
}

/** Rendez-vous : à l'heure exacte, 1 h, alerte la veille et 1 h avant */
export function appointmentEvent(appointment: Appointment, summary: string): CalendarEvent {
  return {
    uid: `appointment-${appointment.id}@bambino`,
    summary,
    description: [appointment.contact, appointment.comment].filter(Boolean).join('\n'),
    location: appointment.location ?? '',
    start: appointment.scheduledAt.toDate(),
    floating: false,
    durationMinutes: 60,
    rrule: null,
    alarms: [1440, 60],
  }
}

/** Pourquoi un rappel ne peut pas aller dans l'agenda (null = possible) */
export function reminderCalendarIssue(reminder: Reminder, today: Date): 'interval' | 'ended' | null {
  if (reminder.scheduleType !== 'fixedTimes' || reminder.scheduledTimes.length === 0) return 'interval'
  if (reminder.endDate && reminder.endDate.toDate() < startOfDay(today)) return 'ended'
  return null
}

/** Premier jour prévu à partir de `from` (le premier jour de la répétition doit en faire partie) */
function firstPlannedDay(from: Date, daysOfWeek: number[]) {
  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDays(from, offset)
    const isoDay = ((day.getDay() + 6) % 7) + 1
    if (daysOfWeek.includes(isoDay)) return day
  }
  return from
}

/**
 * Rappel ou traitement à heures fixes : un événement répété par heure (« 08:00 » et « 20:00 » = 2 événements),
 * tous les jours ou certains jours, jusqu'à la date de fin. Heure flottante, alerte à l'heure prévue.
 */
export function reminderEvents(reminder: Reminder, summary: string, today: Date): CalendarEvent[] {
  if (reminderCalendarIssue(reminder, today)) return []
  const days = reminder.daysOfWeek.length > 0 ? reminder.daysOfWeek : ALL_DAYS
  const from = startOfDay(reminder.startDate ? reminder.startDate.toDate() : today)
  const firstDay = firstPlannedDay(from, days)
  const frequency =
    days.length === 7 ? 'FREQ=DAILY' : `FREQ=WEEKLY;BYDAY=${[...days].sort().map((day) => DAY_CODES[day - 1]).join(',')}`
  const until = reminder.endDate ? `;UNTIL=${formatLocal(endOfDay(reminder.endDate.toDate()))}` : ''

  return [...reminder.scheduledTimes].sort().map((time) => {
    const [hours, minutes] = time.split(':').map(Number)
    const start = new Date(firstDay)
    start.setHours(hours, minutes, 0, 0)
    return {
      uid: `reminder-${reminder.id}-${time.replace(':', '')}@bambino`,
      summary,
      description: reminder.description,
      location: '',
      start,
      floating: true,
      durationMinutes: 15,
      rrule: `${frequency}${until}`,
      alarms: [0],
    }
  })
}
