import type { Language } from '../types/user'

// Langue de l'interface (§23) : celle du compte quand la maman est connectée, sinon celle mémorisée
// sur l'appareil (pages de connexion). Même clé que le script de index.html (sens d'écriture avant l'affichage).

export const LANGUAGES: Language[] = ['fr', 'ar']

const STORAGE_KEY = 'bambino.language'

/** Code utilisé par i18next et Intl : arabe du Maroc (chiffres 0-9, noms de mois marocains) */
export const localeOf = (language: Language) => (language === 'ar' ? 'ar-MA' : 'fr')

export const languageOf = (locale: string): Language => (locale.startsWith('ar') ? 'ar' : 'fr')

export function readDeviceLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'fr'
  } catch {
    return 'fr'
  }
}

export function saveDeviceLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // stockage indisponible (navigation privée) : la langue vaut pour cette visite
  }
}
