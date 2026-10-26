// Planifications masquées de l'accueil par la maman, pour le jour J seulement (rien n'est supprimé).
// Gardé sur l'appareil : simple confort d'affichage, effacé avec le compte (clés « bambino.….{userId}… »).

const PREFIX = 'bambino.hiddenPins.'
const storageKey = (userId: string, day: string) => `${PREFIX}${userId}.${day}`

export function readHiddenPins(userId: string, day: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey(userId, day)) ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

/** Masque une planification pour aujourd'hui et oublie les jours précédents */
export function hidePin(userId: string, day: string, id: string): string[] {
  const hidden = [...new Set([...readHiddenPins(userId, day), id])]
  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index) ?? '')
    for (const key of keys) {
      if (key.startsWith(`${PREFIX}${userId}.`) && key !== storageKey(userId, day)) localStorage.removeItem(key)
    }
    localStorage.setItem(storageKey(userId, day), JSON.stringify(hidden))
  } catch {
    // Stockage indisponible : masqué jusqu'au prochain chargement seulement
  }
  return hidden
}

/** Clé du bloc « Prévu aujourd'hui » ouvert ou fermé (CollapsibleSection) */
export const PINS_OPEN_KEY = 'bambino.pinsOpen'
