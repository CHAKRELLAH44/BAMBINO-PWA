import { IconRefresh } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Notice } from '../components/Notice'
import { secondaryButton } from '../components/styles'

/**
 * Une page n'a pas pu s'ouvrir (le plus souvent : fichier de la page pas encore en cache et pas de réseau).
 * Le menu reste affiché ; « Réessayer » recharge l'application.
 */
export function RouteError() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3">
      <Notice tone="danger">{t('common.pageLoadError')}</Notice>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className={`${secondaryButton} flex items-center justify-center gap-2`}
      >
        <IconRefresh aria-hidden="true" size={18} stroke={1.75} />
        {t('common.retry')}
      </button>
    </div>
  )
}
