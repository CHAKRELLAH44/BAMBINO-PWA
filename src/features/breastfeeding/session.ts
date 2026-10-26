import type { BreastSide, FeedingSession, SessionSegment } from '../../types/event'

// Cahier §5 et §7.1 : on ne compte jamais le temps, on enregistre des horodatages.
// Toutes les fonctions sont pures : elles reçoivent « maintenant » en paramètre.

export const otherSide = (side: BreastSide): BreastSide => (side === 'left' ? 'right' : 'left')

export const openSegment = (session: FeedingSession) =>
  session.segments.find((segment) => segment.endAt === null) ?? null

/** Côté du dernier segment (celui en cours ou le dernier terminé) */
export const currentSide = (session: FeedingSession) => session.segments.at(-1)?.side ?? null

/** Ferme le segment ouvert ; une horloge qui recule ne donne jamais de durée négative */
const closeOpenSegment = (segments: SessionSegment[], now: Date) =>
  segments.map((segment) =>
    segment.endAt === null
      ? { ...segment, endAt: now < segment.startAt ? segment.startAt : now }
      : segment,
  )

/** Commencer : ouvre un segment sur le sein choisi */
export const startSession = (side: BreastSide, now: Date): FeedingSession => ({
  status: 'running',
  segments: [{ side, startAt: now, endAt: null }],
})

/** Pause : ferme le segment ouvert */
export function pauseSession(session: FeedingSession, now: Date): FeedingSession {
  if (session.status !== 'running') return session
  return { status: 'paused', segments: closeOpenSegment(session.segments, now) }
}

/** Reprendre : ouvre un segment sur le même sein */
export function resumeSession(session: FeedingSession, now: Date): FeedingSession {
  const side = currentSide(session)
  if (session.status !== 'paused' || !side) return session
  return { status: 'running', segments: [...session.segments, { side, startAt: now, endAt: null }] }
}

/** Changer de sein : ferme le segment ouvert et en ouvre un sur l'autre sein */
export function switchSide(session: FeedingSession, now: Date): FeedingSession {
  const side = currentSide(session)
  if (session.status === 'done' || !side) return session
  return {
    status: 'running',
    segments: [...closeOpenSegment(session.segments, now), { side: otherSide(side), startAt: now, endAt: null }],
  }
}

/** Terminer : ferme le segment ouvert */
export function finishSession(session: FeedingSession, now: Date): FeedingSession {
  if (session.status === 'done') return session
  return { status: 'done', segments: closeOpenSegment(session.segments, now) }
}

export interface SideDurations {
  left: number
  right: number
  total: number
}

/** Durées en millisecondes : un segment ouvert compte jusqu'à « maintenant » */
export function sessionDurations(session: FeedingSession, now: Date): SideDurations {
  const durations = { left: 0, right: 0, total: 0 }
  for (const segment of session.segments) {
    const end = segment.endAt ?? now
    const ms = Math.max(0, end.getTime() - segment.startAt.getTime())
    durations[segment.side] += ms
    durations.total += ms
  }
  return durations
}

export type SegmentsError = 'empty' | 'missingEnd' | 'endBeforeStart' | 'overlap'

/**
 * Vérifie une saisie manuelle (§7.3) : segments terminés, dans l'ordre, sans chevauchement.
 * Un segment de durée nulle est accepté (deux changements de sein très rapides).
 */
export function validateSegments(segments: SessionSegment[]): SegmentsError | null {
  if (segments.length === 0) return 'empty'
  for (let i = 0; i < segments.length; i++) {
    const { startAt, endAt } = segments[i]
    if (!endAt) return 'missingEnd'
    if (Number.isNaN(startAt.getTime()) || endAt < startAt) return 'endBeforeStart'
    const previousEnd = i > 0 ? segments[i - 1].endAt : null
    if (previousEnd && startAt < previousEnd) return 'overlap'
  }
  return null
}
