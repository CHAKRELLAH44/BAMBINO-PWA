import { IconChevronRight, IconFlower } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { IconBadge } from '../../components/IconBadge'
import { cardClass } from '../../components/styles'
import { formatShortDate } from '../../utils/formatDate'
import { useUserProfile } from '../auth/useUserProfile'
import { formatMeasure } from '../growth/growthSeries'
import { useMotherWeights } from './useMotherProfile'

/** Section Bébés : accès au profil de la maman, avec son dernier poids */
export function MotherProfileCard() {
  const { t, i18n } = useTranslation()
  const { profile } = useUserProfile()
  const { weights } = useMotherWeights()
  const latest = weights[0]

  return (
    <Link to="/account/profile" className={`${cardClass} flex items-center gap-3 hover:bg-rose-50`}>
      <IconBadge spec={{ icon: IconFlower, tone: 'rose' }} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-800">{t('motherProfile.title')}</span>
        <span className="block truncate text-sm text-slate-600">
          {[
            profile?.displayName,
            latest &&
              t('motherProfile.latestWeight', {
                value: formatMeasure(latest.weightKg, 'kg', i18n.language),
                date: formatShortDate(latest.measuredAt.toDate(), i18n.language),
              }),
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        <span className="block text-xs text-slate-500">{t('motherProfile.cardHint')}</span>
      </span>
      <IconChevronRight aria-hidden="true" size={20} className="shrink-0 text-slate-400 rtl:rotate-180" />
    </Link>
  )
}
