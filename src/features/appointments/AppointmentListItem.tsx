import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { MOTHER, type Appointment } from '../../types/appointment'
import { formatShortDateTime, formatTime } from '../../utils/formatDate'
import { useActiveBaby } from '../babies/useActiveBaby'
import { IconBadge } from '../../components/IconBadge'
import { ICONS } from '../../components/icons'

const STATUS_CLASSES: Record<Appointment['status'], string> = {
  planned: 'bg-sky-100 text-sky-800',
  done: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-500 line-through',
}

/** Une ligne de rendez-vous (§13) ; le clic ouvre la fiche pour la modifier */
export function AppointmentListItem({
  appointment,
  showDate = true,
  showPerson = true,
  search = '',
}: {
  appointment: Appointment
  showDate?: boolean
  showPerson?: boolean
  /** Filtre de la liste à retrouver après l'enregistrement (« ?for=… ») */
  search?: string
}) {
  const { t, i18n } = useTranslation()
  const { babies } = useActiveBaby()
  const date = appointment.scheduledAt.toDate()
  const baby = babies.find((candidate) => candidate.id === appointment.concerne)
  const person =
    appointment.concerne === MOTHER ? t('appointments.mother') : (baby?.name ?? '')

  return (
    <Link
      to={`/appointments/${appointment.id}${search}`}
      className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-sm hover:bg-rose-50"
    >
      <IconBadge spec={ICONS.appointment} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium text-slate-800">{appointment.title}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[appointment.status]}`}>
            {t(`appointments.statuses.${appointment.status}`)}
          </span>
        </span>
        <span className="block truncate text-sm text-slate-600">
          {[showPerson ? person : '', appointment.location ?? '', appointment.contact ?? ''].filter(Boolean).join(' · ')}
        </span>
      </span>
      <time dateTime={date.toISOString()} className="shrink-0 text-sm text-slate-500">
        {showDate ? formatShortDateTime(date, i18n.language) : formatTime(date, i18n.language)}
      </time>
    </Link>
  )
}
