import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { durationParts } from '../utils/formatDuration'

/** Durée lisible dans la langue de `t` : « 12 min », « 8 h 05 », « 24 h » (aussi pour le PDF en français) */
export function formatDurationText(t: TFunction, ms: number) {
  if (ms > 0 && ms < 60_000) return t('duration.lessThanMinute')
  const { hours, minutes } = durationParts(ms)
  if (hours === 0) return t('duration.minutes', { minutes })
  if (minutes === 0) return t('duration.hours', { hours })
  return t('duration.hoursMinutes', { hours, minutes: String(minutes).padStart(2, '0') })
}

/** Durée lisible dans la langue de l'interface */
export function useFormatDuration() {
  const { t } = useTranslation()
  return (ms: number) => formatDurationText(t, ms)
}
