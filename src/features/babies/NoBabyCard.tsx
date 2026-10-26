import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { cardClass, primaryButton } from '../../components/styles'
import { IconMoodKid } from '@tabler/icons-react'
import { IconBadge } from '../../components/IconBadge'

/** Invitation à créer le premier profil quand aucun bébé n'est suivi */
export function NoBabyCard() {
  const { t } = useTranslation()

  return (
    <section className={`${cardClass} flex flex-col items-center gap-3 text-center`}>
      <IconBadge spec={{ icon: IconMoodKid, tone: 'rose' }} size="lg" />
      <h2 className="text-lg font-semibold text-slate-800">{t('dashboard.noBaby.title')}</h2>
      <p className="text-slate-600">{t('dashboard.noBaby.text')}</p>
      <Link to="/babies/new" className={primaryButton}>
        {t('dashboard.noBaby.cta')}
      </Link>
    </section>
  )
}
