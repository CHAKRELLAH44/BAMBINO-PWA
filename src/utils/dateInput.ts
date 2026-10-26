import { format, isValid, parseISO } from 'date-fns'

// Conversions entre Date et la valeur des champs <input type="date"> / <input type="datetime-local">
// (toujours dans le fuseau horaire de l'appareil)

export const toDateInputValue = (date: Date) => format(date, 'yyyy-MM-dd')

export const toDateTimeInputValue = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm")

/** Avec les secondes, pour les chronomètres (champ avec step="1") */
export const toDateTimeSecondsInputValue = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss")

/** '2026-10-21' ou '2026-10-21T14:30' → Date locale, ou null si la valeur est invalide */
export function parseInputValue(value: string): Date | null {
  if (!value) return null
  const date = parseISO(value)
  return isValid(date) ? date : null
}
