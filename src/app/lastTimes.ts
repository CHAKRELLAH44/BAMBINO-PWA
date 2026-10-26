import { isOngoing, type BabyEvent, type BabyEventType, type BreastSide } from '../types/event'

// « Dernières fois » de l'accueil : simple rappel factuel de ce qui a été noté, sans conseil (§16).
// Une séance en cours a déjà sa propre carte : on ne garde ici que les séances terminées.

export interface LastTime {
  type: BabyEventType
  event: BabyEvent
  /** Début d'une tétée, réveil après un sommeil, heure notée pour le reste */
  at: Date
}

const ORDER: BabyEventType[] = ['breastfeeding', 'bottle', 'sleep', 'diaper', 'milkPumping']

const momentOf = (event: BabyEvent): Date => {
  if (event.type === 'breastfeeding') return event.startAt.toDate()
  if (event.type === 'sleep' && event.endAt) return event.endAt.toDate()
  return event.occurredAt.toDate()
}

/** La plus récente de chaque activité, dans un ordre fixe (tétée, biberon, sommeil, couche, tirage) */
export function lastTimes(events: BabyEvent[]): LastTime[] {
  const latest = new Map<BabyEventType, LastTime>()
  for (const event of events) {
    if (isOngoing(event)) continue
    const at = momentOf(event)
    const current = latest.get(event.type)
    if (!current || at > current.at) latest.set(event.type, { type: event.type, event, at })
  }
  return ORDER.flatMap((type) => latest.get(type) ?? [])
}

/** Sein du dernier segment d'une tétée (« dernier sein : droit ») */
export function lastFeedingSide(event: BabyEvent): BreastSide | null {
  if (event.type !== 'breastfeeding') return null
  return event.details.segments.at(-1)?.side ?? null
}
