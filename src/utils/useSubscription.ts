import { useEffect, useState } from 'react'

type Subscribe<T> = (onNext: (value: T) => void, onError: () => void) => () => void

/**
 * Abonnement Firestore en direct. `key` résume les paramètres : quand elle change, on se réabonne
 * et l'ancienne valeur n'est plus affichée. `key = null` : pas d'abonnement.
 */
export function useSubscription<T>(key: string | null, subscribe: Subscribe<T>, initial: T) {
  const [state, setState] = useState<{ key: string; value: T; error: boolean } | null>(null)

  useEffect(
    () => {
      if (key === null) return
      return subscribe(
        (value) => setState({ key, value, error: false }),
        () => setState({ key, value: initial, error: true }),
      )
    },
    // `subscribe` et `initial` sont recréés à chaque rendu : `key` suffit
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  const current = state?.key === key ? state : null
  return {
    value: current ? current.value : initial,
    loading: key !== null && current === null,
    loadError: current?.error ?? false,
  }
}
