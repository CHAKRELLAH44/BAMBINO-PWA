import { startOfDay } from 'date-fns'
import { z } from 'zod'
import { GROWTH_TYPES, type GrowthType } from '../../types/growth'
import { parseInputValue } from '../../utils/dateInput'
import { commentField, pastDateTimeField } from '../../utils/formFields'
import { parseDecimal } from './growthSeries'

/** Bornes de saisie (fautes de frappe, ex. 3450 au lieu de 3,45 kg), les mêmes que firestore.rules */
export const MAX_VALUES: Record<GrowthType, number> = {
  weight: 50,
  height: 200,
  headCircumference: 200,
  custom: 100000,
}

/** Mesure de croissance (§15) : valeur positive, unité imposée sauf pour une mesure personnalisée */
export const growthSchema = (birthDate: Date) =>
  z
    .object({
      type: z.enum(GROWTH_TYPES),
      label: z.string().trim().max(50, 'validation.tooLong'),
      unit: z.string().trim().max(10, 'validation.tooLong'),
      value: z
        .string()
        .trim()
        .min(1, 'validation.required')
        .refine((value) => parseDecimal(value) !== null, 'growth.validation.number'),
      measuredAt: pastDateTimeField(),
      comment: commentField(),
    })
    .superRefine((values, ctx) => {
      const value = parseDecimal(values.value)
      if (value !== null && value > MAX_VALUES[values.type]) {
        ctx.addIssue({ code: 'custom', path: ['value'], message: `growth.validation.${values.type}` })
      }
      if (values.type === 'custom') {
        if (!values.label) ctx.addIssue({ code: 'custom', path: ['label'], message: 'validation.required' })
        if (!values.unit) ctx.addIssue({ code: 'custom', path: ['unit'], message: 'validation.required' })
      }
      const measuredAt = parseInputValue(values.measuredAt)
      if (measuredAt && measuredAt < startOfDay(birthDate)) {
        ctx.addIssue({ code: 'custom', path: ['measuredAt'], message: 'growth.validation.beforeBirth' })
      }
    })

export type GrowthFormValues = z.infer<ReturnType<typeof growthSchema>>
