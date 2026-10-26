import type { GrowthRecord, GrowthType } from '../../types/growth'

/** « 3,45 » ou « 3.45 » → 3.45 ; null si ce n'est pas un nombre positif */
export function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null
  const number = Number(normalized)
  return number > 0 ? number : null
}

/** Une courbe = un type de mesure (et, pour les mesures personnalisées, un nom) */
export interface SeriesKey {
  type: GrowthType
  label: string | null
}

export const seriesId = (key: SeriesKey) => (key.type === 'custom' ? `custom:${key.label ?? ''}` : key.type)

/** Courbes disponibles : les mesures standard, puis chaque mesure personnalisée par nom */
export function availableSeries(records: GrowthRecord[]): SeriesKey[] {
  const series: SeriesKey[] = [
    { type: 'weight', label: null },
    { type: 'height', label: null },
    { type: 'headCircumference', label: null },
  ]
  const customLabels = [...new Set(records.filter((r) => r.type === 'custom').map((r) => r.label ?? ''))].sort()
  return [...series, ...customLabels.map((label) => ({ type: 'custom' as const, label }))]
}

export interface GrowthPoint {
  id: string
  time: number
  value: number
  unit: string
}

export const isInSeries = (record: GrowthRecord, key: SeriesKey) =>
  record.type === key.type && (key.type !== 'custom' || record.label === key.label)

/** Points d'une courbe, du plus ancien au plus récent (§15 : graphiques distincts par type) */
export function seriesPoints(records: GrowthRecord[], key: SeriesKey): GrowthPoint[] {
  return records
    .filter((record) => isInSeries(record, key))
    .map((record) => ({ id: record.id, time: record.measuredAt.toMillis(), value: record.value, unit: record.unit }))
    .sort((a, b) => a.time - b.time)
}

/** Inverse de `seriesId` (paramètre « series » de l'adresse) ; null si inconnu */
export function parseSeriesId(id: string | null): SeriesKey | null {
  if (id === 'weight' || id === 'height' || id === 'headCircumference') return { type: id, label: null }
  if (id?.startsWith('custom:') && id.length > 'custom:'.length) return { type: 'custom', label: id.slice('custom:'.length) }
  return null
}

/**
 * Paramètres de la page Croissance : « baby » seulement si un bébé précis a été demandé
 * (depuis son profil), sinon la page suit le bébé de l'en-tête ; « series » = courbe affichée.
 */
export function growthQuery(babyId: string | null, key?: SeriesKey) {
  const params = new URLSearchParams()
  if (babyId) params.set('baby', babyId)
  if (key) params.set('series', seriesId(key))
  const query = params.toString()
  return query ? `?${query}` : ''
}

/** « 3,45 kg » dans la langue de l'interface */
export const formatMeasure = (value: number, unit: string, language: string) =>
  `${new Intl.NumberFormat(language, { maximumFractionDigits: 3 }).format(value)} ${unit}`
