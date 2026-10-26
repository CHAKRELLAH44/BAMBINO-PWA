import { IconDeviceMobileDown } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { installApp, useInstallState } from '../services/pwa/installPrompt'
import { Notice } from './Notice'

/**
 * Invitation à installer Bambino (§24) : bouton si le navigateur le permet (Chrome, Edge),
 * sinon la marche à suivre selon l'appareil (iPhone, Android, ordinateur). Rien si elle est déjà installée.
 */
const INSTALL_STEPS = {
  ios: 'pwa.installIos',
  android: 'pwa.installAndroid',
  unavailable: 'pwa.installOther',
} as const

export function InstallHint({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const state = useInstallState()

  if (state === 'installed') return null
  if (state === 'available') {
    return (
      <div className={`flex items-center gap-3 rounded-lg bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-200 ${className}`}>
        <IconDeviceMobileDown aria-hidden="true" size={20} stroke={1.75} className="shrink-0" />
        <span className="flex-1">{t('pwa.installPrompt')}</span>
        <button type="button" onClick={() => void installApp()} className="shrink-0 font-semibold text-rose-600">
          {t('pwa.installShort')}
        </button>
      </div>
    )
  }
  return (
    <Notice icon={IconDeviceMobileDown} className={className}>
      {t(INSTALL_STEPS[state])}
    </Notice>
  )
}
