// Blocs repliables de l'accueil (« Prévu aujourd'hui », « Dernières fois ») : ouverts par défaut,
// le choix est gardé sur l'appareil (simple confort d'affichage).

export function readOpen(storageKey: string) {
  try {
    return localStorage.getItem(storageKey) !== 'false'
  } catch {
    return true
  }
}

export function saveOpen(storageKey: string, open: boolean) {
  try {
    localStorage.setItem(storageKey, String(open))
  } catch {
    // Choix gardé pour cette visite seulement
  }
}
