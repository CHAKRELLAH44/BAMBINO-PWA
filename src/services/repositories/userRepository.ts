import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import type { NewUserProfile, UserProfile } from '../../types/user'
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
