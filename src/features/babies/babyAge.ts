import { differenceInCalendarDays, differenceInMonths, differenceInYears } from 'date-fns'

export interface BabyAge {
  /** Clé de traduction sous babies.age (newborn, days, weeks, months, years) */
  unit: 'newborn' | 'days' | 'weeks' | 'months' | 'years'
  count: number
}

/** Âge calculé à partir de la date de naissance (cahier §4.1) */
export function getBabyAge(birthDate: Date, now: Date = new Date()): BabyAge {
  const days = differenceInCalendarDays(now, birthDate)
  if (days <= 0) return { unit: 'newborn', count: 0 }
  if (days < 14) return { unit: 'days', count: days }

  const months = differenceInMonths(now, birthDate)
  if (months < 2) return { unit: 'weeks', count: Math.floor(days / 7) }
  if (months < 24) return { unit: 'months', count: months }

  return { unit: 'years', count: differenceInYears(now, birthDate) }
}
