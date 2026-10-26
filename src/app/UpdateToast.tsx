import { useEffect } from 'react'
import { IconRefresh, IconSparkles, IconX } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { applyUpdate, dismissUpdate, useUpdateAvailable } from '../services/pwa/serviceWorker'

// Annonce affichée un moment puis retirée : la mise à jour se fera alors à la prochaine ouverture
const VISIBLE_MS = 20_000

/**
 * Nouvelle version de Bambino disponible (§24) : petite annonce en haut de l'écran (elle ne cache ni le menu
 * ni les boutons d'action), sur toutes les pages
 * (connexion comprise), avec « Rafraîchir ». Jamais imposée : une saisie peut être en cours.
 */
export function UpdateToast() {
  const { t } = useTranslation()
  const updateAvailable = useUpdateAvailable()

  useEffect(() => {
    if (!updateAvailable) return
    const timer = window.setTimeout(dismissUpdate, VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [updateAvailable])

  if (!updateAvailable) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto relative flex w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl bg-surface p-3 shadow-xl ring-1 ring-sky-200 motion-safe:animate-guide-panel"
      >
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
          <IconSparkles size={20} stroke={1.75} />
        </span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="block font-semibold text-slate-800">{t('pwa.updateAvailable')}</span>
          <span className="block text-slate-500">{t('pwa.updateLater')}</span>
        </span>
        <button
          type="button"
          onClick={applyUpdate}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-600"
        >
          <IconRefresh aria-hidden="true" size={16} stroke={2} />
          {t('pwa.update')}
        </button>
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={dismissUpdate}
          className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <IconX aria-hidden="true" size={18} />
        </button>
        {/* Temps restant avant que l'annonce se retire */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-sky-400 motion-safe:animate-toast-timer rtl:origin-right"
          style={{ animationDuration: `${VISIBLE_MS}ms` }}
        />
      </div>
    </div>
  )
}
