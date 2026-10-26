import { addDays, isSameDay, startOfDay, subDays } from 'date-fns'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { cardClass, errorText, secondaryButton } from '../../components/styles'
import { useFormatDuration } from '../../i18n/useFormatDuration'
import { parseInputValue } from '../../utils/dateInput'
import { formatDayHeading } from '../../utils/formatDate'
import { dayBounds, dayKey } from '../../utils/timeRanges'
import { AppointmentListItem } from '../appointments/AppointmentListItem'
import { useAppointments } from '../appointments/useAppointments'
import { NoBabyCard } from '../babies/NoBabyCard'
import { useActiveBaby } from '../babies/useActiveBaby'
import { EVENT_ICONS } from '../history/eventPaths'
import { EventListItem } from '../history/EventListItem'
import { useBabyEvents } from '../history/useBabyEvents'
import { belongsToDay, summarizeDay, type DaySummary } from './daySummary'
import { MonthCalendar } from './MonthCalendar'
import { IconCalendar, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { IconBadge } from '../../components/IconBadge'

/** Journal quotidien (§17) : il ne stocke rien, il relit les événements enregistrés */
export function JournalPage() {
  const { activeBaby } = useActiveBaby()
  const [searchParams, setSearchParams] = useSearchParams()
  const [today] = useState(() => startOfDay(new Date()))
  const requested = parseInputValue(searchParams.get('date') ?? '')
  const day = requested ? startOfDay(requested) : today

  if (!activeBaby) return <NoBabyCard />
  return (
    <JournalDay
      key={activeBaby.id}
      babyId={activeBaby.id}
      day={day}
      today={today}
      onChangeDay={(next) => setSearchParams({ date: dayKey(next) }, { replace: true })}
    />
  )
}

function JournalDay({
  babyId,
  day,
  today,
  onChangeDay,
}: {
  babyId: string
  day: Date
  today: Date
  onChangeDay: (day: Date) => void
}) {
  const { t, i18n } = useTranslation()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [now] = useState(() => new Date())
  const { start, end } = dayBounds(day)
  // La veille est incluse pour les nuits et tétées commencées avant minuit
  const { events, loading, loadError } = useBabyEvents(babyId, { from: subDays(start, 1), to: end, maxCount: 500 })

  const { appointments } = useAppointments(babyId)

  const dayEvents = events
    .filter((event) => belongsToDay(event, day, now))
    .sort((a, b) => a.occurredAt.toMillis() - b.occurredAt.toMillis())
  const summary = summarizeDay(dayEvents, day)

  // Chronologie : événements du bébé et ses rendez-vous du jour (§17.1), dans l'ordre horaire
  const chronology = [
    ...dayEvents.map((event) => ({
      key: `e-${event.id}`,
      at: event.occurredAt.toMillis(),
      node: <EventListItem event={event} showDate={!isSameDay(event.occurredAt.toDate(), day)} />,
    })),
    ...appointments
      .filter((appointment) => {
        const at = appointment.scheduledAt.toDate()
        return at >= start && at < end
      })
      .map((appointment) => ({
        key: `a-${appointment.id}`,
        at: appointment.scheduledAt.toMillis(),
        node: <AppointmentListItem appointment={appointment} showDate={false} showPerson={false} />,
      })),
  ].sort((a, b) => a.at - b.at)

  return (
    <>
      <PageHeader title={t('journal.title')} />

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t('journal.previousDay')}
          onClick={() => onChangeDay(subDays(day, 1))}
          className="rounded-full bg-surface px-3 py-2 text-slate-600 shadow-sm hover:bg-rose-50"
        >
          <IconChevronLeft aria-hidden="true" size={20} className="rtl:rotate-180" />
        </button>
        <p className="flex-1 text-center font-semibold text-slate-800 first-letter:uppercase">
          {formatDayHeading(day, i18n.language)}
        </p>
        <button
          type="button"
          aria-label={t('journal.nextDay')}
          onClick={() => onChangeDay(addDays(day, 1))}
          disabled={isSameDay(day, today)}
          className="rounded-full bg-surface px-3 py-2 text-slate-600 shadow-sm hover:bg-rose-50 disabled:opacity-40"
        >
          <IconChevronRight aria-hidden="true" size={20} className="rtl:rotate-180" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        {!isSameDay(day, today) && (
          <button type="button" onClick={() => onChangeDay(today)} className={`${secondaryButton} flex-1 text-sm`}>
            {t('journal.today')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setCalendarOpen((open) => !open)}
          aria-expanded={calendarOpen}
          className={`${secondaryButton} flex-1 text-sm`}
        >
          <span className="inline-flex items-center gap-2">
            <IconCalendar aria-hidden="true" size={18} stroke={1.75} />
            {t('journal.calendar')}
          </span>
        </button>
      </div>

      {calendarOpen && (
        <div className="mt-3">
          <MonthCalendar
            babyId={babyId}
            selected={day}
            onSelect={(selected) => {
              onChangeDay(selected)
              setCalendarOpen(false)
            }}
          />
        </div>
      )}

      {loading && <p className="mt-4 text-slate-500">{t('common.loading')}</p>}
      {loadError && <p className={`${errorText} mt-4`}>{t('common.loadError')}</p>}

      {!loading && !loadError && (
        <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-6">
          <SummaryCard summary={summary} />
          <section className="mt-5 flex flex-col gap-2 lg:mt-4">
            <h2 className="font-semibold text-slate-700">{t('journal.chronologyTitle')}</h2>
            {chronology.length === 0 && <p className="text-slate-600">{t('journal.empty')}</p>}
            {chronology.map((entry) => (
              <div key={entry.key}>{entry.node}</div>
            ))}
          </section>
        </div>
      )}
    </>
  )
}

function SummaryCard({ summary }: { summary: DaySummary }) {
  const { t } = useTranslation()
  const formatDuration = useFormatDuration()

  const rows = [
    {
      icon: EVENT_ICONS.bottle,
      main: t('journal.summary.bottles', { count: summary.bottles.count }),
      detail: summary.bottles.count > 0 ? t('journal.summary.bottlesVolume', { ml: summary.bottles.consumedMl }) : '',
    },
    {
      icon: EVENT_ICONS.breastfeeding,
      main: t('journal.summary.feedings', { count: summary.feedings.count }),
      detail: summary.feedings.count > 0 ? formatDuration(summary.feedings.durationMs) : '',
    },
    {
      icon: EVENT_ICONS.sleep,
      main: t('journal.summary.sleeps', { count: summary.sleeps.count }),
      detail: summary.sleeps.count > 0 ? formatDuration(summary.sleeps.durationMs) : '',
    },
    {
      icon: EVENT_ICONS.diaper,
      main: t('journal.summary.diapers', { count: summary.diapers.count }),
      detail:
        summary.diapers.count > 0
          ? t('journal.summary.diapersDetail', { wet: summary.diapers.wet, dirty: summary.diapers.dirty })
          : '',
    },
    {
      icon: EVENT_ICONS.milkPumping,
      main: t('journal.summary.pumpings', { count: summary.pumpings.count }),
      detail: summary.pumpings.count > 0 ? t('journal.summary.pumpingsVolume', { ml: summary.pumpings.totalMl }) : '',
    },
  ]

  return (
    <section className={`${cardClass} mt-4 flex flex-col gap-2`}>
      <h2 className="font-semibold text-slate-700">{t('journal.summaryTitle')}</h2>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li key={row.main} className="flex items-center gap-3 text-sm">
            <IconBadge spec={row.icon} size="sm" />
            <span className="font-medium text-slate-800">{row.main}</span>
            {row.detail && <span className="text-slate-500">· {row.detail}</span>}
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-400">{t('journal.summary.note')}</p>
    </section>
  )
}
