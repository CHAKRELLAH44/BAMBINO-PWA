import { ICONS, type IconSpec } from '../../components/icons'
import type { ReminderService } from '../../types/reminder'

export const SERVICE_ICONS: Record<ReminderService, IconSpec> = {
  medication: ICONS.medication,
  supplement: ICONS.supplement,
  hydration: ICONS.hydration,
  meal: ICONS.meal,
  bottle: ICONS.bottle,
  breastfeeding: ICONS.breastfeeding,
  diaper: ICONS.diaper,
  sleep: ICONS.sleep,
  custom: ICONS.custom,
}

/** Les médicaments et vitamines sont des « traitements » : nom + instructions saisies par la maman */
export const isTreatment = (service: ReminderService) => service === 'medication' || service === 'supplement'
