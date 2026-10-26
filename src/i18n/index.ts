import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Language } from '../types/user'
import { localeOf, readDeviceLanguage, saveDeviceLanguage } from './languagePreference'
import { ar } from './locales/ar'
import { fr } from './locales/fr'

// En développement, l'erreur de chargement indique aussi la cause la plus fréquente (règles non publiées)
const withDevHints = (locale: typeof fr | typeof ar) =>
  import.meta.env.DEV ? { ...locale, common: { ...locale.common, loadError: locale.common.loadErrorDev } } : locale

// Arabe en RTL (§23) : `lang` et `dir` de la page suivent la langue choisie
const applyDocumentLanguage = (locale: string) => {
  if (typeof document === 'undefined') return // tests sans page
  document.documentElement.lang = locale
  document.documentElement.dir = i18n.dir(locale)
}

i18n.on('languageChanged', applyDocumentLanguage)

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: withDevHints(fr) }, ar: { translation: withDevHints(ar) } },
  lng: localeOf(readDeviceLanguage()),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
})

/** Change la langue de l'interface et la mémorise sur l'appareil */
export function changeAppLanguage(language: Language) {
  saveDeviceLanguage(language)
  if (i18n.language !== localeOf(language)) void i18n.changeLanguage(localeOf(language))
}

export default i18n
