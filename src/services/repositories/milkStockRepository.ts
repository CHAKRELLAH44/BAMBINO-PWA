import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type DocumentReference,
  type Transaction,
} from 'firebase/firestore'
import { applyStockUse } from '../../features/milk-stock/stockCalculations'
import type { BottleInput, PumpingInput } from '../../types/event'
import type { MilkContainer, StockOperation, StorageType } from '../../types/milkStock'
import { db } from '../firebase/config'
import { bottleToFirestore, eventsCollection, pumpingToFirestore } from './eventRepository'
import { pumpingSessionRef } from './pumpingSessionRepository'

export const containersCollection = (userId: string, babyId: string) =>
  collection(db, 'users', userId, 'babies', babyId, 'milkContainers')
const containerRef = (userId: string, babyId: string, containerId: string) =>
  doc(containersCollection(userId, babyId), containerId)
export const operationsCollection = (userId: string, babyId: string, containerId: string) =>
  collection(containerRef(userId, babyId, containerId), 'operations')

export type StockErrorCode = 'missing' | 'notInStock' | 'invalidAmount' | 'insufficient'

export class StockError extends Error {
  code: StockErrorCode

  constructor(code: StockErrorCode) {
    super(code)
    this.code = code
  }
}

const ts = (date: Date) => Timestamp.fromDate(date)

export function subscribeToContainers(
  userId: string,
  babyId: string,
  onChange: (containers: MilkContainer[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(containersCollection(userId, babyId), orderBy('pumpedAt', 'desc')),
    (snapshot) =>
      onChange(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }) as MilkContainer),
      ),
    onError,
  )
}

export function subscribeToOperations(
  userId: string,
  babyId: string,
  containerId: string,
  onChange: (operations: StockOperation[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(operationsCollection(userId, babyId, containerId), orderBy('occurredAt', 'desc')),
    (snapshot) =>
      onChange(
        snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }) as StockOperation)
          // À la même minute, l'ajout est toujours la plus ancienne opération du contenant
          .sort(
            (a, b) =>
              b.occurredAt.toMillis() - a.occurredAt.toMillis() || (a.type === 'add' ? 1 : 0) - (b.type === 'add' ? 1 : 0),
          ),
      ),
    onError,
  )
}

/**
 * Tirage (§8.1), avec mise au stock facultative (§8.2) :
 * l'événement, le contenant et l'opération « ajout » sont écrits ensemble, ou pas du tout.
 * `sessionId` : séance du chronomètre terminée par ce tirage, supprimée dans la même écriture.
 */
export async function createPumping(
  userId: string,
  babyId: string,
  input: PumpingInput,
  stock: { storageType: StorageType } | null,
  sessionId: string | null = null,
) {
  const batch = writeBatch(db)
  if (sessionId) batch.delete(pumpingSessionRef(userId, babyId, sessionId))
  const eventRef = doc(eventsCollection(userId, babyId))
  batch.set(eventRef, { ...pumpingToFirestore(input), createdAt: serverTimestamp(), updatedAt: serverTimestamp() })

  if (stock) {
    const newContainer = doc(containersCollection(userId, babyId))
    const amountMl = input.details.totalMl
    batch.set(newContainer, {
      pumpedAt: ts(input.occurredAt),
      initialAmountMl: amountMl,
      remainingAmountMl: amountMl,
      storageType: stock.storageType,
      storedAt: ts(input.occurredAt),
      status: 'available',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    batch.set(doc(operationsCollection(userId, babyId, newContainer.id)), {
      type: 'add',
      amountMl,
      linkedEventId: eventRef.id,
      occurredAt: ts(input.occurredAt),
    })
  }
  await batch.commit()
}

/** Lecture + vérification + déduction (§8.3, étapes 1 à 3), dans une transaction en cours */
async function deductInTransaction(transaction: Transaction, ref: DocumentReference, amountMl: number) {
  const snapshot = await transaction.get(ref)
  if (!snapshot.exists()) throw new StockError('missing')
  const result = applyStockUse(snapshot.data() as MilkContainer, amountMl)
  if (!result.ok) throw new StockError(result.error)
  transaction.update(ref, {
    remainingAmountMl: result.remainingAmountMl,
    status: result.status,
    updatedAt: serverTimestamp(),
  })
}

/** Biberon de lait maternel du stock (§8.3) : la quantité bue est retirée du contenant, tout ou rien */
export async function createBottleFromStock(
  userId: string,
  babyId: string,
  input: BottleInput,
  containerId: string,
) {
  await runTransaction(db, async (transaction) => {
    await deductInTransaction(transaction, containerRef(userId, babyId, containerId), input.details.consumedMl)
    const eventRef = doc(eventsCollection(userId, babyId))
    const bottle = bottleToFirestore(input)
    transaction.set(eventRef, {
      ...bottle,
      details: { ...bottle.details, containerId },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    transaction.set(doc(operationsCollection(userId, babyId, containerId)), {
      type: 'use',
      amountMl: input.details.consumedMl,
      linkedEventId: eventRef.id,
      occurredAt: ts(input.occurredAt),
    })
  })
}

/** Utilisation sans biberon enregistré */
export async function takeFromContainer(userId: string, babyId: string, containerId: string, amountMl: number) {
  await runTransaction(db, async (transaction) => {
    await deductInTransaction(transaction, containerRef(userId, babyId, containerId), amountMl)
    transaction.set(doc(operationsCollection(userId, babyId, containerId)), {
      type: 'use',
      amountMl,
      linkedEventId: null,
      occurredAt: Timestamp.now(),
    })
  })
}

/** Écarter un contenant : la quantité restante est jetée */
export async function discardContainer(userId: string, babyId: string, containerId: string) {
  await runTransaction(db, async (transaction) => {
    const ref = containerRef(userId, babyId, containerId)
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) throw new StockError('missing')
    const container = snapshot.data() as MilkContainer
    if (container.status !== 'available' && container.status !== 'used') throw new StockError('notInStock')
    transaction.update(ref, { remainingAmountMl: 0, status: 'discarded', updatedAt: serverTimestamp() })
    transaction.set(doc(operationsCollection(userId, babyId, containerId)), {
      type: 'discard',
      amountMl: container.remainingAmountMl,
      linkedEventId: null,
      occurredAt: Timestamp.now(),
    })
  })
}
