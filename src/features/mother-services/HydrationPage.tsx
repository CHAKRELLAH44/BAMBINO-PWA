import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { cardClass, errorText, secondaryButton } from '../../components/styles'
import { createPersonalEvent } from '../../services/repositories/personalRepository'
import { saveErrorKey } from '../../utils/firebaseErrors'
import { useUserId } from '../auth/useAuth'
import { summarizeMotherDay } from './motherDaySummary'
import { PersonalEventListItem } from './PersonalEventListItem'
import { usePersonalEvents } from './usePersonalEvents'
import { IconDroplet } from '@tabler/icons-react'

const GLASSES = [150, 250, 500]

/** Enregistre un verre d'eau maintenant */
const recordWater = (userId: string, amountMl: number | null) =>
  createPersonalEvent(userId, { type: 'hydration', occurredAt: new Date(), details: { amountMl }, comment: '' })

/** Hydratation de la maman (§12) : ajout en un geste, aucun objectif ni diagnostic */
export function HydrationPage() {
  const { t } = useTranslation()
  const userId = useUserId()
  const { events, loading, loadError } = usePersonalEvents(200)
  const [today] = useState(() => new Date())
  const [saveError, setSaveError] = useState<string | null>(null)
  const water = events.filter((event) => event.type === 'hydration')
  const summary = summarizeMotherDay(water, today)

  const add = (amountMl: number | null) => {
    setSaveError(null)
    recordWater(userId, amountMl).catch((error: unknown) => setSaveError(saveErrorKey(error)))
  }

  return (
    <>
      <PageHeader title={t('personal.hydrationTitle')} backTo="/mother" />
      <section className={`${cardClass} flex flex-col gap-3`}>
        <h2 className="font-semibold text-slate-700">{t('personal.quickAdd')}</h2>
        <div className="grid grid-cols-3 gap-2">
          {GLASSES.map((ml) => (
            <button key={ml} type="button" onClick={() => add(ml)} className={`${secondaryButton} py-3`}>
              <span className="inline-flex items-center justify-center gap-1.5">
                <IconDroplet aria-hidden="true" size={18} stroke={1.75} className="text-sky-600" />
                {t('personal.glass', { ml })}
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => add(null)} className={`${secondaryButton} text-sm`}>
          {t('personal.noAmount')}
        </button>
        <p className="text-sm font-medium text-slate-700">
          {t('personal.todayTotal', {
            glasses: t('mother.summary.hydration', { count: summary.hydration.count }),
            ml: summary.hydration.totalMl,
          })}
        </p>
        <p className="text-xs text-slate-500">{t('personal.hydrationNote')}</p>
        {saveError && <p role="alert" className={errorText}>{t(saveError)}</p>}
      </section>

      <section className="mt-6 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">{t('personal.recent')}</h2>
          <Link to="/mother/new/hydration" className="text-sm font-medium text-rose-600">
            {t('personal.detailedEntry')}
          </Link>
        </div>
        {loading && <p className="text-slate-500">{t('common.loading')}</p>}
        {loadError && <p className={errorText}>{t('common.loadError')}</p>}
        {!loading && water.length === 0 && <p className="text-slate-600">{t('personal.empty')}</p>}
        {water.slice(0, 30).map((event) => (
          <PersonalEventListItem key={event.id} event={event} showDate />
        ))}
      </section>
    </>
  )
}
