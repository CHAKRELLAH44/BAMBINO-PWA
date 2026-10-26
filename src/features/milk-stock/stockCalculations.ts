import type { ContainerStatus, MilkContainer } from '../../types/milkStock'

export type StockUseResult =
  | { ok: true; remainingAmountMl: number; status: ContainerStatus }
  | { ok: false; error: 'notInStock' | 'invalidAmount' | 'insufficient' }

/** Cahier §8.3 : refus si la quantité demandée dépasse le stock, puis mise à jour du statut */
export function applyStockUse(
  container: Pick<MilkContainer, 'status' | 'remainingAmountMl'>,
  amountMl: number,
): StockUseResult {
  if (container.status !== 'available' && container.status !== 'used') return { ok: false, error: 'notInStock' }
  if (!Number.isFinite(amountMl) || amountMl <= 0) return { ok: false, error: 'invalidAmount' }
  if (amountMl > container.remainingAmountMl) return { ok: false, error: 'insufficient' }
  const remainingAmountMl = container.remainingAmountMl - amountMl
  return { ok: true, remainingAmountMl, status: remainingAmountMl === 0 ? 'depleted' : 'used' }
}

export interface StockSummary {
  /** Quantité encore en stock (contenants disponibles ou entamés) */
  availableMl: number
  containersInStock: number
  /** Quantité déjà prélevée dans les contenants entamés ou épuisés */
  usedMl: number
  discardedCount: number
}

/** Tableau de bord du stock (§8.4) */
export function summarizeStock(
  containers: Pick<MilkContainer, 'status' | 'initialAmountMl' | 'remainingAmountMl'>[],
): StockSummary {
  const summary: StockSummary = { availableMl: 0, containersInStock: 0, usedMl: 0, discardedCount: 0 }
  for (const container of containers) {
    if (container.status === 'available' || container.status === 'used') {
      summary.availableMl += container.remainingAmountMl
      summary.containersInStock += 1
    }
    if (container.status === 'used' || container.status === 'depleted') {
      summary.usedMl += container.initialAmountMl - container.remainingAmountMl
    }
    if (container.status === 'discarded') summary.discardedCount += 1
  }
  return summary
}
