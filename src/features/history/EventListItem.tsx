import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { isOngoing, type BabyEvent } from '../../types/event'
import { formatShortDateTime, formatTime } from '../../utils/formatDate'
import { EVENT_ICONS, eventPath } from './eventPaths'
import { eventSummaryText } from './eventText'
import { IconBadge } from '../../components/IconBadge'

/** Une ligne d'activité ; le clic ouvre l'enregistrement d'origine (§17.2) */
export function EventListItem({
  event,
  showDate = false,
  babyId,
}: {
  event: BabyEvent
  showDate?: boolean
  /** Bébé de l'événement, si ce n'est pas forcément le bébé suivi */
  babyId?: string
}) {
  const { t, i18n } = useTranslation()
  const date = event.occurredAt.toDate()
  const ongoing = isOngoing(event)

  return (
    <Link
      to={eventPath(event, babyId)}
      className={`flex items-center gap-3 rounded-xl p-3 shadow-sm hover:bg-rose-50 ${ongoing ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-surface'}`}
    >
      <IconBadge spec={EVENT_ICONS[event.type]} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{t(`events.types.${event.type}`)}</span>
          {ongoing && (
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">
              {t('common.ongoing')}
            </span>
          )}
        </span>
        <span className="block text-sm text-slate-600">
          {eventSummaryText(event, t, i18n.language)}
        </span>
        {event.comment && <span className="block truncate text-sm text-slate-500">{event.comment}</span>}
      </span>
      <time dateTime={date.toISOString()} className="shrink-0 text-sm text-slate-500">
        {showDate ? formatShortDateTime(date, i18n.language) : formatTime(date, i18n.language)}
      </time>
    </Link>
  )
}
