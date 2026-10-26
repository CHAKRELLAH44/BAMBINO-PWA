import { FirebaseError } from 'firebase/app'

/**
 * Clé de traduction du message d'échec d'un enregistrement.
 * Un refus des règles de sécurité est signalé clairement (en développement : avec la commande à lancer).
 */
export function saveErrorKey(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') {
      return import.meta.env.DEV ? 'common.permissionDeniedDev' : 'common.permissionDenied'
    }
    if (error.code === 'unavailable') return 'common.offline'
  }
  return 'common.saveError'
}
