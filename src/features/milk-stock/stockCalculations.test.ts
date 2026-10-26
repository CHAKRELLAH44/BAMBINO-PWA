import { describe, expect, it } from 'vitest'
import { applyStockUse, summarizeStock } from './stockCalculations'

describe('applyStockUse (§8.3)', () => {
  it('déduit la quantité et passe le contenant en « utilisé »', () => {
    expect(applyStockUse({ status: 'available', remainingAmountMl: 120 }, 80)).toEqual({
      ok: true,
      remainingAmountMl: 40,
      status: 'used',
    })
  })

  it('tout utiliser → « épuisé »', () => {
    expect(applyStockUse({ status: 'used', remainingAmountMl: 40 }, 40)).toEqual({
      ok: true,
      remainingAmountMl: 0,
      status: 'depleted',
    })
  })

  it('refuse si la quantité dépasse le stock', () => {
    expect(applyStockUse({ status: 'available', remainingAmountMl: 50 }, 60)).toEqual({
      ok: false,
      error: 'insufficient',
    })
  })

  it('refuse un contenant épuisé ou écarté, et une quantité nulle', () => {
    expect(applyStockUse({ status: 'depleted', remainingAmountMl: 0 }, 10)).toMatchObject({ error: 'notInStock' })
    expect(applyStockUse({ status: 'discarded', remainingAmountMl: 0 }, 10)).toMatchObject({ error: 'notInStock' })
    expect(applyStockUse({ status: 'available', remainingAmountMl: 50 }, 0)).toMatchObject({ error: 'invalidAmount' })
  })
})

describe('summarizeStock (§8.4)', () => {
  it('additionne le disponible, l’utilisé et compte les contenants', () => {
    expect(
      summarizeStock([
        { status: 'available', initialAmountMl: 100, remainingAmountMl: 100 },
        { status: 'used', initialAmountMl: 120, remainingAmountMl: 50 },
        { status: 'depleted', initialAmountMl: 80, remainingAmountMl: 0 },
        { status: 'discarded', initialAmountMl: 60, remainingAmountMl: 0 },
      ]),
    ).toEqual({ availableMl: 150, containersInStock: 2, usedMl: 150, discardedCount: 1 })
  })
})
