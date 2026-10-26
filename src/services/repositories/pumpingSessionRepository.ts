import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore'
import type { OngoingPumping, PumpingSession } from '../../types/event'
import { db } from '../firebase/config'

// Chronomètre de tirage (§5, §8.1) : un document par séance en cours, supprimé quand le tirage est enregistré.

export const pumpingSessionsCollection = (userId: string, babyId: string) =>
  collection(db, 'users', userId, 'babies', babyId, 'pumpingSessions')
export const pumpingSessionRef = (userId: string, babyId: string, sessionId: string) =>
  doc(pumpingSessionsCollection(userId, babyId), sessionId)

export const newPumpingSessionId = (userId: string, babyId: string) => doc(pumpingSessionsCollection(userId, babyId)).id

const toFirestore = (session: PumpingSession) => ({
  side: session.side,
  status: session.status,
  startAt: Timestamp.fromDate(session.segments[0].startAt),
  segments: session.segments.map((segment) => ({
    startAt: Timestamp.fromDate(segment.startAt),
    endAt: segment.endAt ? Timestamp.fromDate(segment.endAt) : null,
  })),
})

const fromFirestore = (id: string, data: DocumentData): OngoingPumping => ({
  sessionId: id,
  session: {
    side: data.side,
    status: data.status,
    segments: (data.segments as { startAt: Timestamp; endAt: Timestamp | null }[]).map((segment) => ({
      startAt: segment.startAt.toDate(),
      endAt: segment.endAt?.toDate() ?? null,
    })),
  },
})

export async function createPumpingSession(userId: string, babyId: string, sessionId: string, session: PumpingSession) {
  await setDoc(pumpingSessionRef(userId, babyId, sessionId), {
    ...toFirestore(session),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updatePumpingSession(userId: string, babyId: string, sessionId: string, session: PumpingSession) {
  await updateDoc(pumpingSessionRef(userId, babyId, sessionId), { ...toFirestore(session), updatedAt: serverTimestamp() })
}

export async function deletePumpingSession(userId: string, babyId: string, sessionId: string) {
  await deleteDoc(pumpingSessionRef(userId, babyId, sessionId))
}

/** Séance de tirage en cours (la plus récente), avec l'indication « réponse du cache » comme pour la tétée */
export function subscribeToPumpingSession(
  userId: string,
  babyId: string,
  onChange: (ongoing: OngoingPumping | null, fromCache: boolean) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    pumpingSessionsCollection(userId, babyId),
    { includeMetadataChanges: true },
    (snapshot) => {
      const sessions = snapshot.docs
        .map((d) => fromFirestore(d.id, d.data({ serverTimestamps: 'estimate' })))
        .sort((a, b) => b.session.segments[0].startAt.getTime() - a.session.segments[0].startAt.getTime())
      onChange(sessions[0] ?? null, snapshot.metadata.fromCache)
    },
    onError,
  )
}
