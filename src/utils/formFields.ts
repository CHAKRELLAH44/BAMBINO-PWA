import { addMinutes } from 'date-fns'
import { z } from 'zod'
import { parseInputValue } from './dateInput'

// Champs de formulaire réutilisables (messages = clés de traduction)

/** Date et heure passées (5 min de tolérance pour l'horloge du téléphone) */
export const pastDateTimeField = () =>
  z
    .string()
    .min(1, 'validation.required')
    .refine((value) => parseInputValue(value) !== null, 'validation.invalidDate')
    .refine((value) => {
      const date = parseInputValue(value)
      return !date || date <= addMinutes(new Date(), 5)
    }, 'validation.future')

/** Nombre entier facultatif saisi dans un champ texte ('' = non renseigné) */
export const optionalIntField = (max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || (/^\d+$/.test(value) && Number(value) <= max), message)

export const parseOptionalInt = (value: string) => (value.trim() === '' ? null : Number(value))

export const optionalIntToField = (value: number | null) => (value === null ? '' : String(value))

export const commentField = () => z.string().trim().max(500, 'validation.tooLong')
