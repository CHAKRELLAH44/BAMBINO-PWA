import { startOfDay } from 'date-fns'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { errorText, inputClass, labelClass, primaryButton } from '../../components/styles'
import { MOTHER } from '../../types/appointment'
import { useActiveBaby } from '../babies/useActiveBaby'
import { AppointmentListItem } from './AppointmentListItem'
import { useAppointments } from './useAppointments'

const ALL = 'all'

/** Rendez-vous (§13) de la maman et des bébés : à venir puis passés */
export function AppointmentsPage() {
  const { t } = useTranslation()
  const { babies } = useActiveBaby()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = searchParams.get('for') ?? ALL
  const { appointments, loading, loadError } = useAppointments(filter === ALL ? null : filter)
  const [today] = useState(() => startOfDay(new Date()))

  const upcoming = appointments.filter((appointment) => appointment.scheduledAt.toDate() >= today)
  const past = appointments.filter((appointment) => appointment.scheduledAt.toDate() < today).reverse()
  const newFor = filter === ALL ? '' : `?for=${filter}`

  return (
    <>
      <PageHeader title={t('appointments.title')} backTo={filter === MOTHER ? '/mother' : '/'} />

      <div className="mb-4 flex flex-col gap-1">
        <label htmlFor="for" className={labelClass}>
          {t('appointments.fields.concerne')}
        </label>
        <select
          id="for"
          value={filter}
          onChange={(event) => setSearchParams({ for: event.target.value }, { replace: true })}
          className={inputClass}
        >
          <option value={ALL}>{t('appointments.all')}</option>
          {babies.map((baby) => (
            <option key={baby.id} value={baby.id}>
              {baby.name}
            </option>
          ))}
          <option value={MOTHER}>{t('appointments.mother')}</option>
        </select>
      </div>

      <Link to={`/appointments/new${newFor}`} className={`${primaryButton} block`}>
        {t('appointments.add')}
      </Link>

      {loading && <p className="mt-4 text-slate-500">{t('common.loading')}</p>}
      {loadError && <p className={`${errorText} mt-4`}>{t('common.loadError')}</p>}
      {!loading && !loadError && appointments.length === 0 && (
        <p className="mt-4 text-slate-600">{t('appointments.empty')}</p>
      )}

      {upcoming.length > 0 && (
        <section className="mt-6 flex flex-col gap-2">
          <h2 className="font-semibold text-slate-700">{t('appointments.upcoming')}</h2>
          {upcoming.map((appointment) => (
            <AppointmentListItem key={appointment.id} appointment={appointment} showPerson={filter === ALL} search={newFor} />
          ))}
        </section>
      )}
      {past.length > 0 && (
        <section className="mt-6 flex flex-col gap-2">
          <h2 className="font-semibold text-slate-700">{t('appointments.past')}</h2>
          {past.map((appointment) => (
            <AppointmentListItem key={appointment.id} appointment={appointment} showPerson={filter === ALL} search={newFor} />
          ))}
        </section>
      )}
    </>
  )
}
