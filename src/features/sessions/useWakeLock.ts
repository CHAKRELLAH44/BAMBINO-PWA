import { useEffect } from 'react'

/** Option du cahier (§5) : garder l'écran allumé pendant une tétée, si le navigateur le permet */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) await lock.release()
        else sentinel = lock
      } catch {
        // refusé (batterie faible, onglet en arrière-plan) : sans conséquence sur la durée
      }
    }

    // Le verrou est perdu quand l'écran s'éteint : on le redemande au retour
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
    }
  }, [active])
}
