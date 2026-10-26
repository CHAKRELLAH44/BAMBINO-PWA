import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { cardClass, errorText } from '../../components/styles'
import { MOTHER } from '../../types/appointment'
import { dayBounds } from '../../utils/timeRanges'
import { AppointmentListItem } from '../appointments/AppointmentListItem'
import { useAppointments } from '../appointments/useAppointments'
import { summarizeMotherDay } from './motherDaySummary'
import { PersonalEventListItem } from './PersonalEventListItem'
import { usePersonalEvents } from './usePersonalEvents'
import { IconFlower } from '@tabler/icons-react'
import { IconBadge } from '../../components/IconBadge'
import { ICONS } from '../../components/icons'

const SERVICES = [
  { to: '/mother/hydration', icon: ICONS.hydration, label: 'mother.hydration' },
  { to: '/mother/meals', icon: ICONS.meal, label: 'mother.meals' },
  { to: '/mother/medications', icon: ICONS.medication, label: 'mother.medications' },
  { to: '/mother/supplements', icon: ICONS.supplement, label: 'mother.supplements' },
  { to: `/appointments?for=${MOTHER}`, icon: ICONS.appointment, label: 'mother.appointments' },
  { to: '/reminders', icon: ICONS.reminder, label: 'mother.reminders' },
]

/** Espace de la maman (§12) : ses services et une vue séparée de sa journée (§17.1) */
export function MotherPage() {
  const { t } = useTranslation()
  const [today] = useState(() => new Date())
  const { events, loading, loadError } = usePersonalEvents(100)
  const { appointments } = useAppointments(MOTHER)
  const { start, end } = dayBounds(today)
  const todayEvents = events.filter((event) => {
    const at = event.occurredAt.toDate()
    return at >= start && at < end
  })
  const summary = summarizeMotherDay(events, today)
  const upcoming = appointments
    .filter((appointment) => appointment.status === 'planned' && appointment.scheduledAt.toDate() >= start)
    .slice(0, 3)

  return (
    <div className="flex flex-col gap-5">
      <h1 className="flex items-center gap-3 text-2xl font-semibold text-slate-800">
        <IconBadge spec={{ icon: IconFlower, tone: 'rose' }} />
        {t('mother.title')}
      </h1>

      <section className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {SERVICES.map((service) => (
          <Link key={service.to} to={service.to} className={`${cardClass} flex flex-col items-center gap-1 px-2 hover:bg-rose-100`}>
            <IconBadge spec={service.icon} size="lg" />
            <span className="text-center text-sm font-medium text-slate-700">{t(service.label)}</span>
          </Link>
        ))}
      </section>

      <section className={`${cardClass} flex flex-col gap-2`}>
        <h2 className="font-semibold text-slate-700">{t('mother.today')}</h2>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-slate-700 md:grid-cols-4">
          <li>
            <IconBadge spec={ICONS.hydration} size="sm" /> {t('mother.summary.hydration', { count: summary.hydration.count })}
            {summary.hydration.totalMl > 0 && (
              <span className="text-slate-500"> · {t('mother.summary.hydrationMl', { ml: summary.hydration.totalMl })}</span>
            )}
          </li>
          <li className="flex items-center gap-2">
            <IconBadge spec={ICONS.meal} size="sm" /> {t('mother.summary.meals', { count: summary.meals })}
          </li>
          <li className="flex items-center gap-2">
            <IconBadge spec={ICONS.medication} size="sm" /> {t('mother.summary.medications', { count: summary.medications })}
          </li>
          <li className="flex items-center gap-2">
            <IconBadge spec={ICONS.supplement} size="sm" /> {t('mother.summary.supplements', { count: summary.supplements })}
          </li>
        </ul>
      </section>

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-slate-700">{t('mother.upcoming')}</h2>
          {upcoming.map((appointment) => (
            <AppointmentListItem key={appointment.id} appointment={appointment} showPerson={false} />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-slate-700">{t('mother.todayList')}</h2>
        {loading && <p className="text-slate-500">{t('common.loading')}</p>}
        {loadError && <p className={errorText}>{t('common.loadError')}</p>}
        {!loading && !loadError && todayEvents.length === 0 && <p className="text-slate-600">{t('mother.noEvents')}</p>}
        {todayEvents.map((event) => (
          <PersonalEventListItem key={event.id} event={event} />
        ))}
      </section>
    </div>
  )
}
