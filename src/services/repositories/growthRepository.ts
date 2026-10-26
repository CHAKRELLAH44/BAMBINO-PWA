import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentSnapshot,
} from 'firebase/firestore'
import type { GrowthInput, GrowthRecord } from '../../types/growth'
import { db } from '../firebase/config'

export const growthCollection = (userId: string, babyId: string) =>
  collection(db, 'users', userId, 'babies', babyId, 'growthRecords')
const growthRef = (userId: string, babyId: string, recordId: string) =>
  doc(growthCollection(userId, babyId), recordId)

const fromSnapshot = (snapshot: DocumentSnapshot) =>
  ({ id: snapshot.id, ...snapshot.data({ serverTimestamps: 'estimate' }) }) as GrowthRecord

/** Toutes les mesures du bébé, de la plus récente à la plus ancienne (§15 : rien n'est écrasé) */
export function subscribeToGrowthRecords(
  userId: string,
  babyId: string,
  onChange: (records: GrowthRecord[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(growthCollection(userId, babyId), orderBy('measuredAt', 'desc')),
    (snapshot) => onChange(snapshot.docs.map(fromSnapshot)),
    onError,
  )
}

export function subscribeToGrowthRecord(
  userId: string,
  babyId: string,
  recordId: string,
  onChange: (record: GrowthRecord | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    growthRef(userId, babyId, recordId),
    (snapshot) => onChange(snapshot.exists() ? fromSnapshot(snapshot) : null),
    onError,
  )
}

export async function createGrowthRecord(userId: string, babyId: string, input: GrowthInput) {
  await setDoc(doc(growthCollection(userId, babyId)), {
    type: input.type,
    label: input.label,
    value: input.value,
    unit: input.unit,
    measuredAt: Timestamp.fromDate(input.measuredAt),
    comment: input.comment,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/** Le type ne change pas (règles) : on corrige le nom, la valeur, l'unité, la date ou le commentaire */
export async function updateGrowthRecord(userId: string, babyId: string, recordId: string, input: GrowthInput) {
  await updateDoc(growthRef(userId, babyId, recordId), {
    label: input.label,
    value: input.value,
    unit: input.unit,
    measuredAt: Timestamp.fromDate(input.measuredAt),
    comment: input.comment,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteGrowthRecord(userId: string, babyId: string, recordId: string) {
  await deleteDoc(growthRef(userId, babyId, recordId))
}
