import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router'
import { PageHeader } from '../../../components/PageHeader'
import { cardClass, dangerButton, errorText, primaryButton, secondaryButton } from '../../../components/styles'
import { deleteEvent } from '../../../services/repositories/eventRepository'
import { formatTime } from '../../../utils/formatDate'
import { formatClock } from '../../../utils/formatDuration'
import { useUserId } from '../../auth/useAuth'
import { useActiveBaby } from '../../babies/useActiveBaby'
import { finishSleep, forgetSessionBackups, startSleep } from '../../sessions/sessionActions'
import { useNow } from '../../sessions/useNow'
import { useOngoingSessions } from '../../sessions/useOngoingSessions'
import { saveErrorKey } from '../../../utils/firebaseErrors'
import { IconMoon, IconSun } from '@tabler/icons-react'

/** Chronomètre de sommeil (§5, §9) : startAt à l'endormissement, endAt au réveil */
export function SleepPage() {
  const { t } = useTranslation()
  const { activeBaby, loading } = useActiveBaby()

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (!activeBaby) return <Navigate to="/babies/new" replace />
  return <SleepTimer key={activeBaby.id} babyId={activeBaby.id} />
}

function SleepTimer({ babyId }: { babyId: string }) {
  const { t, i18n } = useTranslation()
  const userId = useUserId()
  const navigate = useNavigate()
  const { sleep, loading } = useOngoingSessions(babyId)
  const now = useNow(sleep !== null)
  const [error, setError] = useState<string | null>(null)

  const report = (saving: Promise<unknown>) => {
    setError(null)
    saving.catch((error: unknown) => setError(saveErrorKey(error)))
  }

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>

  if (!sleep) {
    return (
      <>
        <PageHeader title={t('sleep.title')} backTo="/" />
        <button
          type="button"
          onClick={() => report(startSleep(userId, babyId, new Date()).saved)}
          className={`${primaryButton} w-full py-6 text-lg`}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <IconMoon aria-hidden="true" size={26} stroke={1.75} />
            {t('sleep.start')}
          </span>
        </button>
        <Link to="/sleep/new" className={`${secondaryButton} mt-4 block`}>
          {t('sleep.manualEntry')}
        </Link>
        {error && <p role="alert" className={`${errorText} mt-3`}>{t(error)}</p>}
      </>
    )
  }

  const wake = () => {
    report(finishSleep(userId, babyId, sleep.eventId, sleep.startAt, new Date()))
    void navigate(`/sleep/${sleep.eventId}`)
  }

  const cancel = () => {
    if (!window.confirm(t('sleep.cancelConfirm'))) return
    forgetSessionBackups(userId, babyId, 'sleep')
    report(deleteEvent(userId, babyId, sleep.eventId))
  }

  return (
    <>
      <PageHeader title={t('sleep.title')} backTo="/" />
      <section className={`${cardClass} flex flex-col items-center gap-3 text-center`}>
        <p className="font-medium text-slate-600">
          {t('sleep.asleepSince', { time: formatTime(sleep.startAt, i18n.language) })}
        </p>
        <p role="timer" className="font-mono text-5xl font-semibold tabular-nums text-slate-800">
          {formatClock(now.getTime() - sleep.startAt.getTime())}
        </p>
      </section>
      <button type="button" onClick={wake} className={`${primaryButton} mt-4 w-full py-4 text-lg`}>
        <span className="inline-flex items-center justify-center gap-2">
          <IconSun aria-hidden="true" size={24} stroke={1.75} />
          {t('sleep.wake')}
        </span>
      </button>
      <button type="button" onClick={cancel} className={`${dangerButton} mt-3 w-full`}>
        {t('sleep.cancel')}
      </button>
      {error && <p role="alert" className={`${errorText} mt-3`}>{t(error)}</p>}
      <p className="mt-4 text-center text-xs text-slate-500">{t('feeding.lockInfo')}</p>
    </>
  )
}
