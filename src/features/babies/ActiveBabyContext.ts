import { createContext } from 'react'
import type { Baby } from '../../types/baby'

export interface ActiveBabyState {
  /** Tous les bébés, archivés compris */
  babies: Baby[]
  /** Bébé sélectionné (jamais un bébé archivé), ou null s'il n'y a aucun bébé actif */
  activeBaby: Baby | null
  loading: boolean
  loadError: boolean
  setActiveBabyId: (babyId: string) => void
}

export const ActiveBabyContext = createContext<ActiveBabyState | null>(null)
