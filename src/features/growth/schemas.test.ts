import { describe, expect, it } from 'vitest'
import { growthSchema } from './schemas'

const birthDate = new Date(2026, 8, 1)
const valid = { type: 'weight', label: '', unit: '', value: '4,2', measuredAt: '2026-10-20T10:00', comment: '' }

const messages = (input: object) => {
  const result = growthSchema(birthDate).safeParse({ ...valid, ...input })
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`)
}

describe('saisie d’une mesure de croissance (§15)', () => {
  it('accepte un poids avec virgule', () => {
    expect(messages({})).toEqual([])
  })

  it('refuse le texte, le zéro et un poids saisi en grammes', () => {
    expect(messages({ value: 'abc' })).toEqual(['value:growth.validation.number'])
    expect(messages({ value: '0' })).toEqual(['value:growth.validation.number'])
    expect(messages({ value: '3450' })).toEqual(['value:growth.validation.weight'])
  })

  it('mesure personnalisée : nom et unité obligatoires', () => {
    expect(messages({ type: 'custom' })).toEqual(['label:validation.required', 'unit:validation.required'])
    expect(messages({ type: 'custom', label: 'Tour de bras', unit: 'cm', value: '11' })).toEqual([])
  })

  it('refuse une mesure avant la naissance', () => {
    expect(messages({ measuredAt: '2026-08-15T10:00' })).toEqual(['measuredAt:growth.validation.beforeBirth'])
  })
})
