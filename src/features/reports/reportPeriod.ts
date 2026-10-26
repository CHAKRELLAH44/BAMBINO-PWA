import { addDays, differenceInCalendarDays, startOfDay, subDays } from 'date-fns'

export const REPORT_PERIODS = ['day', 'week', 'month', 'custom'] as const
export type ReportPeriod = (typeof REPORT_PERIODS)[number]

/** Au plus un an par rapport (lectures Firestore du plan gratuit) */
const MAX_DAYS = 366

/**
 * Bornes [from, to) d'un rapport (§18) : le jour choisi, les 7 ou 30 jours qui se terminent le jour choisi,
 * ou du … au … inclus. null si la période n'est pas valable.
 */
export function reportRange(
  period: ReportPeriod,
  day: Date | null,
  customFrom: Date | null,
  customTo: Date | null,
): { from: Date; to: Date } | null {
  if (period === 'custom') {
    if (!customFrom || !customTo) return null
    const from = startOfDay(customFrom)
    const to = addDays(startOfDay(customTo), 1)
    const days = differenceInCalendarDays(to, from)
    return days >= 1 && days <= MAX_DAYS ? { from, to } : null
  }
  if (!day) return null
  const to = addDays(startOfDay(day), 1)
  const length = period === 'day' ? 1 : period === 'week' ? 7 : 30
  return { from: subDays(to, length), to }
}
