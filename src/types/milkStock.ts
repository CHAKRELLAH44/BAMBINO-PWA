import type { Timestamp } from 'firebase/firestore'

export type StorageType = 'fridge' | 'freezer' | 'other'

/** disponible, utilisé (entamé), épuisé, écarté (§8.2) */
export type ContainerStatus = 'available' | 'used' | 'depleted' | 'discarded'

/** Document users/{userId}/babies/{babyId}/milkContainers/{id} (§27) */
export interface MilkContainer {
  id: string
  pumpedAt: Timestamp
  initialAmountMl: number
  remainingAmountMl: number
  storageType: StorageType
  storedAt: Timestamp
  status: ContainerStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type StockOperationType = 'add' | 'use' | 'discard'

/** Document …/milkContainers/{id}/operations/{opId} (§27), jamais modifié après création */
export interface StockOperation {
  id: string
  type: StockOperationType
  amountMl: number
  linkedEventId: string | null
  occurredAt: Timestamp
}

export const isInStock = (container: Pick<MilkContainer, 'status'>) =>
  container.status === 'available' || container.status === 'used'
