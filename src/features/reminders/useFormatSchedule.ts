import { useTranslation } from 'react-i18next'
import { useFormatDuration } from '../../i18n/useFormatDuration'
import type { Reminder } from '../../types/reminder'
import { formatDate } from '../../utils/formatDate'

// Lundi 1er janvier 2024 : sert à nommer les jours ISO (1 = lundi) dans la langue de l'interface
const weekdayName = (isoDay: number, language: string) =>
  new Intl.DateTimeFormat(language, { weekday: 'short' }).format(new Date(2024, 0, isoDay))

/** Horaire lisible : « à 08:00, 20:00 · lun., mer. · jusqu’au 25 octobre 2026 » */
export function useFormatSchedule() {
  const { t, i18n } = useTranslation()
  const formatDuration = useFormatDuration()

  return (reminder: Pick<Reminder, 'scheduleType' | 'scheduledTimes' | 'intervalMinutes' | 'daysOfWeek' | 'startDate' | 'endDate'>) => {
    const parts = [
      reminder.scheduleType === 'fixedTimes'
        ? t('reminders.schedule.times', { times: reminder.scheduledTimes.join(', ') })
        : t('reminders.schedule.interval', { duration: formatDuration((reminder.intervalMinutes ?? 0) * 60_000) }),
      reminder.daysOfWeek.length === 7
        ? t('reminders.schedule.everyDay')
        : [...reminder.daysOfWeek].sort().map((day) => weekdayName(day, i18n.language)).join(', '),
    ]
    if (reminder.startDate) parts.push(t('reminders.schedule.from', { date: formatDate(reminder.startDate.toDate(), i18n.language) }))
    if (reminder.endDate) parts.push(t('reminders.schedule.until', { date: formatDate(reminder.endDate.toDate(), i18n.language) }))
    return parts.join(' · ')
  }
}

export const weekdayLabel = weekdayName
