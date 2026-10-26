import { ICONS, type IconSpec } from '../../components/icons'
import type { PersonalEventType } from '../../types/personal'

export const PERSONAL_ICONS: Record<PersonalEventType, IconSpec> = {
  hydration: ICONS.hydration,
  meal: ICONS.meal,
  motherMedication: ICONS.medication,
  supplement: ICONS.supplement,
}

/** Page de retour après enregistrement, selon le type */
export const PERSONAL_LIST_PATHS: Record<PersonalEventType, string> = {
  hydration: '/mother/hydration',
  meal: '/mother/meals',
  motherMedication: '/mother/medications',
  supplement: '/mother/supplements',
}
