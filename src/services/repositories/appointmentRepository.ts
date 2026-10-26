import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentSnapshot,
  type Query,
} from 'firebase/firestore'
import type { Appointment, AppointmentInput } from '../../types/appointment'
import { db } from '../firebase/config'

export const appointmentsCollection = (userId: string) => collection(db, 'users', userId, 'appointments')
const appointmentRef = (userId: string, appointmentId: string) =>
  doc(db, 'users', userId, 'appointments', appointmentId)

const fromSnapshot = (snapshot: DocumentSnapshot) =>
  ({ id: snapshot.id, ...snapshot.data({ serverTimestamps: 'estimate' }) }) as Appointment

function listen(q: Query, onChange: (items: Appointment[]) => void, onError: (error: Error) => void) {
  return onSnapshot(
    q,
    (snapshot) =>
      onChange(
        snapshot.docs.map(fromSnapshot).sort((a, b) => a.scheduledAt.toMillis() - b.scheduledAt.toMillis()),
      ),
    onError,
  )
}

/** Tous les rendez-vous, triés par date */
export function subscribeToAppointments(
  userId: string,
  onChange: (items: Appointment[]) => void,
  onError: (error: Error) => void,
) {
  return listen(appointmentsCollection(userId), onChange, onError)
}

/** Rendez-vous d'une personne ('mother' ou un bébé), triés par date (filtre simple : pas d'index composé) */
export function subscribeToAppointmentsFor(
  userId: string,
  concerne: string,
  onChange: (items: Appointment[]) => void,
  onError: (error: Error) => void,
) {
  return listen(query(appointmentsCollection(userId), where('concerne', '==', concerne)), onChange, onError)
}

export function subscribeToAppointment(
  userId: string,
  appointmentId: string,
  onChange: (item: Appointment | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    appointmentRef(userId, appointmentId),
    (snapshot) => onChange(snapshot.exists() ? fromSnapshot(snapshot) : null),
    onError,
  )
}

const toFirestore = (input: AppointmentInput) => ({ ...input, scheduledAt: Timestamp.fromDate(input.scheduledAt) })

export async function createAppointment(userId: string, input: AppointmentInput) {
  await setDoc(doc(appointmentsCollection(userId)), {
    ...toFirestore(input),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateAppointment(userId: string, appointmentId: string, input: AppointmentInput) {
  await updateDoc(appointmentRef(userId, appointmentId), { ...toFirestore(input), updatedAt: serverTimestamp() })
}

export async function deleteAppointment(userId: string, appointmentId: string) {
  await deleteDoc(appointmentRef(userId, appointmentId))
}
