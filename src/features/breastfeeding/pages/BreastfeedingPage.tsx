import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router'
import { PageHeader } from '../../../components/PageHeader'
import { cardClass, dangerButton, errorText, primaryButton, secondaryButton } from '../../../components/styles'
import { deleteEvent } from '../../../services/repositories/eventRepository'
import type { BreastSide, FeedingSession } from '../../../types/event'
import { formatClock } from '../../../utils/formatDuration'
import { useUserId } from '../../auth/useAuth'
import { useActiveBaby } from '../../babies/useActiveBaby'
import { changeFeeding, forgetSessionBackups, startFeeding } from '../../sessions/sessionActions'
import { useNow } from '../../sessions/useNow'
import { useOngoingSessions } from '../../sessions/useOngoingSessions'
import { useWakeLock } from '../../sessions/useWakeLock'
import {
  currentSide,
  finishSession,
  pauseSession,
  resumeSession,
  sessionDurations,
  startSession,
  switchSide,
} from '../session'
import { saveErrorKey } from '../../../utils/firebaseErrors'

const SIDES: BreastSide[] = ['left', 'right']

/** Chronomètre d'allaitement (§5, §7.1) pour le bébé suivi */
export function BreastfeedingPage() {
  const { t } = useTranslation()
  const { activeBaby, loading } = useActiveBaby()

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (!activeBaby) return <Navigate to="/babies/new" replace />
  return <FeedingTimer key={activeBaby.id} babyId={activeBaby.id} />
}

function FeedingTimer({ babyId }: { babyId: string }) {
  const { t } = useTranslation()
  const userId = useUserId()
  const navigate = useNavigate()
  const { feeding, loading } = useOngoingSessions(babyId)
  const running = feeding?.session.status === 'running'
  const now = useNow(running)
  useWakeLock(running)
  const [error, setError] = useState<string | null>(null)

  // L'affichage suit l'écriture locale tout de suite ; on signale seulement un échec
  const report = (saving: Promise<unknown>) => {
    setError(null)
    saving.catch((error: unknown) => setError(saveErrorKey(error)))
  }

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>

  if (!feeding) {
    return (
      <>
        <PageHeader title={t('feeding.title')} backTo="/" />
        <section className={`${cardClass} flex flex-col gap-4`}>
          <h2 className="font-semibold text-slate-700">{t('feeding.startTitle')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {SIDES.map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => report(startFeeding(userId, babyId, startSession(side, new Date())).saved)}
                className={`${primaryButton} py-6 text-lg`}
              >
                {t(side === 'left' ? 'feeding.startLeft' : 'feeding.startRight')}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-500">{t('feeding.lockInfo')}</p>
        </section>
        <Link to="/breastfeeding/new" className={`${secondaryButton} mt-4 block`}>
          {t('feeding.manualEntry')}
        </Link>
        {error && <p role="alert" className={`${errorText} mt-3`}>{t(error)}</p>}
      </>
    )
  }

  const { eventId, session } = feeding
  const durations = sessionDurations(session, now)
  const side = currentSide(session)
  const apply = (next: FeedingSession) => report(changeFeeding(userId, babyId, eventId, next))

  const finish = () => {
    apply(finishSession(session, new Date()))
    void navigate(`/breastfeeding/${eventId}`)
  }

  const cancel = () => {
    if (!window.confirm(t('feeding.cancelConfirm'))) return
    forgetSessionBackups(userId, babyId, 'feeding')
    report(deleteEvent(userId, babyId, eventId))
  }

  return (
    <>
      <PageHeader title={t('feeding.title')} backTo="/" />
      <section className={`${cardClass} flex flex-col items-center gap-4 text-center`}>
        <p className="font-medium text-slate-600">
          {running ? t('feeding.running', { side: t(`feeding.side.${side}`) }) : t('feeding.paused')}
        </p>
        <p role="timer" className="font-mono text-5xl font-semibold tabular-nums text-slate-800">
          {formatClock(durations.total)}
        </p>
        <div className="grid w-full grid-cols-2 gap-3">
          {SIDES.map((s) => (
            <div
              key={s}
              className={`rounded-xl p-3 ${running && side === s ? 'bg-rose-100 ring-2 ring-rose-300' : 'bg-slate-50'}`}
            >
              <p className="text-sm text-slate-500">{t(`feeding.sideLabel.${s}`)}</p>
              <p className="font-mono text-xl tabular-nums text-slate-800">{formatClock(durations[s])}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {running ? (
          <button type="button" onClick={() => apply(pauseSession(session, new Date()))} className={`${secondaryButton} py-4`}>
            {t('feeding.pause')}
          </button>
        ) : (
          <button type="button" onClick={() => apply(resumeSession(session, new Date()))} className={`${secondaryButton} py-4`}>
            {t('feeding.resume')}
          </button>
        )}
        <button type="button" onClick={() => apply(switchSide(session, new Date()))} className={`${secondaryButton} py-4`}>
          {t('feeding.switch')}
        </button>
        <button type="button" onClick={finish} className={`${primaryButton} col-span-2 py-4 text-lg`}>
          {t('feeding.finish')}
        </button>
      </div>

      {!running && (
        <Link to={`/breastfeeding/${eventId}`} className={`${secondaryButton} mt-3 block`}>
          {t('feeding.correct')}
        </Link>
      )}
      <button type="button" onClick={cancel} className={`${dangerButton} mt-3 w-full`}>
        {t('feeding.cancel')}
      </button>
      {error && <p role="alert" className={`${errorText} mt-3`}>{t(error)}</p>}
      <p className="mt-4 text-center text-xs text-slate-500">{t('feeding.lockInfo')}</p>
    </>
  )
}
