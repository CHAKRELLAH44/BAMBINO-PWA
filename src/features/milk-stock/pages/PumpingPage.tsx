import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router'
import { PageHeader } from '../../../components/PageHeader'
import { cardClass, dangerButton, errorText, primaryButton, secondaryButton } from '../../../components/styles'
import type { PumpingSession, PumpingSide } from '../../../types/event'
import { saveErrorKey } from '../../../utils/firebaseErrors'
import { formatClock } from '../../../utils/formatDuration'
import { useUserId } from '../../auth/useAuth'
import { useActiveBaby } from '../../babies/useActiveBaby'
import { cancelPumpingTimer, changePumpingTimer, startPumpingTimer } from '../../sessions/sessionActions'
import { useNow } from '../../sessions/useNow'
import { useOngoingPumping } from '../../sessions/useOngoingPumping'
import { useWakeLock } from '../../sessions/useWakeLock'
import { pausePumping, pumpingDurationMs, resumePumping, startPumping } from '../pumpingSession'

const SIDES: PumpingSide[] = ['left', 'right', 'both']

/** Chronomètre de tirage (§5, §8.1) pour le bébé suivi, comme celui de la tétée */
export function PumpingPage() {
  const { t } = useTranslation()
  const { activeBaby, loading } = useActiveBaby()

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (!activeBaby) return <Navigate to="/babies/new" replace />
  return <PumpingTimer key={activeBaby.id} babyId={activeBaby.id} />
}

function PumpingTimer({ babyId }: { babyId: string }) {
  const { t } = useTranslation()
  const userId = useUserId()
  const navigate = useNavigate()
  const { pumping, loading } = useOngoingPumping(babyId)
  const running = pumping?.session.status === 'running'
  const now = useNow(running)
  useWakeLock(running)
  const [error, setError] = useState<string | null>(null)

  // L'affichage suit l'écriture locale tout de suite ; on signale seulement un échec
  const report = (saving: Promise<unknown>) => {
    setError(null)
    saving.catch((error: unknown) => setError(saveErrorKey(error)))
  }

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>

  if (!pumping) {
    return (
      <>
        <PageHeader title={t('pumping.title')} backTo="/" />
        <section className={`${cardClass} flex flex-col gap-4`}>
          <h2 className="font-semibold text-slate-700">{t('pumping.startTitle')}</h2>
          <div className="grid grid-cols-3 gap-3">
            {SIDES.map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => report(startPumpingTimer(userId, babyId, startPumping(side, new Date())).saved)}
                className={`${primaryButton} py-6 text-lg`}
              >
                {t(`pumping.sides.${side}`)}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-500">{t('feeding.lockInfo')}</p>
        </section>
        <Link to="/pumping/new" className={`${secondaryButton} mt-4 block`}>
          {t('feeding.manualEntry')}
        </Link>
        {error && <p role="alert" className={`${errorText} mt-3`}>{t(error)}</p>}
      </>
    )
  }

  const { sessionId, session } = pumping
  const apply = (next: PumpingSession) => report(changePumpingTimer(userId, babyId, sessionId, next))

  // Terminer = fermer le segment ouvert, puis saisir la quantité : la séance devient un tirage ordinaire
  const finish = () => {
    apply(pausePumping(session, new Date()))
    void navigate(`/pumping/new?session=${sessionId}`)
  }

  const cancel = () => {
    if (!window.confirm(t('pumping.cancelConfirm'))) return
    report(cancelPumpingTimer(userId, babyId, sessionId))
  }

  return (
    <>
      <PageHeader title={t('pumping.title')} backTo="/" />
      <section className={`${cardClass} flex flex-col items-center gap-4 text-center`}>
        <p className="font-medium text-slate-600">
          {running ? t('pumping.running', { side: t(`pumping.sides.${session.side}`) }) : t('feeding.paused')}
        </p>
        <p role="timer" className="font-mono text-5xl font-semibold tabular-nums text-slate-800">
          {formatClock(pumpingDurationMs(session, now))}
        </p>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {running ? (
          <button type="button" onClick={() => apply(pausePumping(session, new Date()))} className={`${secondaryButton} py-4`}>
            {t('feeding.pause')}
          </button>
        ) : (
          <button type="button" onClick={() => apply(resumePumping(session, new Date()))} className={`${secondaryButton} py-4`}>
            {t('feeding.resume')}
          </button>
        )}
        <button type="button" onClick={finish} className={`${primaryButton} py-4 text-lg`}>
          {t('feeding.finish')}
        </button>
      </div>

      <button type="button" onClick={cancel} className={`${dangerButton} mt-3 w-full`}>
        {t('feeding.cancel')}
      </button>
      {error && <p role="alert" className={`${errorText} mt-3`}>{t(error)}</p>}
      <p className="mt-4 text-center text-xs text-slate-500">{t('feeding.lockInfo')}</p>
    </>
  )
}
