import { useTranslation } from 'react-i18next'
import type { SegmentOption } from '../components/SegmentedControl'
import type { Language } from '../types/user'
import { LANGUAGES, languageOf } from './languagePreference'

/** Langue actuelle de l'interface et choix proposés, chacun écrit dans sa propre langue */
export function useLanguageOptions() {
  const { t, i18n } = useTranslation()
  const options: SegmentOption<Language>[] = LANGUAGES.map((language) => ({
    value: language,
    label: t(`languages.${language}`),
    lang: language,
  }))
  return { current: languageOf(i18n.language), options }
}
