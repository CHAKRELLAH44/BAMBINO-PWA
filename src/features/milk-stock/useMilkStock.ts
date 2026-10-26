import { useEffect, useState } from 'react'
import { subscribeToContainers, subscribeToOperations } from '../../services/repositories/milkStockRepository'
import type { MilkContainer, StockOperation } from '../../types/milkStock'
import { useUserId } from '../auth/useAuth'

interface ListState<T> {
  key: string
  items: T[]
  loadError: boolean
}

function useLiveList<T>(
  key: string,
  subscribe: (onChange: (items: T[]) => void, onError: () => void) => () => void,
) {
  const [state, setState] = useState<ListState<T>>({ key: '', items: [], loadError: false })

  useEffect(
    () =>
      subscribe(
        (items) => setState({ key, items, loadError: false }),
        () => setState({ key, items: [], loadError: true }),
      ),
    // `key` résume tous les paramètres de l'abonnement
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  const isCurrent = state.key === key
  return { items: isCurrent ? state.items : [], loading: !isCurrent, loadError: isCurrent && state.loadError }
}

/** Contenants de lait du bébé, du plus récent au plus ancien */
export function useMilkContainers(babyId: string) {
  const userId = useUserId()
  const { items, ...rest } = useLiveList<MilkContainer>(`${userId}/${babyId}`, (onChange, onError) =>
    subscribeToContainers(userId, babyId, onChange, onError),
  )
  return { containers: items, ...rest }
}

/** Historique d'un contenant, du plus récent au plus ancien */
export function useStockOperations(babyId: string, containerId: string) {
  const userId = useUserId()
  const { items, ...rest } = useLiveList<StockOperation>(
    `${userId}/${babyId}/${containerId}`,
    (onChange, onError) => subscribeToOperations(userId, babyId, containerId, onChange, onError),
  )
  return { operations: items, ...rest }
}
