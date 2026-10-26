import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { errorText, primaryButton } from '../../components/styles'
import { PersonalEventListItem } from './PersonalEventListItem'
import { usePersonalEvents } from './usePersonalEvents'

/** Repas de la maman (§12) */
export function MealsPage() {
  const { t } = useTranslation()
  const { events, loading, loadError } = usePersonalEvents(200)
  const meals = events.filter((event) => event.type === 'meal')

  return (
    <>
      <PageHeader title={t('personal.mealsTitle')} backTo="/mother" />
      <Link to="/mother/new/meal" className={`${primaryButton} block`}>
        {t('personal.newMeal')}
      </Link>
      <section className="mt-6 flex flex-col gap-2">
        <h2 className="font-semibold text-slate-700">{t('personal.recent')}</h2>
        {loading && <p className="text-slate-500">{t('common.loading')}</p>}
        {loadError && <p className={errorText}>{t('common.loadError')}</p>}
        {!loading && meals.length === 0 && <p className="text-slate-600">{t('personal.empty')}</p>}
        {meals.slice(0, 30).map((event) => (
          <PersonalEventListItem key={event.id} event={event} showDate />
        ))}
      </section>
    </>
  )
}
