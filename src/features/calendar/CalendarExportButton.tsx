import { useState } from 'react'
import { IconCalendarPlus } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { secondaryButton } from '../../components/styles'
import { downloadFile } from '../../utils/download'

/**
 * « Ajouter à mon calendrier » : crée un fichier .ics que le téléphone ouvre avec son agenda.
 * C'est l'agenda qui prévient la maman à l'heure prévue (aucun envoi par Bambino).
 */
export function CalendarExportButton({
  fileName,
  build,
  unavailable,
}: {
  fileName: string
  build: () => string
  /** Raison affichée quand l'export n'a pas de sens (rappel à intervalle, rendez-vous passé…) */
  unavailable: string | null
}) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<'done' | 'error' | null>(null)

  const exportFile = () => {
    try {
      downloadFile(new Blob([build()], { type: 'text/calendar;charset=utf-8' }), fileName)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={exportFile}
        disabled={unavailable !== null}
        className={`${secondaryButton} flex items-center justify-center gap-2`}
      >
        <IconCalendarPlus aria-hidden="true" size={18} stroke={1.75} />
        {t('calendar.add')}
      </button>
      <p role="status" className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-slate-500'}`}>
        {unavailable ?? (status ? t(status === 'done' ? 'calendar.done' : 'calendar.error') : t('calendar.hint'))}
      </p>
    </div>
  )
}
