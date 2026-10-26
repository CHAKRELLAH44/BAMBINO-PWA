import { useTranslation } from 'react-i18next'
import { getBabyAge } from './babyAge'

/** Âge lisible (« 3 semaines », « 5 mois ») dans la langue de l'interface */
export function useFormatBabyAge() {
  const { t } = useTranslation()

  return (birthDate: Date) => {
    const age = getBabyAge(birthDate)
    return age.unit === 'newborn'
      ? t('babies.age.newborn')
      : t(`babies.age.${age.unit}`, { count: age.count })
  }
}
