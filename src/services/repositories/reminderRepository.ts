import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentSnapshot,
} from 'firebase/firestore'
import type { Reminder, ReminderInput } from '../../types/reminder'
import { db } from '../firebase/config'

export const remindersCollection = (userId: string) => collection(db, 'users', userId, 'reminders')
const reminderRef = (userId: string, reminderId: string) => doc(db, 'users', userId, 'reminders', reminderId)

const fromSnapshot = (snapshot: DocumentSnapshot) =>
  ({ id: snapshot.id, ...snapshot.data({ serverTimestamps: 'estimate' }) }) as Reminder

/** Tous les rappels et traitements, par ordre alphabétique */
export function subscribeToReminders(
  userId: string,
  onChange: (reminders: Reminder[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    remindersCollection(userId),
    (snapshot) => onChange(snapshot.docs.map(fromSnapshot).sort((a, b) => a.title.localeCompare(b.title))),
    onError,
  )
}

const toFirestore = (input: ReminderInput) => ({
  ...input,
  intervalMinutes: input.scheduleType === 'interval' ? input.intervalMinutes : null,
  scheduledTimes: input.scheduleType === 'fixedTimes' ? input.scheduledTimes : [],
  startDate: input.startDate ? Timestamp.fromDate(input.startDate) : null,
  endDate: input.endDate ? Timestamp.fromDate(input.endDate) : null,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
})

/** Les champs de répétition sont réservés aux notifications (P2) */
export async function createReminder(userId: string, input: ReminderInput) {
  const ref = doc(remindersCollection(userId))
  await setDoc(ref, {
    ...toFirestore(input),
    maxRepeats: 0,
    repeatEveryMinutes: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateReminder(userId: string, reminderId: string, input: ReminderInput) {
  await updateDoc(reminderRef(userId, reminderId), { ...toFirestore(input), updatedAt: serverTimestamp() })
}

export async function setReminderEnabled(userId: string, reminderId: string, enabled: boolean) {
  await updateDoc(reminderRef(userId, reminderId), { enabled, updatedAt: serverTimestamp() })
}

export async function deleteReminder(userId: string, reminderId: string) {
  await deleteDoc(reminderRef(userId, reminderId))
}
