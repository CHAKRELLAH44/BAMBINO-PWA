import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { BabyAvatar } from './BabyAvatar'
import { useActiveBaby } from './useActiveBaby'
import { useFormatBabyAge } from './useFormatBabyAge'
import { IconChevronRight } from '@tabler/icons-react'

/**
 * Rappel du bébé suivi sur les pages de saisie, en lecture seule :
 * on change de bébé uniquement dans la section Bébés (décision d'équipe du 22/10).
 */
export function ActiveBabyBadge() {
  const { t } = useTranslation()
  const { activeBaby } = useActiveBaby()
  const formatAge = useFormatBabyAge()
  if (!activeBaby) return null

  return (
    <Link
      to="/babies"
      aria-label={t('babies.activeBadge', { name: activeBaby.name })}
      className="flex items-center gap-3 rounded-xl hover:bg-rose-50"
    >
      <BabyAvatar baby={activeBaby} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-800">{activeBaby.name}</span>
        <span className="block text-xs text-slate-500">{formatAge(activeBaby.birthDate.toDate())}</span>
      </span>
      <IconChevronRight aria-hidden="true" size={20} className="text-slate-400 rtl:rotate-180" />
    </Link>
  )
}
