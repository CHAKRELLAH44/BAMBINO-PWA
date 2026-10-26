import { useSyncExternalStore } from 'react'

// Guide de bienvenue : affiché à chaque ouverture de l'application tant que la case « Ne plus afficher »
// n'est pas cochée (champ `onboardingCompleted` du profil, valable sur tous les appareils).
// Une fois fermé, il ne revient pas avant la prochaine ouverture (sessionStorage).

const sessionKey = (userId: string) => `bambino.guideClosed.${userId}`

export function wasGuideClosed(userId: string) {
  try {
    return sessionStorage.getItem(sessionKey(userId)) === '1'
  } catch {
    return false
  }
}

export function markGuideClosed(userId: string) {
  try {
    sessionStorage.setItem(sessionKey(userId), '1')
  } catch {
    // stockage indisponible : le guide peut revenir au prochain chargement de la page
  }
}

// « Revoir le guide » (Bébés → Application) : demande d'ouverture partagée entre les écrans
let requested = false
const listeners = new Set<() => void>()

function setRequested(value: boolean) {
  requested = value
  listeners.forEach((listener) => listener())
}

export const openWelcomeGuide = () => setRequested(true)
export const clearGuideRequest = () => setRequested(false)

export function useGuideRequested() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => requested,
  )
}
