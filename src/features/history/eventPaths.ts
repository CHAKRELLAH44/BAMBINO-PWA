import { ICONS, type IconSpec } from '../../components/icons'
import { isOngoing, type BabyEvent, type BabyEventType } from '../../types/event'

export const EVENT_ICONS: Record<BabyEventType, IconSpec> = {
  bottle: ICONS.bottle,
  breastfeeding: ICONS.breastfeeding,
  milkPumping: ICONS.milkPumping,
  sleep: ICONS.sleep,
  diaper: ICONS.diaper,
}

const EDIT_PATHS: Record<BabyEventType, string> = {
  bottle: '/bottle',
  breastfeeding: '/breastfeeding',
  milkPumping: '/pumping',
  sleep: '/sleep',
  diaper: '/diaper',
}

/**
 * Ouvre l'enregistrement d'origine (§17.2) ; une séance en cours ouvre son chronomètre.
 * `babyId` : bébé de l'événement s'il peut différer du bébé suivi (ex. bébé archivé dans l'historique).
 */
export function eventPath(event: BabyEvent, babyId?: string) {
  const base = EDIT_PATHS[event.type]
  if (isOngoing(event)) return base
  return babyId ? `${base}/${event.id}?baby=${babyId}` : `${base}/${event.id}`
}
