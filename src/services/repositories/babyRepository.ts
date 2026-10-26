import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type DocumentReference,
} from 'firebase/firestore'
import type { Baby, BabyInput } from '../../types/baby'
import { db } from '../firebase/config'
import { deleteInBatches } from './batchDelete'

const babiesCollection = (userId: string) => collection(db, 'users', userId, 'babies')
const babyRef = (userId: string, babyId: string) => doc(db, 'users', userId, 'babies', babyId)

const toFirestore = (input: BabyInput) => ({
  ...input,
  birthDate: Timestamp.fromDate(input.birthDate),
})

/** Écoute en direct la liste des bébés (ordre de création) */
export function subscribeToBabies(
  userId: string,
  onChange: (babies: Baby[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(babiesCollection(userId), orderBy('createdAt')),
    (snapshot) =>
      onChange(
        snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }) as Baby,
        ),
      ),
    onError,
  )
}

export async function createBaby(userId: string, input: BabyInput): Promise<string> {
  const ref = await addDoc(babiesCollection(userId), {
    ...toFirestore(input),
    archivedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateBaby(userId: string, babyId: string, input: BabyInput) {
  await updateDoc(babyRef(userId, babyId), { ...toFirestore(input), updatedAt: serverTimestamp() })
}

export async function setBabyArchived(userId: string, babyId: string, archived: boolean) {
  await updateDoc(babyRef(userId, babyId), {
    archivedAt: archived ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Supprimer le document ne supprime pas ses sous-collections (cahier §3.4) :
 * on efface d'abord les événements, les mesures de croissance, les tirages en cours et le stock du bébé,
 * par lots, puis le bébé.
 */
export async function deleteBaby(userId: string, babyId: string) {
  const baby = babyRef(userId, babyId)
  const refs: DocumentReference[] = []

  const events = await getDocs(collection(baby, 'events'))
  refs.push(...events.docs.map((d) => d.ref))

  const growthRecords = await getDocs(collection(baby, 'growthRecords'))
  refs.push(...growthRecords.docs.map((d) => d.ref))

  const pumpingSessions = await getDocs(collection(baby, 'pumpingSessions'))
  refs.push(...pumpingSessions.docs.map((d) => d.ref))

  // Stock de lait : l'historique de chaque contenant, puis le contenant
  const containers = await getDocs(collection(baby, 'milkContainers'))
  for (const container of containers.docs) {
    const operations = await getDocs(collection(container.ref, 'operations'))
    refs.push(...operations.docs.map((d) => d.ref), container.ref)
  }

  // Rendez-vous et rappels rattachés au bébé (§4.3 : toutes ses données suivent son identifiant)
  const appointments = await getDocs(
    query(collection(db, 'users', userId, 'appointments'), where('concerne', '==', babyId)),
  )
  const reminders = await getDocs(query(collection(db, 'users', userId, 'reminders'), where('babyId', '==', babyId)))
  refs.push(...appointments.docs.map((d) => d.ref), ...reminders.docs.map((d) => d.ref))

  await deleteInBatches(refs)
  await deleteDoc(baby)
}
