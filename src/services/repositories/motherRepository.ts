import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore'
import type { MotherContact, MotherContactInput, MotherInfo, MotherWeight, MotherWeightInput } from '../../types/mother'
import { db } from '../firebase/config'

// Profil maman : informations (taille, notes), poids dans le temps, contacts utiles. Tout sous users/{userId}.

const motherInfoRef = (userId: string) => doc(db, 'users', userId, 'motherInfo', 'profile')
const weightsCollection = (userId: string) => collection(db, 'users', userId, 'motherWeights')
const contactsCollection = (userId: string) => collection(db, 'users', userId, 'motherContacts')

const withId = <T>(snapshot: DocumentSnapshot) =>
  ({ id: snapshot.id, ...snapshot.data({ serverTimestamps: 'estimate' }) }) as T

export function subscribeToMotherInfo(
  userId: string,
  onChange: (info: MotherInfo | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    motherInfoRef(userId),
    (snapshot) => onChange(snapshot.exists() ? (snapshot.data({ serverTimestamps: 'estimate' }) as MotherInfo) : null),
    onError,
  )
}

/** Prénom (profil du compte) et informations de la maman, enregistrés ensemble */
export async function saveMotherProfile(
  userId: string,
  values: { displayName: string; heightCm: number | null; notes: string },
  infoExists: boolean,
) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'users', userId), { displayName: values.displayName, updatedAt: serverTimestamp() })
  const info = { heightCm: values.heightCm, notes: values.notes, updatedAt: serverTimestamp() }
  if (infoExists) batch.update(motherInfoRef(userId), info)
  else batch.set(motherInfoRef(userId), { ...info, createdAt: serverTimestamp() })
  await batch.commit()
}

// --- Poids ---

const weightToFirestore = (input: MotherWeightInput) => ({
  weightKg: input.weightKg,
  measuredAt: Timestamp.fromDate(input.measuredAt),
  comment: input.comment,
})

/** Pesées, de la plus récente à la plus ancienne */
export function subscribeToMotherWeights(
  userId: string,
  onChange: (weights: MotherWeight[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(weightsCollection(userId), orderBy('measuredAt', 'desc'), limit(200)),
    (snapshot) => onChange(snapshot.docs.map((d) => withId<MotherWeight>(d))),
    onError,
  )
}

export async function createMotherWeight(userId: string, input: MotherWeightInput) {
  await addDoc(weightsCollection(userId), {
    ...weightToFirestore(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateMotherWeight(userId: string, weightId: string, input: MotherWeightInput) {
  await updateDoc(doc(weightsCollection(userId), weightId), { ...weightToFirestore(input), updatedAt: serverTimestamp() })
}

export async function deleteMotherWeight(userId: string, weightId: string) {
  await deleteDoc(doc(weightsCollection(userId), weightId))
}

// --- Contacts utiles ---

export function subscribeToMotherContacts(
  userId: string,
  onChange: (contacts: MotherContact[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(contactsCollection(userId), orderBy('createdAt', 'asc'), limit(50)),
    (snapshot) => onChange(snapshot.docs.map((d) => withId<MotherContact>(d))),
    onError,
  )
}

export async function createMotherContact(userId: string, input: MotherContactInput) {
  await addDoc(contactsCollection(userId), { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
}

export async function updateMotherContact(userId: string, contactId: string, input: MotherContactInput) {
  await updateDoc(doc(contactsCollection(userId), contactId), { ...input, updatedAt: serverTimestamp() })
}

export async function deleteMotherContact(userId: string, contactId: string) {
  await deleteDoc(doc(contactsCollection(userId), contactId))
}
