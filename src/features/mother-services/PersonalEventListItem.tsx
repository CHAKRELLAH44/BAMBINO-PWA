import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { PersonalEvent } from '../../types/personal'
import { formatShortDateTime, formatTime } from '../../utils/formatDate'
import { PERSONAL_ICONS } from './personalOptions'
import { IconBadge } from '../../components/IconBadge'

/** Une ligne d'activité de la maman ; le clic ouvre l'enregistrement pour le modifier */
export function PersonalEventListItem({ event, showDate = false }: { event: PersonalEvent; showDate?: boolean }) {
  const { t, i18n } = useTranslation()
  const date = event.occurredAt.toDate()

  let detail: string
  switch (event.type) {
    case 'hydration':
      detail = event.details.amountMl === null ? t('personal.amountUnknown') : t('common.ml', { ml: event.details.amountMl })
      break
    case 'meal':
      detail = [t(`personal.mealTypes.${event.details.mealType}`), event.details.composition].filter(Boolean).join(' · ')
      break
    default:
      detail = event.details.name
  }

  return (
    <Link
      to={`/mother/events/${event.id}`}
      className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-sm hover:bg-rose-50"
    >
      <IconBadge spec={PERSONAL_ICONS[event.type]} />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-slate-800">{t(`personal.types.${event.type}`)}</span>
        <span className="block truncate text-sm text-slate-600">{detail}</span>
        {event.comment && <span className="block truncate text-sm text-slate-500">{event.comment}</span>}
      </span>
      <time dateTime={date.toISOString()} className="shrink-0 text-sm text-slate-500">
        {showDate ? formatShortDateTime(date, i18n.language) : formatTime(date, i18n.language)}
      </time>
    </Link>
  )
}
