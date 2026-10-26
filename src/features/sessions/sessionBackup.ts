import type { BreastSide, BreastfeedingStatus, OngoingPumping, PumpingSide } from '../../types/event'
import { NO_SESSIONS, type OngoingFeeding, type OngoingSessions, type OngoingSleep } from './ongoing'

// Copie de secours des séances en cours dans le localStorage (cahier §5) :
// si Firestore n'a pas encore répondu (démarrage, hors ligne), la séance reste affichée.

type SessionKind = 'feeding' | 'sleep' | 'pumping'

interface StoredFeeding {
  eventId: string
  status: BreastfeedingStatus
  segments: { side: BreastSide; startAt: string; endAt: string | null }[]
}

interface StoredSleep {
  eventId: string
  startAt: string
}

interface StoredPumping {
  sessionId: string
  side: PumpingSide
  status: 'running' | 'paused'
  segments: { startAt: string; endAt: string | null }[]
}

const storageKey = (userId: string, babyId: string, kind: SessionKind) =>
  `bambino.session.${userId}.${babyId}.${kind}`

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // stockage indisponible : Firestore reste la référence
  }
}

export function saveFeedingBackup(userId: string, babyId: string, feeding: OngoingFeeding | null) {
  const stored: StoredFeeding | null =
    feeding && feeding.session.status !== 'done'
      ? {
          eventId: feeding.eventId,
          status: feeding.session.status,
          segments: feeding.session.segments.map((segment) => ({
            side: segment.side,
            startAt: segment.startAt.toISOString(),
            endAt: segment.endAt?.toISOString() ?? null,
          })),
        }
      : null
  write(storageKey(userId, babyId, 'feeding'), stored)
}

export function saveSleepBackup(userId: string, babyId: string, sleep: OngoingSleep | null) {
  const stored: StoredSleep | null = sleep ? { eventId: sleep.eventId, startAt: sleep.startAt.toISOString() } : null
  write(storageKey(userId, babyId, 'sleep'), stored)
}

export function readSessionBackups(userId: string, babyId: string): OngoingSessions {
  const feeding = read<StoredFeeding>(storageKey(userId, babyId, 'feeding'))
  const sleep = read<StoredSleep>(storageKey(userId, babyId, 'sleep'))
  if (!feeding && !sleep) return NO_SESSIONS
  return {
    feeding: feeding
      ? {
          eventId: feeding.eventId,
          session: {
            status: feeding.status,
            segments: feeding.segments.map((segment) => ({
              side: segment.side,
              startAt: new Date(segment.startAt),
              endAt: segment.endAt ? new Date(segment.endAt) : null,
            })),
          },
        }
      : null,
    sleep: sleep ? { eventId: sleep.eventId, startAt: new Date(sleep.startAt) } : null,
  }
}

/** Aligne la copie de secours sur la réponse confirmée par le serveur */
export function syncSessionBackups(userId: string, babyId: string, sessions: OngoingSessions) {
  saveFeedingBackup(userId, babyId, sessions.feeding)
  saveSleepBackup(userId, babyId, sessions.sleep)
}

export function savePumpingBackup(userId: string, babyId: string, pumping: OngoingPumping | null) {
  const stored: StoredPumping | null = pumping
    ? {
        sessionId: pumping.sessionId,
        side: pumping.session.side,
        status: pumping.session.status,
        segments: pumping.session.segments.map((segment) => ({
          startAt: segment.startAt.toISOString(),
          endAt: segment.endAt?.toISOString() ?? null,
        })),
      }
    : null
  write(storageKey(userId, babyId, 'pumping'), stored)
}

export function readPumpingBackup(userId: string, babyId: string): OngoingPumping | null {
  const stored = read<StoredPumping>(storageKey(userId, babyId, 'pumping'))
  if (!stored) return null
  return {
    sessionId: stored.sessionId,
    session: {
      side: stored.side,
      status: stored.status,
      segments: stored.segments.map((segment) => ({
        startAt: new Date(segment.startAt),
        endAt: segment.endAt ? new Date(segment.endAt) : null,
      })),
    },
  }
}
