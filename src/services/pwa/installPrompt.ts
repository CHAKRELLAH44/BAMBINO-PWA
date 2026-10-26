import { useSyncExternalStore } from 'react'

// Installation depuis le navigateur (§24). Chrome / Edge (Android, ordinateur) proposent l'installation
// par l'événement « beforeinstallprompt » ; sur iPhone et iPad : Partager, puis « Sur l'écran d'accueil ».

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState = 'installed' | 'available' | 'ios' | 'android' | 'unavailable'

let deferredPrompt: InstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

// L'iPad se présente comme un Mac : on le reconnaît à l'écran tactile
const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
const isAndroid = () => /android/i.test(navigator.userAgent)

/** À appeler tôt au démarrage : le navigateur n'envoie l'événement qu'une fois */
export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferredPrompt = null
    notify()
  })
}

function readState(): InstallState {
  if (installed || isStandalone()) return 'installed'
  if (deferredPrompt) return 'available'
  if (isIos()) return 'ios'
  return isAndroid() ? 'android' : 'unavailable'
}

export function useInstallState() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, readState)
}

/** Ouvre la fenêtre d'installation du navigateur */
export async function installApp() {
  if (!deferredPrompt) return
  const prompt = deferredPrompt
  deferredPrompt = null
  await prompt.prompt()
  if ((await prompt.userChoice).outcome === 'dismissed') deferredPrompt = prompt
  notify()
}
