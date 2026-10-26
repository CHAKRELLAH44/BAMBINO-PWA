import { addMonths, eachDayOfInterval, getDay, isSameDay, startOfMonth, subDays } from 'date-fns'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cardClass } from '../../components/styles'
import { dayKey } from '../../utils/timeRanges'
import { useBabyEvents } from '../history/useBabyEvents'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

// Lundi 1er janvier 2024 : sert à nommer les jours de la semaine dans la langue de l'interface
const MONDAY = new Date(2024, 0, 1)

/** Calendrier (§17.2) : choisir une date et repérer les jours avec activités */
export function MonthCalendar({
  babyId,
  selected,
  onSelect,
}: {
  babyId: string
  selected: Date
  onSelect: (day: Date) => void
}) {
  const { t, i18n } = useTranslation()
  const [month, setMonth] = useState(() => startOfMonth(selected))
  const monthEnd = addMonths(month, 1)
  const { events } = useBabyEvents(babyId, { from: month, to: monthEnd, maxCount: 1000 })
  const marked = new Set(events.map((event) => dayKey(event.occurredAt.toDate())))

  const days = eachDayOfInterval({ start: month, end: subDays(monthEnd, 1) })
  const leadingBlanks = (getDay(month) + 6) % 7 // semaine commençant le lundi
  const weekdayFormat = new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow' })
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    weekdayFormat.format(new Date(MONDAY.getFullYear(), MONDAY.getMonth(), MONDAY.getDate() + i)),
  )
  const monthLabel = new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(month)
  const dayLabel = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long' })

  return (
    <section className={`${cardClass} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={t('journal.previousMonth')}
          onClick={() => setMonth(addMonths(month, -1))}
          className="rounded-full px-3 py-1 text-slate-600 hover:bg-rose-50"
        >
          <IconChevronLeft aria-hidden="true" size={20} className="rtl:rotate-180" />
        </button>
        <p className="font-semibold text-slate-700 first-letter:uppercase">{monthLabel}</p>
        <button
          type="button"
          aria-label={t('journal.nextMonth')}
          onClick={() => setMonth(addMonths(month, 1))}
          className="rounded-full px-3 py-1 text-slate-600 hover:bg-rose-50"
        >
          <IconChevronRight aria-hidden="true" size={20} className="rtl:rotate-180" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {weekdays.map((weekday, i) => (
          <span key={i}>{weekday}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const hasActivity = marked.has(dayKey(day))
          const isSelected = isSameDay(day, selected)
          return (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              aria-label={`${dayLabel.format(day)}${hasActivity ? `, ${t('journal.hasActivity')}` : ''}`}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm ${
                isSelected ? 'bg-rose-500 font-semibold text-white' : 'text-slate-700 hover:bg-rose-50'
              }`}
            >
              {day.getDate()}
              <span
                aria-hidden="true"
                className={`mt-0.5 h-1.5 w-1.5 rounded-full ${hasActivity ? (isSelected ? 'bg-surface' : 'bg-rose-400') : 'bg-transparent'}`}
              />
            </button>
          )
        })}
      </div>
    </section>
  )
}
