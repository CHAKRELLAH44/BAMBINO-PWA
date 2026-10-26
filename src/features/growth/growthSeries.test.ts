import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import type { GrowthRecord } from '../../types/growth'
import { availableSeries, formatMeasure, growthQuery, parseDecimal, parseSeriesId, seriesId, seriesPoints } from './growthSeries'

const at = (day: number) => Timestamp.fromDate(new Date(2026, 9, day))
const record = (id: string, type: GrowthRecord['type'], value: number, day: number, label: string | null = null): GrowthRecord => ({
  id,
  type,
  label,
  value,
  unit: type === 'weight' ? 'kg' : 'cm',
  measuredAt: at(day),
  comment: '',
  createdAt: at(day),
  updatedAt: at(day),
})

describe('parseDecimal', () => {
  it('accepte la virgule et le point', () => {
    expect(parseDecimal('3,45')).toBe(3.45)
    expect(parseDecimal(' 52.5 ')).toBe(52.5)
    expect(parseDecimal('4')).toBe(4)
  })

  it('refuse le vide, le texte, le zéro et le négatif', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('0')).toBeNull()
    expect(parseDecimal('-3')).toBeNull()
  })
})

describe('séries de croissance (§15)', () => {
  const records = [
    record('w2', 'weight', 4.1, 20),
    record('w1', 'weight', 3.5, 1),
    record('h1', 'height', 52, 1),
    record('c1', 'custom', 2, 5, 'Dents'),
    record('c2', 'custom', 30, 5, 'Bras'),
  ]

  it('une courbe par type, du plus ancien au plus récent', () => {
    expect(seriesPoints(records, { type: 'weight', label: null }).map((p) => p.value)).toEqual([3.5, 4.1])
    expect(seriesPoints(records, { type: 'height', label: null })).toHaveLength(1)
  })

  it('chaque mesure personnalisée a sa propre courbe', () => {
    const series = availableSeries(records)
    expect(series.filter((s) => s.type === 'custom').map((s) => s.label)).toEqual(['Bras', 'Dents'])
    expect(seriesPoints(records, { type: 'custom', label: 'Dents' }).map((p) => p.value)).toEqual([2])
  })
})

describe('adresse de la page Croissance', () => {
  it('seriesId et parseSeriesId sont inverses', () => {
    for (const key of [
      { type: 'weight', label: null },
      { type: 'headCircumference', label: null },
      { type: 'custom', label: 'Tour de bras' },
    ] as const) {
      expect(parseSeriesId(seriesId(key))).toEqual(key)
    }
    expect(parseSeriesId('bmi')).toBeNull()
    expect(parseSeriesId('custom:')).toBeNull()
    expect(parseSeriesId(null)).toBeNull()
  })

  it('le nom d’une mesure personnalisée est encodé dans l’adresse', () => {
    const query = growthQuery('b1', { type: 'custom', label: 'Tour de bras & cou' })
    expect(new URLSearchParams(query).get('series')).toBe('custom:Tour de bras & cou')
    expect(new URLSearchParams(query).get('baby')).toBe('b1')
  })

  it('sans bébé demandé, l’adresse suit le bébé de l’en-tête', () => {
    expect(growthQuery(null)).toBe('')
    expect(growthQuery(null, { type: 'weight', label: null })).toBe('?series=weight')
  })

  it('formate la valeur dans la langue de l’interface', () => {
    expect(formatMeasure(3.45, 'kg', 'fr')).toBe('3,45 kg')
  })
})
