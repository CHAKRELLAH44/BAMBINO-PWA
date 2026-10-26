import { addDays, startOfDay } from 'date-fns'
import type { BabyEvent, BreastSide } from '../../types/event'
import { dayKey } from '../../utils/timeRanges'

export type TimelineKind = 'sleep' | 'breastfeeding' | 'bottle'

/** Une marque sur la frise d'un jour */
export interface TimelineMark {
  /** Unique sur la frise : id de l'événement (+ numéro du segment de tétée) */
  key: string
  kind: TimelineKind
  event: BabyEvent
  /** Début et fin réels, non coupés à minuit ; un biberon est un instant (début = fin) */
  start: Date
  end: Date
  /** Séance en cours : la fin affichée est « maintenant », jamais une fin définitive */
  ongoing: boolean
  /** Sein d'un segment de tétée */
  side?: BreastSide
  /** Position dans le jour : 0 = minuit, 1 = minuit suivant */
  from: number
  to: number
}

export interface TimelineDay {
  key: string
  date: Date
  /** Ligne du haut : périodes de sommeil */
  sleep: TimelineMark[]
  /** Ligne du bas : tétées (segments) et biberons (instants) */
  milk: TimelineMark[]
}

type Span = Omit<TimelineMark, 'from' | 'to'>

/** Au plus un an de frises (une période personnalisée peut être très longue) */
const MAX_DAYS = 366

function spansOf(event: BabyEvent, now: Date): Span[] {
  switch (event.type) {
    case 'sleep':
      return [
        {
          key: event.id,
          kind: 'sleep',
          event,
          start: event.startAt.toDate(),
          end: event.endAt?.toDate() ?? now,
          ongoing: !event.endAt,
        },
      ]
    case 'breastfeeding':
      // Chaque segment est une tétée réelle : les pauses ne sont pas dessinées
      return event.details.segments.flatMap((segment, index) => {
        const end = segment.endAt?.toDate() ?? (event.status === 'running' ? now : null)
        if (!end) return []
        const start = segment.startAt.toDate()
        return [
          {
            key: `${event.id}/${index}`,
            kind: 'breastfeeding' as const,
            event,
            start,
            end,
            ongoing: !segment.endAt,
            side: segment.side,
          },
        ]
      })
    case 'bottle': {
      const at = event.occurredAt.toDate()
      return [{ key: event.id, kind: 'bottle', event, start: at, end: at, ongoing: false }]
    }
    default:
      return []
  }
}

/**
 * Frise de 24 h par jour, du plus récent au plus ancien, pour les jours de [from, to) :
 * sommeils, tétées et biberons. Le journal ne stocke rien : tout vient des événements (§17).
 * Une période qui traverse minuit apparaît sur les deux jours (§9).
 */
export function buildTimeline(events: BabyEvent[], from: Date, to: Date, now: Date): TimelineDay[] {
  const spans = events.flatMap((event) => spansOf(event, now))
  const firstDay = startOfDay(from)
  const days: TimelineDay[] = []

  for (let day = startOfDay(addDays(to, -1)); day >= firstDay && days.length < MAX_DAYS; day = addDays(day, -1)) {
    const dayStart = day
    const dayEnd = addDays(day, 1)
    // Longueur réelle du jour (23 h ou 25 h les jours de changement d'heure)
    const position = (date: Date) => (date.getTime() - dayStart.getTime()) / (dayEnd.getTime() - dayStart.getTime())
    const marks = spans
      .filter((span) =>
        span.kind === 'bottle'
          ? span.start >= dayStart && span.start < dayEnd
          : span.start < dayEnd && span.end > dayStart,
      )
      .map((span) => ({ ...span, from: Math.max(0, position(span.start)), to: Math.min(1, position(span.end)) }))
      .sort((a, b) => a.from - b.from)
    days.push({
      key: dayKey(day),
      date: day,
      sleep: marks.filter((mark) => mark.kind === 'sleep'),
      milk: marks.filter((mark) => mark.kind !== 'sleep'),
    })
  }
  return days
}
