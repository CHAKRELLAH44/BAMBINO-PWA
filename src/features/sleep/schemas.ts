import { z } from 'zod'
import { parseInputValue } from '../../utils/dateInput'
import { commentField, pastDateTimeField } from '../../utils/formFields'

// Les messages sont des clés de traduction (src/i18n/locales/fr.ts)
export const sleepFormSchema = z
  .object({
    startAt: pastDateTimeField(),
    endAt: pastDateTimeField(),
    comment: commentField(),
  })
  .refine(
    (values) => {
      const start = parseInputValue(values.startAt)
      const end = parseInputValue(values.endAt)
      return !start || !end || end > start
    },
    { message: 'validation.endBeforeStart', path: ['endAt'] },
  )

export type SleepFormValues = z.infer<typeof sleepFormSchema>
