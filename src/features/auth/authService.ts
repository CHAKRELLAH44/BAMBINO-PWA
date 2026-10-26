import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { sendWelcomeEmail } from '../../services/email/welcomeEmail'
import { auth } from '../../services/firebase/config'
import { deleteAllUserData } from '../../services/repositories/accountRepository'
import {
  createUserProfile,
  getUserProfile,
  markWelcomeEmailSent,
} from '../../services/repositories/userRepository'
import { clearLocalUserData, markAccountDeleted } from '../../utils/localData'
import type { ForgotPasswordValues, LoginValues, SignUpValues } from './schemas'

export interface SignUpResult {
  welcomeEmailSent: boolean
}

export async function signUp(values: SignUpValues): Promise<SignUpResult> {
  const { user } = await createUserWithEmailAndPassword(auth, values.email, values.password)
  await createUserProfile(user.uid, {
    displayName: values.displayName,
    email: values.email,
    preferredLanguage: values.preferredLanguage,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  return { welcomeEmailSent: await sendWelcomeEmailOnce(user.uid) }
}

// Cahier §3.3 : un seul envoi, et un échec n'annule pas l'inscription (pas de nouvelle tentative).
async function sendWelcomeEmailOnce(userId: string): Promise<boolean> {
  try {
    const profile = await getUserProfile(userId)
    if (!profile) return false
    if (profile.welcomeEmailSent) return true
    await sendWelcomeEmail({ name: profile.displayName, email: profile.email })
    await markWelcomeEmailSent(userId)
    return true
  } catch {
    // Pas de données personnelles dans les journaux (cahier §28)
    console.error("Échec de l'envoi de l'e-mail de bienvenue")
    return false
  }
}

export async function logIn(values: LoginValues) {
  await signInWithEmailAndPassword(auth, values.email, values.password)
}

export async function resetPassword(values: ForgotPasswordValues) {
  await sendPasswordResetEmail(auth, values.email)
}

export async function logOut() {
  await signOut(auth)
}

/**
 * Suppression du compte par la maman (§3.4). Le mot de passe est redemandé : il confirme l'identité
 * et répond à l'exigence de Firebase (« connexion récente ») avant toute suppression.
 * Ordre : données Firestore, puis document users/{userId} (deleteAllUserData), puis compte Authentication.
 */
export async function deleteAccount(password: string) {
  const user = auth.currentUser
  if (!user?.email) throw new Error('Aucune utilisatrice connectée')
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
  await deleteAllUserData(user.uid)
  clearLocalUserData(user.uid)
  markAccountDeleted(true)
  try {
    await deleteUser(user)
  } catch (error) {
    markAccountDeleted(false)
    throw error
  }
}
