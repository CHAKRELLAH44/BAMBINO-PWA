import { FirebaseError } from 'firebase/app'

/** Transforme une erreur Firebase en clé de traduction compréhensible (cahier §3.2) */
export function authErrorKey(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'auth.errors.emailInUse'
      case 'auth/invalid-email':
        return 'auth.errors.invalidEmail'
      case 'auth/weak-password':
        return 'auth.errors.weakPassword'
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'auth.errors.invalidCredential'
      case 'auth/too-many-requests':
        return 'auth.errors.tooManyRequests'
      case 'auth/network-request-failed':
        return 'auth.errors.network'
    }
  }
  return 'auth.errors.unknown'
}
