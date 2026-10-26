import { addDays, startOfDay, subDays } from 'date-fns'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { cardClass, errorText } from '../components/styles'
import { useAppointments } from '../features/appointments/useAppointments'
import { useUserId } from '../features/auth/useAuth'
import { useUserProfile } from '../features/auth/useUserProfile'
import { BabyAvatar } from '../features/babies/BabyAvatar'
import { NoBabyCard } from '../features/babies/NoBabyCard'
import { useActiveBaby } from '../features/babies/useActiveBaby'
import { useFormatBabyAge } from '../features/babies/useFormatBabyAge'
import { sessionDurations } from '../features/breastfeeding/session'
import { EVENT_ICONS } from '../features/history/eventPaths'
import { EventListItem } from '../features/history/EventListItem'
import { useBabyEvents } from '../features/history/useBabyEvents'
import { dailyProgress } from '../features/medications/dailyIntakes'
import { usePersonalEvents } from '../features/mother-services/usePersonalEvents'
import { pumpingDurationMs } from '../features/milk-stock/pumpingSession'
import { useNow } from '../features/sessions/useNow'
import { SERVICE_ICONS } from '../features/reminders/reminderOptions'
import { useFormatSchedule } from '../features/reminders/useFormatSchedule'
import { useReminders } from '../features/reminders/useReminders'
import { useOngoingPumping } from '../features/sessions/useOngoingPumping'
import { useOngoingSessions } from '../features/sessions/useOngoingSessions'
import { MOTHER } from '../types/appointment'
import type { Baby } from '../types/baby'
import type { BabyEventType } from '../types/event'
import { formatDayHeading, formatShortDateTime, formatTime } from '../utils/formatDate'
import { dayKey } from '../utils/timeRanges'
import { hidePin, PINS_OPEN_KEY, readHiddenPins } from './hiddenPins'
import { lastFeedingSide, lastTimes, type LastTime } from './lastTimes'
import { todayPlans, type TodayPlan } from './todayPlans'
import { formatClock } from '../utils/formatDuration'
import { IconChevronRight, IconClockHour4, IconPinned, IconPlus, IconX } from '@tabler/icons-react'
import { formatDurationText } from '../i18n/useFormatDuration'
import { eventPath } from '../features/history/eventPaths'
import { eventSummaryText } from '../features/history/eventText'
import { IconBadge } from '../components/IconBadge'
import { ICONS } from '../components/icons'

const QUICK_ACTIONS: { to: string; type: BabyEventType }[] = [
  { to: '/bottle/new', type: 'bottle' },
  { to: '/breastfeeding', type: 'breastfeeding' },
  { to: '/sleep', type: 'sleep' },
  { to: '/diaper/new', type: 'diaper' },
  { to: '/pumping', type: 'milkPumping' },
]

/**
 * Accueil (§16) : « Bonjour » + prénom de la maman, date du jour, profil du bébé suivi,
 * bouton « + » vers les 6 saisies, séance en cours, rendez-vous prévu épinglé, activités du jour.
 */
export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { activeBaby } = useActiveBaby()
  const { profile } = useUserProfile()
  const [today] = useState(() => startOfDay(new Date()))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">
          {profile ? t('dashboard.helloName', { name: profile.displayName }) : t('dashboard.hello')}
        </h1>
        <p className="text-slate-500 first-letter:uppercase">{formatDayHeading(today, i18n.language)}</p>
      </div>

      {activeBaby ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
          <div className="flex flex-col gap-6">
            <BabyProfile baby={activeBaby} />
            <AddActivity />
            <OngoingSessionsCard babyId={activeBaby.id} />
            <LastTimesCard babyId={activeBaby.id} today={today} />
          </div>
          <div className="flex flex-col gap-6">
            <TodayPinned />
            <TodayEvents babyId={activeBaby.id} today={today} />
          </div>
        </div>
      ) : (
        <>
          <NoBabyCard />
          <TodayPinned />
        </>
      )}
    </div>
  )
}

/** Profil du bébé suivi, au centre ; on change de bébé dans la section Bébés */
function BabyProfile({ baby }: { baby: Baby }) {
  const formatAge = useFormatBabyAge()

  return (
    <section className="flex flex-col items-center gap-2 text-center">
      <BabyAvatar baby={baby} size="xl" />
      <p className="text-2xl font-semibold text-slate-800">{baby.name}</p>
      <p className="text-slate-500">{formatAge(baby.birthDate.toDate())}</p>
    </section>
  )
}

/** Bouton « + » : ouvre les 6 saisies (biberon, tétée, sommeil, couche, tirage, stock) */
function AddActivity() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <section className="flex flex-col items-center gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="add-activity"
        onClick={() => setOpen((current) => !current)}
        className="flex flex-col items-center gap-1 text-sm font-medium text-slate-700"
      >
        <span
          aria-hidden="true"
          className={`flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-4xl leading-none text-white shadow-lg transition-transform hover:bg-rose-600 ${
            open ? 'rotate-45' : ''
          }`}
        >
            <IconPlus size={34} stroke={2} />
        </span>
        {open ? t('common.close') : t('dashboard.quickAdd')}
      </button>
      {open && (
        <div id="add-activity" className="grid w-full grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.type}
              to={action.to}
              className={`${cardClass} flex flex-col items-center gap-1 px-2 hover:bg-rose-100`}
            >
              <IconBadge spec={EVENT_ICONS[action.type]} size="lg" />
              <span className="text-sm font-medium text-slate-700">{t(`events.types.${action.type}`)}</span>
            </Link>
          ))}
          <Link to="/stock" className={`${cardClass} flex flex-col items-center gap-1 px-2 hover:bg-rose-100`}>
            <IconBadge spec={ICONS.stock} size="lg" />
            <span className="text-center text-sm font-medium text-slate-700">{t('dashboard.stockLink')}</span>
          </Link>
        </div>
      )}
    </section>
  )
}

/**
 * Planifications du jour J épinglées (rendez-vous, médicaments, vitamines, rappels).
 * « × » les masque de l'accueil pour aujourd'hui seulement : rien n'est supprimé.
 */
function TodayPinned() {
  const { t, i18n } = useTranslation()
  const userId = useUserId()
  const { appointments } = useAppointments()
  const { reminders } = useReminders()
  const { events: personalEvents } = usePersonalEvents(200)
  const { babies } = useActiveBaby()
  const formatSchedule = useFormatSchedule()
  const [today] = useState(() => new Date())
  const day = dayKey(today)
  const [hidden, setHidden] = useState(() => readHiddenPins(userId, day))
  const plans = todayPlans(appointments, reminders, today, hidden)
  if (plans.length === 0) return null

  const personName = (id: string | null) => {
    if (id === null || id === MOTHER) return t('appointments.mother')
    return babies.find((candidate) => candidate.id === id)?.name ?? ''
  }

  const describe = (plan: TodayPlan) => {
    if (plan.kind === 'appointment') {
      const { appointment } = plan
      return {
        icon: ICONS.appointment,
        title: appointment.title,
        detail: [formatTime(appointment.scheduledAt.toDate(), i18n.language), personName(appointment.concerne), appointment.location]
          .filter(Boolean)
          .join(' · '),
        to: `/appointments/${appointment.id}`,
        done: false,
      }
    }
    const { reminder } = plan
    const treatment = reminder.serviceId === 'medication' || reminder.serviceId === 'supplement'
    // Traitement : où en est la journée (« 1 / 2 », puis « C'est fait pour aujourd'hui »)
    const progress = treatment ? dailyProgress(reminder, personalEvents, today) : null
    const progressText =
      progress && progress.total !== null
        ? progress.done
          ? t('treatments.doneToday')
          : t('treatments.progress', { taken: progress.taken, total: progress.total })
        : null
    return {
      icon: SERVICE_ICONS[reminder.serviceId],
      title: reminder.title,
      detail: [progressText, formatSchedule(reminder).split(' · ')[0], personName(reminder.babyId)].filter(Boolean).join(' · '),
      done: progress?.done ?? false,
      // Un traitement s'ouvre sur sa page, où l'on note « Prise effectuée »
      to:
        reminder.serviceId === 'medication'
          ? '/mother/medications'
          : reminder.serviceId === 'supplement'
            ? '/mother/supplements'
            : `/reminders/${reminder.id}?returnTo=/`,
    }
  }

  return (
    <CollapsibleSection
      title={t('dashboard.pinned')}
      icon={{ icon: IconPinned, tone: 'rose' }}
      badge={t('dashboard.pinnedCount', { count: plans.length })}
      storageKey={PINS_OPEN_KEY}
    >
      <ul className="flex flex-col gap-2">
        {plans.map((plan) => {
          const item = describe(plan)
          return (
            <li
              key={plan.id}
              className={`flex items-center gap-2 rounded-xl bg-surface p-3 shadow-sm ring-1 ${item.done ? 'ring-emerald-300' : 'ring-rose-200'}`}
            >
              <Link to={item.to} className="flex min-w-0 flex-1 items-center gap-3">
                <IconBadge spec={item.icon} />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{item.title}</span>
                  <span className={`block truncate text-sm ${item.done ? 'font-medium text-emerald-700' : 'text-slate-600'}`}>
                    {item.detail}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                aria-label={t('dashboard.hidePin', { title: item.title })}
                onClick={() => setHidden(hidePin(userId, day, plan.id))}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <IconX aria-hidden="true" size={18} />
              </button>
            </li>
          )
        })}
      </ul>
    </CollapsibleSection>
  )
}

/**
 * Dernières fois (§16) : il y a combien de temps la dernière tétée (et quel sein), le dernier biberon,
 * le réveil, la dernière couche, le dernier tirage. Simple rappel de ce qui a été noté, sans conseil.
 */
function LastTimesCard({ babyId, today }: { babyId: string; today: Date }) {
  const { t, i18n } = useTranslation()
  const [from] = useState(() => subDays(today, 7))
  const { events } = useBabyEvents(babyId, { from, maxCount: 150 })
  const now = useNow(true, 30_000)
  const items = lastTimes(events)
  if (items.length === 0) return null

  const ago = (at: Date) => {
    const elapsed = now.getTime() - at.getTime()
    if (elapsed < 60_000) return t('lastTimes.justNow')
    // Au-delà d'un jour, la date parle mieux qu'un nombre d'heures
    return elapsed < 86_400_000 ? t('lastTimes.ago', { duration: formatDurationText(t, elapsed) }) : null
  }

  const detail = ({ event, at }: LastTime) => {
    const time = elapsed(at, now) < 86_400_000 ? formatTime(at, i18n.language) : formatShortDateTime(at, i18n.language)
    const side = lastFeedingSide(event)
    if (side) return `${t('lastTimes.feedingStart', { time })} · ${t('lastTimes.lastSide', { side: t(`feeding.side.${side}`) })}`
    if (event.type === 'sleep') {
      const slept = formatDurationText(t, at.getTime() - event.startAt.toDate().getTime())
      return `${t('lastTimes.wokeUp', { time })} · ${t('lastTimes.slept', { duration: slept })}`
    }
    return `${time} · ${eventSummaryText(event, t, i18n.language)}`
  }

  return (
    <CollapsibleSection
      title={t('lastTimes.title')}
      icon={{ icon: IconClockHour4, tone: 'violet' }}
      storageKey="bambino.lastTimesOpen"
    >
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.type}>
            <Link
              to={eventPath(item.event)}
              className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-sm ring-1 ring-rose-100 hover:bg-rose-50"
            >
              <IconBadge spec={EVENT_ICONS[item.type]} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-800">{t(`events.types.${item.type}`)}</span>
                  {ago(item.at) && <span className="shrink-0 text-sm font-semibold text-rose-600">{ago(item.at)}</span>}
                </span>
                <span className="block truncate text-sm text-slate-600">{detail(item)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  )
}

const elapsed = (at: Date, now: Date) => now.getTime() - at.getTime()

/** Séance en cours (allaitement ou sommeil) avec sa durée, calculée par horodatage (§5, §16) */
function OngoingSessionsCard({ babyId }: { babyId: string }) {
  const { t } = useTranslation()
  const { feeding, sleep } = useOngoingSessions(babyId)
  const { pumping } = useOngoingPumping(babyId)
  const now = useNow(feeding?.session.status === 'running' || sleep !== null || pumping?.session.status === 'running')

  if (!feeding && !sleep && !pumping) return null

  return (
    <section className="flex flex-col gap-2">
      {feeding && (
        <Link to="/breastfeeding" className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <IconBadge spec={EVENT_ICONS.breastfeeding} />
          <span className="flex-1 font-medium text-slate-800">
            {t('events.types.breastfeeding')} ·{' '}
            {feeding.session.status === 'paused' ? t('feeding.paused') : t('common.ongoing')}
          </span>
          <span className="font-mono text-lg tabular-nums text-slate-800">
            {formatClock(sessionDurations(feeding.session, now).total)}
          </span>
        </Link>
      )}
      {sleep && (
        <Link to="/sleep" className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <IconBadge spec={EVENT_ICONS.sleep} />
          <span className="flex-1 font-medium text-slate-800">
            {t('events.types.sleep')} · {t('common.ongoing')}
          </span>
          <span className="font-mono text-lg tabular-nums text-slate-800">
            {formatClock(now.getTime() - sleep.startAt.getTime())}
          </span>
        </Link>
      )}
      {pumping && (
        <Link to="/pumping" className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <IconBadge spec={EVENT_ICONS.milkPumping} />
          <span className="flex-1 font-medium text-slate-800">
            {t('events.types.milkPumping')} ·{' '}
            {pumping.session.status === 'paused' ? t('feeding.paused') : t('common.ongoing')}
          </span>
          <span className="font-mono text-lg tabular-nums text-slate-800">
            {formatClock(pumpingDurationMs(pumping.session, now))}
          </span>
        </Link>
      )}
    </section>
  )
}

/** Ce qui a été fait aujourd'hui ; « Tout voir » mène à l'historique, et le journal du jour reste accessible */
function TodayEvents({ babyId, today }: { babyId: string; today: Date }) {
  const { t } = useTranslation()
  const { events, loading, loadError } = useBabyEvents(babyId, { from: today, to: addDays(today, 1) })

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-700">{t('dashboard.today')}</h2>
        <Link to="/history" className="text-sm font-medium text-rose-600">
          {t('dashboard.seeAll')}
        </Link>
      </div>
      {loading && <p className="text-slate-500">{t('common.loading')}</p>}
      {loadError && <p className={errorText}>{t('common.loadError')}</p>}
      {!loading && !loadError && events.length === 0 && (
        <p className="text-slate-600">{t('dashboard.noEventsToday')}</p>
      )}
      {events.map((event) => (
        <EventListItem key={event.id} event={event} />
      ))}
      <Link to="/journal" className={`${cardClass} mt-1 flex items-center gap-3 hover:bg-rose-100`}>
        <IconBadge spec={ICONS.journal} />
        <span className="flex-1 font-medium text-slate-700">{t('dashboard.journalLink')}</span>
        <IconChevronRight aria-hidden="true" size={20} className="text-slate-400 rtl:rotate-180" />
      </Link>
    </section>
  )
}
