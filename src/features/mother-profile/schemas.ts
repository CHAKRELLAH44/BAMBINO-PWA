import { z } from 'zod'
import { CONTACT_ROLES } from '../../types/mother'
import { commentField, pastDateTimeField } from '../../utils/formFields'
import { profileSchema } from '../auth/schemas'
import { parseDecimal } from '../growth/growthSeries'

// Les messages sont des clés de traduction (src/i18n/locales/fr.ts). Mêmes limites que firestore.rules.

export const motherInfoSchema = profileSchema.extend({
  heightCm: z
    .string()
    .trim()
    .refine((value) => value === '' || (/^\d{3}$/.test(value) && Number(value) >= 100 && Number(value) <= 230), 'motherProfile.validation.height'),
  notes: z.string().trim().max(2000, 'validation.tooLong'),
})

export type MotherInfoValues = z.infer<typeof motherInfoSchema>

export const motherWeightSchema = z.object({
  measuredAt: pastDateTimeField(),
  weightKg: z.string().refine((value) => {
    const weight = parseDecimal(value)
    return weight !== null && weight >= 20 && weight <= 300
  }, 'motherProfile.validation.weight'),
  comment: commentField(),
})

export type MotherWeightValues = z.infer<typeof motherWeightSchema>

export const motherContactSchema = z.object({
  role: z.enum(CONTACT_ROLES),
  name: z.string().trim().min(1, 'validation.required').max(100, 'validation.tooLong'),
  phone: z
    .string()
    .trim()
    .max(30, 'validation.tooLong')
    .regex(/^[0-9+(). -]*$/, 'motherProfile.validation.phone'),
})

export type MotherContactValues = z.infer<typeof motherContactSchema>
