import { useEffect, useState } from 'react'

/**
 * « Maintenant », rafraîchi chaque seconde tant que `active` est vrai, et au retour sur l'écran.
 * Sert uniquement à redessiner l'affichage (§5) : les durées viennent toujours des horodatages.
 */
export function useNow(active: boolean, intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!active) return
    const tick = () => setNow(new Date())
    tick()
    const timer = window.setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [active, intervalMs])

  return now
}
