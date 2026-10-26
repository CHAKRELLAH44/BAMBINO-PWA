import { addMinutes } from 'date-fns'
import { z } from 'zod'
import { parseInputValue } from '../../utils/dateInput'

const quantity = () => z.number({ error: 'validation.required' }).int('validation.integer')

/** Origine du lait choisie dans le formulaire ; « stock » = lait maternel pris dans un contenant tiré */
export const MILK_SOURCES = ['formula', 'breastMilk', 'stock'] as const
export type MilkSource = (typeof MILK_SOURCES)[number]

// Les messages sont des clés de traduction (src/i18n/locales/fr.ts)
export const bottleSchema = z
  .object({
    occurredAt: z
      .string()
      .min(1, 'validation.required')
      .refine((value) => parseInputValue(value) !== null, 'validation.invalidDate')
      .refine((value) => {
        const date = parseInputValue(value)
        return !date || date <= addMinutes(new Date(), 5)
      }, 'bottle.validation.future'),
    // Seule la quantité bue est demandée ; jamais négative
    consumedMl: quantity().min(0, 'bottle.validation.negative').max(1000, 'bottle.validation.tooMuch'),
    source: z.enum(MILK_SOURCES),
    /** Contenant du stock, obligatoire seulement pour « Lait maternel (stock) » */
    containerId: z.string(),
    comment: z.string().trim().max(500, 'validation.tooLong'),
  })
  .superRefine((values, ctx) => {
    if (values.source !== 'stock') return
    if (!values.containerId) {
      ctx.addIssue({ code: 'custom', path: ['containerId'], message: 'bottle.validation.containerRequired' })
    }
    if (values.consumedMl === 0) {
      ctx.addIssue({ code: 'custom', path: ['consumedMl'], message: 'bottle.validation.stockPositive' })
    }
  })

export type BottleFormValues = z.infer<typeof bottleSchema>
