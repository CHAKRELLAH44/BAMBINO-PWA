import { z } from 'zod'
import { REMINDER_SERVICES } from '../../types/reminder'
import { parseInputValue } from '../../utils/dateInput'
import { isTimeOfDay } from './schedule'

// Les messages sont des clés de traduction (src/i18n/locales/fr.ts)
export const reminderSchema = z
  .object({
    forWhom: z.string().min(1, 'validation.required'),
    serviceId: z.enum(REMINDER_SERVICES),
    title: z.string().trim().min(1, 'validation.required').max(80, 'validation.tooLong'),
    description: z.string().trim().max(500, 'validation.tooLong'),
    scheduleType: z.enum(['fixedTimes', 'interval']),
    times: z.array(z.object({ value: z.string() })),
    intervalHours: z.string().trim(),
    days: z.array(z.string()),
    startDate: z.string(),
    endDate: z.string(),
    enabled: z.boolean(),
  })
  .superRefine((values, context) => {
    const treatment = values.serviceId === 'medication' || values.serviceId === 'supplement'
    if (treatment) {
      const times = values.times.map((time) => time.value)
      if (times.length === 0 || !times.every(isTimeOfDay) || new Set(times).size !== times.length) {
        context.addIssue({ code: 'custom', path: ['times'], message: 'reminders.validation.treatmentTimes' })
      }
    } else if (values.scheduleType === 'fixedTimes' && !values.times.some((time) => isTimeOfDay(time.value))) {
      context.addIssue({ code: 'custom', path: ['times'], message: 'reminders.validation.times' })
    }
    if (!treatment && values.scheduleType === 'interval') {
      const hours = Number(values.intervalHours.replace(',', '.'))
      if (!Number.isFinite(hours) || hours < 0.25 || hours > 24) {
        context.addIssue({ code: 'custom', path: ['intervalHours'], message: 'reminders.validation.interval' })
      }
    }
    if (values.days.length === 0) {
      context.addIssue({ code: 'custom', path: ['days'], message: 'reminders.validation.days' })
    }
    const start = parseInputValue(values.startDate)
    const end = parseInputValue(values.endDate)
    if (start && end && end < start) {
      context.addIssue({ code: 'custom', path: ['endDate'], message: 'reminders.validation.dates' })
    }
  })

export type ReminderFormValues = z.infer<typeof reminderSchema>
