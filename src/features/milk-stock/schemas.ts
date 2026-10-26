import { z } from 'zod'
import { commentField, optionalIntField, pastDateTimeField } from '../../utils/formFields'

// Les messages sont des clés de traduction (src/i18n/locales/fr.ts)
export const pumpingSchema = z
  .object({
    occurredAt: pastDateTimeField(),
    side: z.enum(['left', 'right', 'both']),
    totalMl: z
      .number({ error: 'validation.required' })
      .int('validation.integer')
      .positive('bottle.validation.positive')
      .max(2000, 'bottle.validation.tooMuch'),
    leftMl: optionalIntField(1000, 'pumping.validation.amount'),
    rightMl: optionalIntField(1000, 'pumping.validation.amount'),
    durationMin: optionalIntField(300, 'pumping.validation.duration'),
    comment: commentField(),
    addToStock: z.boolean(),
    storageType: z.enum(['fridge', 'freezer', 'other']),
  })
  .refine(
    (values) =>
      values.side !== 'both' ||
      values.leftMl === '' ||
      values.rightMl === '' ||
      Number(values.leftMl) + Number(values.rightMl) === values.totalMl,
    { message: 'pumping.validation.sumMismatch', path: ['rightMl'] },
  )

export type PumpingFormValues = z.infer<typeof pumpingSchema>

export const stockUseSchema = z.object({
  amountMl: z.number({ error: 'validation.required' }).int('validation.integer').positive('stock.errors.invalidAmount'),
})

export type StockUseValues = z.infer<typeof stockUseSchema>
