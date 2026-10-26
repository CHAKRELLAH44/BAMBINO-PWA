import { z } from 'zod'
import { BABY_THEME_COLORS } from '../../types/baby'
import { parseInputValue } from '../../utils/dateInput'
import { MAX_PHOTO_LENGTH } from '../../utils/photo'

// Les messages sont des clés de traduction (src/i18n/locales/fr.ts)
export const babySchema = z.object({
  name: z.string().trim().min(1, 'validation.required').max(50, 'validation.tooLong'),
  birthDate: z
    .string()
    .min(1, 'validation.required')
    .refine((value) => parseInputValue(value) !== null, 'validation.invalidDate')
    .refine((value) => {
      const date = parseInputValue(value)
      return !date || date <= new Date()
    }, 'babies.validation.birthDateFuture'),
  sex: z.enum(['unspecified', 'female', 'male']),
  avatarEmoji: z.string().min(1, 'validation.required'),
  themeColor: z.enum(['none', ...BABY_THEME_COLORS]),
  /** '' = pas de photo */
  photo: z.string().max(MAX_PHOTO_LENGTH, 'babies.validation.photoTooLarge'),
})

export type BabyFormValues = z.infer<typeof babySchema>
