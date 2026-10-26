import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { PageHeader } from '../../../components/PageHeader'
import { cardClass, errorText, primaryButton } from '../../../components/styles'
import type { Baby } from '../../../types/baby'
import { STANDARD_UNITS } from '../../../types/growth'
import { formatDate } from '../../../utils/formatDate'
import { NoBabyCard } from '../../babies/NoBabyCard'
import { useActiveBaby } from '../../babies/useActiveBaby'
import {
  availableSeries,
  formatMeasure,
  growthQuery,
  isInSeries,
  parseSeriesId,
  seriesId,
  seriesPoints,
  type SeriesKey,
} from '../growthSeries'
import { useGrowthRecords } from '../useGrowthRecords'
import { Notice } from '../../../components/Notice'

// Recharts n'est téléchargé qu'à l'ouverture d'une courbe
const GrowthChart = lazy(() => import('../GrowthChart').then((module) => ({ default: module.GrowthChart })))

/** Croissance (§15) : /growth[?baby=…][&series=…] ; sans « baby », le bébé suivi */
export function GrowthPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { babies, activeBaby, loading } = useActiveBaby()

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  const babyParam = searchParams.get('baby')
  const baby = babies.find((candidate) => candidate.id === (babyParam ?? activeBaby?.id))
  if (!baby) return babyParam ? <p className="text-slate-600">{t('growth.babyNotFound')}</p> : <NoBabyCard />
  return <Growth key={baby.id} baby={baby} babyParam={babyParam} />
}

function Growth({ baby, babyParam }: { baby: Baby; babyParam: string | null }) {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { records, loading, loadError } = useGrowthRecords(baby.id)

  const series = availableSeries(records)
  const requested = parseSeriesId(searchParams.get('series'))
  // La courbe demandée, sinon la première qui a des mesures, sinon le poids
  const selected =
    series.find((key) => requested !== null && seriesId(key) === seriesId(requested)) ??
    series.find((key) => records.some((record) => isInSeries(record, key))) ??
    series[0]
  const selectedRecords = records.filter((record) => isInSeries(record, selected))
  const points = seriesPoints(records, selected)
  const latest = selectedRecords[0]
  const unit = selected.type === 'custom' ? (latest?.unit ?? '') : STANDARD_UNITS[selected.type]
  const name = selected.type === 'custom' ? (selected.label ?? '') : t(`growth.types.${selected.type}`)
  const query = growthQuery(babyParam, selected)

  const select = (key: SeriesKey) => {
    const next = new URLSearchParams(searchParams)
    next.set('series', seriesId(key))
    setSearchParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader title={t('growth.title', { name: baby.name })} backTo="/babies" />
      <Notice className="mb-4">{t('growth.disclaimer')}</Notice>

      <div role="group" aria-label={t('growth.seriesPicker')} className="mb-4 flex flex-wrap gap-2">
        {series.map((key) => {
          const active = seriesId(key) === seriesId(selected)
          return (
            <button
              key={seriesId(key)}
              type="button"
              aria-pressed={active}
              onClick={() => select(key)}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                active ? 'bg-rose-500 text-white' : 'bg-surface text-slate-700 ring-1 ring-slate-200 hover:bg-rose-50'
              }`}
            >
              {key.type === 'custom' ? key.label : t(`growth.types.${key.type}`)}
            </button>
          )
        })}
      </div>

      {loadError && <p className={errorText}>{t('common.loadError')}</p>}

      <section className={`${cardClass} flex flex-col gap-2`}>
        <h2 className="font-semibold text-slate-700">{t('growth.seriesTitle', { name, unit })}</h2>
        {loading && <p className="text-slate-500">{t('common.loading')}</p>}
        {latest && (
          <p className="text-sm text-slate-600">
            {t('growth.latest', {
              value: formatMeasure(latest.value, latest.unit, i18n.language),
              date: formatDate(latest.measuredAt.toDate(), i18n.language),
            })}
          </p>
        )}
        {!loading && points.length === 0 && <p className="text-slate-600">{t('growth.empty')}</p>}
        {points.length > 0 && (
          <Suspense fallback={<div className="h-56" />}>
            <GrowthChart points={points} unit={unit} name={name} />
          </Suspense>
        )}
        {points.length === 1 && <p className="text-sm text-slate-500">{t('growth.onePoint')}</p>}
      </section>

      <Link to={`/growth/new${query}`} className={`${primaryButton} mt-4 block`}>
        {t('growth.add')}
      </Link>

      {selectedRecords.length > 0 && (
        <section className="mt-6 flex flex-col gap-2">
          <h2 className="font-semibold text-slate-700">{t('growth.measurements')}</h2>
          {selectedRecords.map((record) => {
            const date = record.measuredAt.toDate()
            return (
              <Link
                key={record.id}
                to={`/growth/${record.id}${query}`}
                className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-sm hover:bg-rose-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-slate-800">
                    {formatMeasure(record.value, record.unit, i18n.language)}
                  </span>
                  {record.comment && <span className="block truncate text-sm text-slate-500">{record.comment}</span>}
                </span>
                <time dateTime={date.toISOString()} className="shrink-0 text-sm text-slate-500">
                  {formatDate(date, i18n.language)}
                </time>
              </Link>
            )
          })}
        </section>
      )}
    </>
  )
}
