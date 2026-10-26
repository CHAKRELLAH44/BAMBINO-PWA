import { useTranslation } from 'react-i18next'
import { useOnline } from '../utils/useOnline'
import { IconWifiOff } from '@tabler/icons-react'
import { Notice } from '../components/Notice'

/**
 * Bandeau d'état de l'application : hors ligne (§24 : l'interface s'ouvre, mais rien ne s'enregistre
 * sans réseau). La nouvelle version disponible est annoncée par UpdateToast, sur toutes les pages.
 */
export function AppStatusBanners() {
  const { t } = useTranslation()
  const online = useOnline()

  return (
    <>
      {!online && (
        <div role="status">
          <Notice tone="warning" icon={IconWifiOff} className="mb-4">
            {t('pwa.offline')}
          </Notice>
        </div>
      )}
    </>
  )
}
