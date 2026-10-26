import {
  createFeeding,
  createSleep,
  newEventId,
  updateFeedingSession,
  updateSleep,
} from '../../services/repositories/eventRepository'
import {
  createPumpingSession,
  deletePumpingSession,
  newPumpingSessionId,
  updatePumpingSession,
} from '../../services/repositories/pumpingSessionRepository'
import type { FeedingSession, PumpingSession } from '../../types/event'
import { saveFeedingBackup, savePumpingBackup, saveSleepBackup } from './sessionBackup'

// Chaque action écrit d'abord la copie de secours sur l'appareil, puis l'horodatage dans Firestore (§5).

export function startFeeding(userId: string, babyId: string, session: FeedingSession) {
  const eventId = newEventId(userId, babyId)
  saveFeedingBackup(userId, babyId, { eventId, session })
  return { eventId, saved: createFeeding(userId, babyId, eventId, session) }
}

export function changeFeeding(userId: string, babyId: string, eventId: string, session: FeedingSession) {
  saveFeedingBackup(userId, babyId, { eventId, session })
  return updateFeedingSession(userId, babyId, eventId, session)
}

export function startSleep(userId: string, babyId: string, startAt: Date) {
  const eventId = newEventId(userId, babyId)
  saveSleepBackup(userId, babyId, { eventId, startAt })
  return { eventId, saved: createSleep(userId, babyId, eventId, startAt, null) }
}

export function finishSleep(userId: string, babyId: string, eventId: string, startAt: Date, endAt: Date) {
  saveSleepBackup(userId, babyId, null)
  return updateSleep(userId, babyId, eventId, startAt, endAt)
}

export function forgetSessionBackups(userId: string, babyId: string, kind: 'feeding' | 'sleep' | 'pumping') {
  if (kind === 'feeding') saveFeedingBackup(userId, babyId, null)
  else if (kind === 'sleep') saveSleepBackup(userId, babyId, null)
  else savePumpingBackup(userId, babyId, null)
}

export function startPumpingTimer(userId: string, babyId: string, session: PumpingSession) {
  const sessionId = newPumpingSessionId(userId, babyId)
  savePumpingBackup(userId, babyId, { sessionId, session })
  return { sessionId, saved: createPumpingSession(userId, babyId, sessionId, session) }
}

export function changePumpingTimer(userId: string, babyId: string, sessionId: string, session: PumpingSession) {
  savePumpingBackup(userId, babyId, { sessionId, session })
  return updatePumpingSession(userId, babyId, sessionId, session)
}

export function cancelPumpingTimer(userId: string, babyId: string, sessionId: string) {
  savePumpingBackup(userId, babyId, null)
  return deletePumpingSession(userId, babyId, sessionId)
}
