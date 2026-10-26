import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import type { Language, NewUserProfile, UserProfile } from '../../types/user'
import { db } from '../firebase/config'

const userRef = (userId: string) => doc(db, 'users', userId)

export async function createUserProfile(userId: string, profile: NewUserProfile) {
  await setDoc(userRef(userId), {
    ...profile,
    welcomeEmailSent: false,
    onboardingCompleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(userRef(userId))
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null
}

export async function markWelcomeEmailSent(userId: string) {
  await updateDoc(userRef(userId), { welcomeEmailSent: true, updatedAt: serverTimestamp() })
}

/** Langue de l'interface choisie par la maman (§23), retrouvée sur tous ses appareils */
export async function updatePreferredLanguage(userId: string, language: Language) {
  await updateDoc(userRef(userId), { preferredLanguage: language, updatedAt: serverTimestamp() })
}

/** Case « Ne plus afficher ce guide » du guide de bienvenue */
export async function updateOnboardingCompleted(userId: string, completed: boolean) {
  await updateDoc(userRef(userId), { onboardingCompleted: completed, updatedAt: serverTimestamp() })
}

/** Profil de la maman, à jour en direct (prénom affiché sur l'accueil) */
export function subscribeToUserProfile(
  userId: string,
  onChange: (profile: UserProfile | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    userRef(userId),
    (snapshot) => onChange(snapshot.exists() ? (snapshot.data() as UserProfile) : null),
    onError,
  )
}
