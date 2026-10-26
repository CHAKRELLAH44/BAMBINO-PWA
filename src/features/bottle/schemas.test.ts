import { describe, expect, it } from 'vitest'
import { bottleSchema } from './schemas'

const valid = { occurredAt: '2026-10-21T10:00', consumedMl: 90, source: 'formula', containerId: '', comment: '' }

const messages = (input: object) => {
  const result = bottleSchema.safeParse({ ...valid, ...input })
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`)
}

describe('biberon : quantité bue et type de lait', () => {
  it('lait infantile ou maternel : la quantité bue suffit, 0 accepté (biberon refusé)', () => {
    expect(messages({})).toEqual([])
    expect(messages({ source: 'breastMilk', consumedMl: 0 })).toEqual([])
  })

  it('refuse une quantité négative ou trop grande', () => {
    expect(messages({ consumedMl: -5 })).toEqual(['consumedMl:bottle.validation.negative'])
    expect(messages({ consumedMl: 1500 })).toEqual(['consumedMl:bottle.validation.tooMuch'])
  })

  it('lait maternel (stock) : contenant obligatoire et quantité bue positive', () => {
    expect(messages({ source: 'stock', consumedMl: 0 })).toEqual([
      'containerId:bottle.validation.containerRequired',
      'consumedMl:bottle.validation.stockPositive',
    ])
    expect(messages({ source: 'stock', containerId: 'c1' })).toEqual([])
  })
})
