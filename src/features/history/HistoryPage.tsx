import { addDays, startOfDay, subDays } from 'date-fns'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/PageHeader'
import { errorText, inputClass, labelClass } from '../../components/styles'
import type { BabyEvent, BabyEventType } from '../../types/event'
import { parseInputValue, toDateInputValue } from '../../utils/dateInput'
import { formatDayHeading } from '../../utils/formatDate'
import { NoBabyCard } from '../babies/NoBabyCard'
import { useActiveBaby } from '../babies/useActiveBaby'
import { EventListItem } from './EventListItem'
import { HistoryTimeline } from './HistoryTimeline'
import { useBabyEvents } from './useBabyEvents'

const EVENT_TYPES: BabyEventType[] = ['bottle', 'breastfeeding', 'milkPumping', 'sleep', 'diaper']
const PERIODS = { today: 1, days7: 7, days30: 30, days90: 90 } as const
type Period = keyof typeof PERIODS | 'custom'
type View = 'list' | 'graph'
const VIEWS: View[] = ['list', 'graph']
const MAX_EVENTS = 500

interface DayGroup {
  key: string
  date: Date
  events: BabyEvent[]
}

/** Regroupe les événements (déjà triés du plus récent au plus ancien) par jour */
function groupByDay(events: BabyEvent[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const event of events) {
    const date = event.occurredAt.toDate()
    const key = toDateInputValue(date)
    const last = groups.at(-1)
    if (last?.key === key) last.events.push(event)
    else groups.push({ key, date, events: [event] })
  }
  return groups
}

/** Historique (§16) : filtres par période, type d'activité et bébé ; classement chronologique */
export function HistoryPage() {
  const { activeBaby } = useActiveBaby()
  if (!activeBaby) return <NoBabyCard />
  return <History key={activeBaby.id} activeBabyId={activeBaby.id} />
}

function History({ activeBabyId }: { activeBabyId: string }) {
  const { t, i18n } = useTranslation()
  const { babies } = useActiveBaby()
  const [today] = useState(() => startOfDay(new Date()))
  // Simple filtre : le bébé suivi ne change que dans la section Bébés. Les liens d'un autre bébé
  // (ou d'un bébé archivé) portent « ?baby=… » pour ouvrir le bon enregistrement.
  const [babyId, setBabyId] = useState(activeBabyId)
  const [view, setView] = useState<View>('list')
  const [type, setType] = useState<BabyEventType | 'all'>('all')
  const [period, setPeriod] = useState<Period>('days30')
  const [customFrom, setCustomFrom] = useState(() => toDateInputValue(subDays(today, 6)))
  const [customTo, setCustomTo] = useState(() => toDateInputValue(today))

  let from: Date | null
  let to: Date | null
  if (period === 'custom') {
    const fromDay = parseInputValue(customFrom)
    const toDay = parseInputValue(customTo)
    from = fromDay ? startOfDay(fromDay) : null
    to = toDay ? addDays(startOfDay(toDay), 1) : null
  } else {
    from = subDays(today, PERIODS[period] - 1)
    to = addDays(today, 1)
  }

  // La frise reprend aussi la veille : un sommeil commencé le soir précédent apparaît au matin du premier jour
  const queryFrom = view === 'graph' && from ? subDays(from, 1) : from
  const { events, loading, loadError } = useBabyEvents(babyId, { from: queryFrom, to, maxCount: MAX_EVENTS })
  const filtered = type === 'all' ? events : events.filter((event) => event.type === type)
  const baby = babies.find((candidate) => candidate.id === babyId)

  return (
    <>
      <PageHeader title={t('history.title')} />

      <div role="group" aria-label={t('history.view.label')} className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-surface p-1 ring-1 ring-slate-200">
        {VIEWS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={view === candidate}
            onClick={() => setView(candidate)}
            className={`rounded-md py-1.5 text-sm font-medium ${
              view === candidate ? 'bg-rose-500 text-white' : 'text-slate-600 hover:bg-rose-50'
            }`}
          >
            {t(`history.view.${candidate}`)}
          </button>
        ))}
      </div>

      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {babies.length > 1 && (
          <div className="col-span-2 flex flex-col gap-1 md:col-span-1">
            <label htmlFor="baby" className={labelClass}>
              {t('history.filters.baby')}
            </label>
            <select id="baby" value={babyId} onChange={(e) => setBabyId(e.target.value)} className={inputClass}>
              {babies.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* La frise montre toujours sommeil, tétées et biberons : pas de filtre d'activité */}
        {view === 'list' && (
          <div className="flex flex-col gap-1">
            <label htmlFor="type" className={labelClass}>
              {t('history.filters.type')}
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as BabyEventType | 'all')}
              className={inputClass}
            >
              <option value="all">{t('history.filters.allTypes')}</option>
              {EVENT_TYPES.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {t(`events.types.${eventType}`)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={`flex flex-col gap-1 ${view === 'graph' ? 'col-span-2' : ''}`}>
          <label htmlFor="period" className={labelClass}>
            {t('history.filters.period')}
          </label>
          <select id="period" value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={inputClass}>
            {(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((key) => (
              <option key={key} value={key}>
                {t(`history.filters.periods.${key}`)}
              </option>
            ))}
            <option value="custom">{t('history.filters.periods.custom')}</option>
          </select>
        </div>
        {period === 'custom' && (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="from" className={labelClass}>
                {t('history.filters.from')}
              </label>
              <input id="from" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="to" className={labelClass}>
                {t('history.filters.to')}
              </label>
              <input id="to" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={inputClass} />
            </div>
          </>
        )}
      </section>

      {loading && <p className="text-slate-500">{t('common.loading')}</p>}
      {loadError && <p className={errorText}>{t('common.loadError')}</p>}
      {view === 'graph' && !loading && !loadError && from && to && (
        <HistoryTimeline events={events} from={from} to={to} babyId={babyId === activeBabyId ? undefined : babyId} />
      )}

      {view === 'list' && !loading && !loadError && filtered.length === 0 && (
        <p className="text-slate-600">
          {events.length === 0 && type === 'all' && baby
            ? t('history.empty', { name: baby.name })
            : t('history.emptyFiltered')}
        </p>
      )}

      <div className="flex flex-col gap-5">
        {view === 'list' && groupByDay(filtered).map((group) => (
          <section key={group.key} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-slate-500 first-letter:uppercase">
              {formatDayHeading(group.date, i18n.language)}
            </h2>
            {group.events.map((event) => (
              <EventListItem
                key={event.id}
                event={event}
                babyId={babyId === activeBabyId ? undefined : babyId}
              />
            ))}
          </section>
        ))}
      </div>

      {events.length === MAX_EVENTS && (
        <p className="mt-4 text-xs text-slate-500">{t('history.limitNote', { count: MAX_EVENTS })}</p>
      )}
    </>
  )
}
