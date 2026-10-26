import { useState } from 'react'
import { IconCheck, IconCircleCheck } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { PageHeader } from '../../components/PageHeader'
import { cardClass, errorText, primaryButton, secondaryButton } from '../../components/styles'
import { createPersonalEvent, deletePersonalEvent } from '../../services/repositories/personalRepository'
import type { PersonalEvent } from '../../types/personal'
import type { Reminder } from '../../types/reminder'
import { saveErrorKey } from '../../utils/firebaseErrors'
import { formatShortDateTime } from '../../utils/formatDate'
import { useUserId } from '../auth/useAuth'
import { usePersonalEvents } from '../mother-services/usePersonalEvents'
import { SERVICE_ICONS } from '../reminders/reminderOptions'
import { isPlannedOn } from '../reminders/schedule'
import { useFormatSchedule } from '../reminders/useFormatSchedule'
import { useReminders } from '../reminders/useReminders'
import { IconBadge } from '../../components/IconBadge'
import { Notice } from '../../components/Notice'
import { dailyProgress, timesPerDay } from './dailyIntakes'

type Kind = 'medication' | 'supplement'

/**
 * Médicaments (§11), vitamines et compléments (§12) de la maman.
 * (Décision d'équipe du 21/10 : pas de médicaments côté bébé.)
 * L'application organise uniquement ce que la maman saisit : aucune prescription ni dose.
 */
export function TreatmentsPage({ kind }: { kind: Kind }) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { reminders, loading } = useReminders()
  const { events } = usePersonalEvents(200)
  const intakeType = kind === 'medication' ? 'motherMedication' : 'supplement'
  const plans = reminders.filter((reminder) => reminder.serviceId === kind && reminder.babyId === null)
  const intakes = events.filter((event) => event.type === intakeType).slice(0, 20)
  const returnTo = encodeURIComponent(location.pathname)

  return (
    <>
      <PageHeader title={kind === 'medication' ? t('treatments.motherTitle') : t('treatments.supplementTitle')} backTo="/mother" />
      <Notice className="mb-4">{t('health.disclaimer')}</Notice>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-slate-700">
          {kind === 'medication' ? t('treatments.plans') : t('treatments.supplementPlans')}
        </h2>
        {loading && <p className="text-slate-500">{t('common.loading')}</p>}
        {!loading && plans.length === 0 && <p className="text-slate-600">{t('treatments.noPlan')}</p>}
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} kind={kind} returnTo={returnTo} events={events} />
        ))}
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Link to={`/reminders/new?service=${kind}&for=mother&returnTo=${returnTo}`} className={`${primaryButton} text-sm`}>
            {kind === 'medication' ? t('treatments.addPlan') : t('treatments.addSupplement')}
          </Link>
          <Link to={`/mother/new/${intakeType}`} className={`${secondaryButton} text-sm`}>
            {t('treatments.oneOff')}
          </Link>
        </div>
      </section>

      <section className="mt-6 flex flex-col gap-2">
        <h2 className="font-semibold text-slate-700">{t('treatments.history')}</h2>
        {intakes.length === 0 && <p className="text-slate-600">{t('treatments.noIntake')}</p>}
        {intakes.map((intake) => (
          <Link key={intake.id} to={`/mother/events/${intake.id}`} className={`${cardClass} flex items-center gap-3 hover:bg-rose-50`}>
            <IconBadge spec={SERVICE_ICONS[kind]} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-slate-800">{intake.type === intakeType ? intake.details.name : ''}</span>
              {intake.comment && <span className="block truncate text-sm text-slate-500">{intake.comment}</span>}
            </span>
            <time className="text-sm text-slate-500">{formatShortDateTime(intake.occurredAt.toDate(), i18n.language)}</time>
          </Link>
        ))}
      </section>
    </>
  )
}

function PlanCard({
  plan,
  kind,
  returnTo,
  events,
}: {
  plan: Reminder
  kind: Kind
  returnTo: string
  events: PersonalEvent[]
}) {
  const { t } = useTranslation()
  const userId = useUserId()
  const formatSchedule = useFormatSchedule()
  const [today] = useState(() => new Date())
  const [message, setMessage] = useState<{ key: string; ok: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const plannedToday = isPlannedOn(
    { daysOfWeek: plan.daysOfWeek, startDate: plan.startDate?.toDate() ?? null, endDate: plan.endDate?.toDate() ?? null },
    today,
  )
  const progress = dailyProgress(plan, events, today)
  const total = timesPerDay(plan)
  // Les heures du jour sont dans les pastilles : pas de répétition dans la ligne d'horaire
  const showSlots = plannedToday && plan.scheduleType === 'fixedTimes'
  const [timesPart, ...otherParts] = formatSchedule(plan).split(' · ')
  const scheduleLine = [
    total !== null ? t('treatments.timesPerDay', { count: total }) : null,
    ...(showSlots ? otherParts : [timesPart, ...otherParts]),
  ]
    .filter(Boolean)
    .join(' · ')

  const run = async (action: () => Promise<unknown>, success: string) => {
    setMessage(null)
    setSaving(true)
    try {
      await action()
      setMessage({ key: success, ok: true })
    } catch (error) {
      setMessage({ key: saveErrorKey(error), ok: false })
    } finally {
      setSaving(false)
    }
  }

  /** Enregistre la prise maintenant, rattachée au traitement */
  const takeNow = () =>
    run(
      () =>
        createPersonalEvent(userId, {
          type: kind === 'medication' ? 'motherMedication' : 'supplement',
          occurredAt: new Date(),
          details: { reminderId: plan.id, name: plan.title },
          comment: '',
        }),
      'treatments.taken',
    )

  /** Erreur de geste : retire la dernière prise notée aujourd'hui */
  const undoLast = () => {
    const last = progress.lastIntake
    if (!last || !window.confirm(t('treatments.undoConfirm'))) return
    void run(() => deletePersonalEvent(userId, last.id), 'treatments.undone')
  }

  return (
    <div className={`${cardClass} flex flex-col gap-3 ${progress.done ? 'ring-2 ring-emerald-300' : ''}`}>
      <div className="flex items-start gap-3">
        <IconBadge spec={SERVICE_ICONS[kind]} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-800">{plan.title}</p>
          {plan.description && <p className="whitespace-pre-line text-sm text-slate-600">{plan.description}</p>}
          <p className="text-sm text-slate-500">{scheduleLine}</p>
        </div>
        <Link to={`/reminders/${plan.id}?returnTo=${returnTo}`} className="text-sm font-medium text-rose-600">
          {t('treatments.edit')}
        </Link>
      </div>

      {plannedToday ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            {total !== null
              ? t('treatments.progress', { taken: Math.min(progress.taken, total), total })
              : t('treatments.takenToday', { count: progress.taken })}
          </span>
          {showSlots &&
            plan.scheduledTimes.map((time, index) => {
              const taken = index < progress.taken
              return (
                <span
                  key={time}
                  aria-label={t(taken ? 'treatments.slotTaken' : 'treatments.slotPending', { time })}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    taken ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {taken && <IconCheck aria-hidden="true" size={14} stroke={2.5} />}
                  {time}
                </span>
              )
            })}
        </div>
      ) : (
        <p className="text-sm font-medium text-slate-400">{t('treatments.notToday')}</p>
      )}

      {progress.done ? (
        <div className="flex flex-col gap-1 rounded-xl bg-emerald-50 p-3 text-emerald-800 ring-1 ring-emerald-200">
          <p className="flex items-center gap-2 font-semibold">
            <IconCircleCheck aria-hidden="true" size={20} stroke={2} />
            {t('treatments.doneToday')}
          </p>
          <button type="button" onClick={undoLast} disabled={saving} className="self-start text-sm font-medium underline">
            {t('treatments.undo')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void takeNow()}
          disabled={saving}
          className={`${plannedToday ? primaryButton : secondaryButton} text-sm`}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <IconCheck aria-hidden="true" size={18} stroke={2} />
            {t('treatments.takeNow')}
          </span>
        </button>
      )}
      {!progress.done && progress.lastIntake && (
        <button type="button" onClick={undoLast} disabled={saving} className="self-start text-sm text-slate-500 underline">
          {t('treatments.undo')}
        </button>
      )}
      {message && (
        <p role="status" className={message.ok ? 'text-sm text-emerald-700' : errorText}>
          {t(message.key, { name: plan.title })}
        </p>
      )}
    </div>
  )
}
