import type { TFunction } from 'i18next'
import { formatDurationText } from '../../i18n/useFormatDuration'
import { segmentsFromFirestore } from '../../services/repositories/eventRepository'
import type { BabyEvent } from '../../types/event'
import { formatTime } from '../../utils/formatDate'
import { sessionDurations } from '../breastfeeding/session'

/**
 * Résumé d'une activité en une ligne, dans la langue de `t` : historique, journal et rapports (§18).
 * Le volume bu au sein n'apparaît que s'il a été estimé, et toujours comme estimation (§7).
 */
export function eventSummaryText(event: BabyEvent, t: TFunction, language: string): string {
  const duration = (ms: number) => formatDurationText(t, ms)

  switch (event.type) {
    case 'bottle':
      // Seulement la quantité bue (décision d'équipe du 22/10)
      return `${t('bottle.summary', { consumed: event.details.consumedMl })} · ${
        event.details.containerId ? t('bottle.milkTypes.stock') : t(`bottle.milkTypes.${event.details.milkType}`)
      }`
    case 'breastfeeding': {
      // Une séance en cours affiche les durées figées au dernier enregistrement
      const segments = segmentsFromFirestore(event.details.segments)
      const durations = sessionDurations({ status: event.status, segments }, event.updatedAt.toDate())
      const estimate = (event.details.estimatedLeftMl ?? 0) + (event.details.estimatedRightMl ?? 0)
      const summary = t('feeding.summary', { left: duration(durations.left), right: duration(durations.right) })
      return estimate > 0 ? `${summary} · ${t('feeding.estimate', { ml: estimate })}` : summary
    }
    case 'sleep': {
      const start = event.startAt.toDate()
      if (!event.endAt) return t('sleep.since', { time: formatTime(start, language) })
      const end = event.endAt.toDate()
      return t('sleep.period', {
        start: formatTime(start, language),
        end: formatTime(end, language),
        duration: duration(end.getTime() - start.getTime()),
      })
    }
    case 'milkPumping':
      return t('pumping.summary', { total: event.details.totalMl, side: t(`pumping.sides.${event.details.side}`) })
    case 'diaper':
      return t(`diaper.kinds.${event.details.kind}`)
  }
}
