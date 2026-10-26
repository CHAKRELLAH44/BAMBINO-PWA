import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentSnapshot,
} from 'firebase/firestore'
import type { PersonalEvent, PersonalEventInput } from '../../types/personal'
import { db } from '../firebase/config'

const personalCollection = (userId: string) => collection(db, 'users', userId, 'personalEvents')
const personalRef = (userId: string, eventId: string) => doc(db, 'users', userId, 'personalEvents', eventId)

const fromSnapshot = (snapshot: DocumentSnapshot) =>
  ({ id: snapshot.id, ...snapshot.data({ serverTimestamps: 'estimate' }) }) as PersonalEvent

/** Événements de la maman, du plus récent au plus ancien (§12) */
export function subscribeToPersonalEvents(
  userId: string,
  maxCount: number,
  onChange: (events: PersonalEvent[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(personalCollection(userId), orderBy('occurredAt', 'desc'), limit(maxCount)),
    (snapshot) => onChange(snapshot.docs.map(fromSnapshot)),
    onError,
  )
}

export function subscribeToPersonalEvent(
  userId: string,
  eventId: string,
  onChange: (event: PersonalEvent | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    personalRef(userId, eventId),
    (snapshot) => onChange(snapshot.exists() ? fromSnapshot(snapshot) : null),
    onError,
  )
}

export async function createPersonalEvent(userId: string, input: PersonalEventInput) {
  await setDoc(doc(personalCollection(userId)), {
    type: input.type,
    occurredAt: Timestamp.fromDate(input.occurredAt),
    details: input.details,
    comment: input.comment,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updatePersonalEvent(userId: string, eventId: string, input: PersonalEventInput) {
  await updateDoc(personalRef(userId, eventId), {
    occurredAt: Timestamp.fromDate(input.occurredAt),
    details: input.details,
    comment: input.comment,
    updatedAt: serverTimestamp(),
  })
}

export async function deletePersonalEvent(userId: string, eventId: string) {
  await deleteDoc(personalRef(userId, eventId))
}
