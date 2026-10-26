import { useSyncExternalStore } from 'react'

/** Connexion réseau de l'appareil (événements online / offline du navigateur) */
export function useOnline() {
  return useSyncExternalStore(
    (listener) => {
      window.addEventListener('online', listener)
      window.addEventListener('offline', listener)
      return () => {
        window.removeEventListener('online', listener)
        window.removeEventListener('offline', listener)
      }
    },
    () => navigator.onLine,
  )
}
