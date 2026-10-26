import { describe, expect, it } from 'vitest'
import { ar } from './ar'
import { fr } from './fr'

// Le français fait foi : l'arabe doit avoir les mêmes textes, avec les mêmes variables {{…}}.
// Pluriels : le français a _one/_other, l'arabe les six formes de Intl.PluralRules('ar').

const AR_PLURALS = ['zero', 'one', 'two', 'few', 'many', 'other']

type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>()
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') entries.set(path, value)
    else for (const [subPath, text] of flatten(value, path)) entries.set(subPath, text)
  }
  return entries
}

const variables = (text: string) => new Set([...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]))
const pluralBase = (key: string) => key.match(/^(.*)_(zero|one|two|few|many|other)$/)?.[1] ?? null

const frTexts = flatten(fr)
const arTexts = flatten(ar)

describe('traduction arabe', () => {
  it('a tous les textes du français, et rien de plus', () => {
    const expected = new Set<string>()
    for (const key of frTexts.keys()) {
      const base = pluralBase(key)
      if (base) for (const form of AR_PLURALS) expected.add(`${base}_${form}`)
      else expected.add(key)
    }
    expect([...expected].filter((key) => !arTexts.has(key))).toEqual([])
    expect([...arTexts.keys()].filter((key) => !expected.has(key))).toEqual([])
  })

  it('garde les mêmes variables (un pluriel peut écrire le nombre en toutes lettres)', () => {
    const mismatches: string[] = []
    for (const [key, text] of arTexts) {
      const base = pluralBase(key)
      const source = base ? frTexts.get(`${base}_other`) : frTexts.get(key)
      const expected = variables(source ?? '')
      const actual = variables(text)
      const same = base
        ? [...actual].every((name) => expected.has(name))
        : actual.size === expected.size && [...actual].every((name) => expected.has(name))
      if (!same) mismatches.push(key)
    }
    expect(mismatches).toEqual([])
  })

  it('aucun emoji dans les traductions (icônes de l’interface à la place)', () => {
    const withEmoji = [...frTexts, ...arTexts].filter(([, text]) => /\p{Extended_Pictographic}/u.test(text))
    expect(withEmoji.map(([key]) => key)).toEqual([])
  })

  it('les pluriels arabes couvrent chaque catégorie de Intl.PluralRules', () => {
    const rules = new Intl.PluralRules('ar-MA')
    const categories = new Set([0, 1, 2, 3, 11, 100].map((count) => rules.select(count)))
    expect([...categories].sort()).toEqual([...AR_PLURALS].sort())
  })
})
