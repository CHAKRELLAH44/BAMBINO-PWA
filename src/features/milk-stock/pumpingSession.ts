import type { PumpingSession, PumpingSide } from '../../types/event'

// Chronomètre de tirage (§5, §8.1) : on ne compte jamais le temps, on enregistre des horodatages.
// Fonctions pures : elles reçoivent « maintenant » en paramètre (même principe que la tétée).

export const startPumping = (side: PumpingSide, now: Date): PumpingSession => ({
  side,
  status: 'running',
  segments: [{ startAt: now, endAt: null }],
})

/** Pause (ou fin) : ferme le segment ouvert ; une horloge qui recule ne donne jamais de durée négative */
export function pausePumping(session: PumpingSession, now: Date): PumpingSession {
  if (session.status !== 'running') return session
  return {
    ...session,
    status: 'paused',
    segments: session.segments.map((segment) =>
      segment.endAt === null ? { ...segment, endAt: now < segment.startAt ? segment.startAt : now } : segment,
    ),
  }
}

export function resumePumping(session: PumpingSession, now: Date): PumpingSession {
  if (session.status !== 'paused') return session
  return { ...session, status: 'running', segments: [...session.segments, { startAt: now, endAt: null }] }
}

/** Durée tirée en millisecondes, pauses exclues ; le segment ouvert compte jusqu'à « maintenant » */
export function pumpingDurationMs(session: PumpingSession, now: Date) {
  return session.segments.reduce(
    (total, segment) => total + Math.max(0, (segment.endAt ?? now).getTime() - segment.startAt.getTime()),
    0,
  )
}

/** Durée en minutes pour le tirage enregistré : au moins 1 dès qu'il y a eu du temps */
export function pumpingMinutes(session: PumpingSession, now: Date) {
  const ms = pumpingDurationMs(session, now)
  return ms === 0 ? 0 : Math.max(1, Math.round(ms / 60_000))
}
