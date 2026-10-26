import { subDays } from 'date-fns'
import type { TFunction } from 'i18next'
import { formatDurationText } from '../../i18n/useFormatDuration'
import type { Appointment } from '../../types/appointment'
import type { Baby } from '../../types/baby'
import { isOngoing, type BabyEvent, type BabyEventType } from '../../types/event'
import type { GrowthRecord } from '../../types/growth'
import { formatDate, formatDayHeading, formatShortDateTime, formatTime } from '../../utils/formatDate'
import { dayKey } from '../../utils/timeRanges'
import { getBabyAge } from '../babies/babyAge'
import { summarizeRange } from '../daily-journal/daySummary'
import { availableSeries, formatMeasure, isInSeries, seriesPoints } from '../growth/growthSeries'
import { eventSummaryText } from '../history/eventText'

export const REPORT_CATEGORIES = [
  'bottle',
  'breastfeeding',
  'sleep',
  'diaper',
  'milkPumping',
  'appointments',
  'growth',
] as const
export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

export interface ReportInput {
  baby: Baby
  /** Bornes [from, to) */
  from: Date
  to: Date
  categories: ReportCategory[]
  includeGrowthCharts: boolean
  message: string
  events: BabyEvent[]
  appointments: Appointment[]
  growthRecords: GrowthRecord[]
  generatedAt: Date
}

export type Row = [string, string, string]

export interface GrowthChartData {
  title: string
  unit: string
  points: { time: number; value: number }[]
}

export interface SummaryCard {
  kind: BabyEventType
  label: string
  /** Nombre d'activités sur la période */
  value: string
  detail: string
}

/** Contenu d'un rapport, déjà traduit : le même sert au texte et au PDF (pas de double calcul) */
export interface ReportDocument {
  fileBase: string
  title: string
  info: string[]
  /** En-tête du PDF : marque, titre, bébé, période */
  header: { brand: string; title: string; babyName: string; details: string[]; period: string; generated: string }
  /** Résumé en cartes (PDF) ; le texte reprend `summary.rows` */
  cards: SummaryCard[]
  message: { title: string; text: string } | null
  summary: { title: string; columns: [string, string]; rows: [string, string][]; note: string } | null
  days: { title: string; columns: Row; groups: { heading: string; rows: Row[]; kinds: BabyEventType[] }[] } | null
  appointments: { title: string; columns: Row; rows: Row[] } | null
  growth: { title: string; note: string; columns: Row; rows: Row[]; charts: GrowthChartData[] } | null
  empty: string
  /** Deux-points du texte : « Biberons : … » en français, « الرضّاعات: … » en arabe */
  colon: string
  footer: string
  /** « Page {page} / {count} » : les nombres sont placés une fois le PDF terminé */
  pageLabel: string
}

const EVENT_CATEGORIES: BabyEventType[] = ['bottle', 'breastfeeding', 'sleep', 'diaper', 'milkPumping']

const startOf = (event: BabyEvent) =>
  event.type === 'sleep' || event.type === 'breastfeeding' ? event.startAt.toDate() : event.occurredAt.toDate()

const capitalize = (text: string, language: string) => text.charAt(0).toLocaleUpperCase(language) + text.slice(1)

/** Nom de fichier sans accents ni espaces : « bambino-rapport-lina-2026-10-15-2026-10-21 » */
function fileBase(name: string, from: Date, lastDay: Date) {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `bambino-rapport-${slug || 'bebe'}-${dayKey(from)}-${dayKey(lastDay)}`
}

/**
 * Rapport (§18) dans la langue de `t` : le PDF est construit avec le français, le texte avec la langue de
 * l'interface. Aucun avis médical : seulement les données saisies, résumées sans double comptage (§17.3).
 */
export function buildReportDocument(input: ReportInput, t: TFunction, language: string): ReportDocument {
  const { baby, from, to, categories } = input
  const has = (category: ReportCategory) => categories.includes(category)
  const lastDay = subDays(to, 1)
  const duration = (ms: number) => formatDurationText(t, ms)

  const info = [
    t('reports.doc.baby', { name: baby.name, date: formatDate(baby.birthDate.toDate(), language) }),
    t('reports.doc.period', { from: formatDate(from, language), to: formatDate(lastDay, language) }),
    t('reports.doc.generated', { date: formatShortDateTime(input.generatedAt, language) }),
  ]

  // Résumé de la période : la même règle que le résumé du jour, sur toute la période
  const totals = summarizeRange(input.events, from, to)
  const summaryValues: Record<BabyEventType, string> = {
    bottle: `${t('journal.summary.bottles', { count: totals.bottles.count })} · ${t('journal.summary.bottlesVolume', { ml: totals.bottles.consumedMl })}`,
    breastfeeding: `${t('journal.summary.feedings', { count: totals.feedings.count })} · ${duration(totals.feedings.durationMs)}`,
    sleep: `${t('journal.summary.sleeps', { count: totals.sleeps.count })} · ${duration(totals.sleeps.durationMs)}`,
    diaper: `${t('journal.summary.diapers', { count: totals.diapers.count })} · ${t('journal.summary.diapersDetail', { wet: totals.diapers.wet, dirty: totals.diapers.dirty })}`,
    milkPumping: `${t('journal.summary.pumpings', { count: totals.pumpings.count })} · ${t('journal.summary.pumpingsVolume', { ml: totals.pumpings.totalMl })}`,
  }
  const selectedTypes = EVENT_CATEGORIES.filter((type) => has(type))

  // Détail : chaque activité une seule fois, au jour où elle commence, du plus ancien au plus récent
  const unique = [...new Map(input.events.map((event) => [event.id, event])).values()]
  const listed = unique
    .filter((event) => has(event.type) && startOf(event) >= from && startOf(event) < to)
    .sort((a, b) => startOf(a).getTime() - startOf(b).getTime())
  const groups: { key: string; heading: string; rows: Row[]; kinds: BabyEventType[] }[] = []
  for (const event of listed) {
    const start = startOf(event)
    const key = dayKey(start)
    const detail = [
      eventSummaryText(event, t, language),
      isOngoing(event) ? t('reports.doc.ongoing') : '',
      event.comment ? `« ${event.comment} »` : '',
    ]
      .filter(Boolean)
      .join(' · ')
    const row: Row = [formatTime(start, language), t(`events.types.${event.type}`), detail]
    const last = groups.at(-1)
    if (last?.key === key) {
      last.rows.push(row)
      last.kinds.push(event.type)
    } else {
      groups.push({ key, heading: capitalize(formatDayHeading(start, language), language), rows: [row], kinds: [event.type] })
    }
  }

  const appointments = input.appointments
    .filter((appointment) => {
      const at = appointment.scheduledAt.toDate()
      return appointment.concerne === baby.id && at >= from && at < to
    })
    .sort((a, b) => a.scheduledAt.toMillis() - b.scheduledAt.toMillis())
    .map<Row>((appointment) => [
      formatShortDateTime(appointment.scheduledAt.toDate(), language),
      appointment.title,
      [t(`appointments.statuses.${appointment.status}`), appointment.location, appointment.contact]
        .filter(Boolean)
        .join(' · '),
    ])

  // Croissance : toutes les mesures jusqu'à la fin de la période, pour voir l'évolution
  const growthRecords = input.growthRecords
    .filter((record) => record.measuredAt.toDate() < to)
    .sort((a, b) => a.measuredAt.toMillis() - b.measuredAt.toMillis())
  const seriesName = (record: Pick<GrowthRecord, 'type' | 'label'>) =>
    record.type === 'custom' ? (record.label ?? '') : t(`growth.types.${record.type}`)
  const charts = input.includeGrowthCharts
    ? availableSeries(growthRecords)
        .map((key) => ({ key, points: seriesPoints(growthRecords, key) }))
        .filter(({ points }) => points.length >= 2)
        .map(({ key, points }) => {
          const unit = growthRecords.find((record) => isInSeries(record, key))?.unit ?? ''
          return {
            title: t('growth.seriesTitle', { name: seriesName(key), unit }),
            unit,
            points: points.map(({ time, value }) => ({ time, value })),
          }
        })
    : []

  const column = (name: string) => t(`reports.doc.columns.${name}`)
  const age = getBabyAge(baby.birthDate.toDate(), lastDay)
  const cardDetails: Record<BabyEventType, { count: number; detail: string }> = {
    bottle: { count: totals.bottles.count, detail: t('journal.summary.bottlesVolume', { ml: totals.bottles.consumedMl }) },
    breastfeeding: { count: totals.feedings.count, detail: duration(totals.feedings.durationMs) },
    sleep: { count: totals.sleeps.count, detail: duration(totals.sleeps.durationMs) },
    diaper: {
      count: totals.diapers.count,
      detail: t('journal.summary.diapersDetail', { wet: totals.diapers.wet, dirty: totals.diapers.dirty }),
    },
    milkPumping: { count: totals.pumpings.count, detail: t('journal.summary.pumpingsVolume', { ml: totals.pumpings.totalMl }) },
  }
  return {
    fileBase: fileBase(baby.name, from, lastDay),
    title: t('reports.doc.title', { name: baby.name }),
    info,
    header: {
      brand: t('common.appName'),
      title: t('reports.doc.heading'),
      babyName: baby.name,
      details: [
        t('reports.doc.born', { date: formatDate(baby.birthDate.toDate(), language) }),
        t('reports.doc.age', {
          age: age.unit === 'newborn' ? t('babies.age.newborn') : t(`babies.age.${age.unit}`, { count: age.count }),
        }),
      ],
      period: t('reports.doc.periodRange', { from: formatDate(from, language), to: formatDate(lastDay, language) }),
      generated: t('reports.doc.generated', { date: formatShortDateTime(input.generatedAt, language) }),
    },
    cards: selectedTypes.map((type) => ({
      kind: type,
      label: t(`reports.categories.${type}`),
      value: String(cardDetails[type].count),
      detail: cardDetails[type].detail,
    })),
    message: input.message.trim() ? { title: t('reports.doc.message'), text: input.message.trim() } : null,
    summary:
      selectedTypes.length > 0
        ? {
            title: t('reports.doc.sections.summary'),
            columns: [column('activity'), column('total')],
            rows: selectedTypes.map((type) => [t(`reports.categories.${type}`), summaryValues[type]]),
            note: t('journal.summary.note'),
          }
        : null,
    days:
      selectedTypes.length > 0
        ? {
            title: t('reports.doc.sections.days'),
            columns: [column('time'), column('activity'), column('detail')],
            groups: groups.map(({ heading, rows, kinds }) => ({ heading, rows, kinds })),
          }
        : null,
    appointments: has('appointments')
      ? {
          title: t('reports.doc.sections.appointments'),
          columns: [column('date'), column('appointment'), column('detail')],
          rows: appointments,
        }
      : null,
    growth: has('growth')
      ? {
          title: t('reports.doc.sections.growth'),
          note: t('reports.doc.growthNote', { date: formatDate(lastDay, language) }),
          columns: [column('date'), column('measure'), column('value')],
          rows: growthRecords.map<Row>((record) => [
            formatDate(record.measuredAt.toDate(), language),
            seriesName(record),
            formatMeasure(record.value, record.unit, language),
          ]),
          charts,
        }
      : null,
    colon: t('reports.doc.colon'),
    empty: t('reports.doc.empty'),
    footer: t('reports.doc.footer'),
    pageLabel: t('reports.doc.page', { page: '{page}', count: '{count}' }),
  }
}
