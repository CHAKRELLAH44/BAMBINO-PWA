import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

// Service worker (§24) : met l'interface en cache pour l'ouvrir même sans réseau.
// Une nouvelle version n'est pas appliquée d'office (une saisie pourrait être en cours) : on la propose.
// Sinon, elle s'installe d'elle-même à la prochaine ouverture de l'application.

// Une application installée reste ouverte longtemps : on regarde s'il existe une nouvelle version
// toutes les 30 minutes et chaque fois que la maman revient sur l'application.
const CHECK_EVERY_MS = 30 * 60_000
const MIN_GAP_MS = 60_000

let updateServiceWorker: ((reload?: boolean) => Promise<void>) | null = null
let updateAvailable = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

function watchForUpdates(registration: ServiceWorkerRegistration) {
  let lastCheck = Date.now()
  const check = () => {
    if (!navigator.onLine || Date.now() - lastCheck < MIN_GAP_MS) return
    lastCheck = Date.now()
    // Sans réseau ou serveur indisponible : on réessaiera à la prochaine occasion
    registration.update().catch(() => undefined)
  }
  window.setInterval(check, CHECK_EVERY_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
}

/** À appeler une fois au démarrage (sans effet pendant le développement) */
export function startServiceWorker() {
  updateServiceWorker = registerSW({
    onNeedRefresh() {
      updateAvailable = true
      notify()
    },
    onRegisteredSW(_url, registration) {
      if (registration) watchForUpdates(registration)
    },
  })
}

export function useUpdateAvailable() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => updateAvailable,
  )
}

/** Active la nouvelle version et recharge la page */
export function applyUpdate() {
  void updateServiceWorker?.(true)
}

/** Ferme l'annonce : la nouvelle version s'installera à la prochaine ouverture */
export function dismissUpdate() {
  updateAvailable = false
  notify()
}
