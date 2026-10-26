import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { FormField } from '../../../components/FormField'
import { PageHeader } from '../../../components/PageHeader'
import {
  cardClass,
  dangerButton,
  errorText,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from '../../../components/styles'
import {
  createReminder,
  deleteReminder,
  updateReminder,
} from '../../../services/repositories/reminderRepository'
import { ALL_DAYS, REMINDER_SERVICES, type Reminder, type ReminderInput, type ReminderService } from '../../../types/reminder'
import { parseInputValue, toDateInputValue } from '../../../utils/dateInput'
import { useUserId } from '../../auth/useAuth'
import { useActiveBaby } from '../../babies/useActiveBaby'
import { MOTHER } from '../../../types/appointment'
import { isTreatment, SERVICE_ICONS } from '../reminderOptions'
import { normalizeTimes } from '../schedule'
import { reminderSchema, type ReminderFormValues } from '../schemas'
import { weekdayLabel } from '../useFormatSchedule'
import { useReminders } from '../useReminders'
import { saveErrorKey } from '../../../utils/firebaseErrors'
import { IconBadge } from '../../../components/IconBadge'
import { IconMinus, IconPlus } from '@tabler/icons-react'
import { nextTime, spreadTimes } from '../../medications/dailyIntakes'
import { fileSlug } from '../../../utils/download'
import { CalendarExportButton } from '../../calendar/CalendarExportButton'
import { buildCalendar, reminderCalendarIssue, reminderEvents } from '../../calendar/ics'
import { Notice } from '../../../components/Notice'

/**
 * Rappel (§14) ou traitement (§11, §12).
 * /reminders/new?service=medication&for=<bébé|mother>&returnTo=… ; /reminders/:reminderId?returnTo=…
 */
export function ReminderFormPage() {
  const { t } = useTranslation()
  const { reminderId } = useParams()
  const { reminders, loading, loadError } = useReminders()

  if (!reminderId) return <ReminderForm />
  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (loadError) return <p className={errorText}>{t('common.loadError')}</p>
  const reminder = reminders.find((candidate) => candidate.id === reminderId)
  if (!reminder) return <p className="text-slate-600">{t('reminders.notFound')}</p>
  return <ReminderForm key={reminder.id} reminder={reminder} />
}

function toFormValues(
  reminder: Reminder | undefined,
  preset: { service: ReminderService | null; forWhom: string },
): ReminderFormValues {
  if (reminder) {
    // Ancien traitement « à intervalle » : on propose autant d'heures que de prises par jour
    const treatmentInterval = isTreatment(reminder.serviceId) && reminder.scheduleType === 'interval'
    const times = treatmentInterval
      ? spreadTimes(Math.min(12, Math.max(1, Math.round(1440 / (reminder.intervalMinutes ?? 1440)))))
      : reminder.scheduledTimes.length
        ? reminder.scheduledTimes
        : ['08:00']
    return {
      forWhom: reminder.babyId ?? MOTHER,
      serviceId: reminder.serviceId,
      title: reminder.title,
      description: reminder.description,
      scheduleType: treatmentInterval ? 'fixedTimes' : reminder.scheduleType,
      times: times.map((value) => ({ value })),
      intervalHours: reminder.intervalMinutes ? String(reminder.intervalMinutes / 60) : '3',
      days: reminder.daysOfWeek.map(String),
      startDate: reminder.startDate ? toDateInputValue(reminder.startDate.toDate()) : '',
      endDate: reminder.endDate ? toDateInputValue(reminder.endDate.toDate()) : '',
      enabled: reminder.enabled,
    }
  }
  return {
    forWhom: preset.forWhom,
    serviceId: preset.service ?? 'custom',
    title: '',
    description: '',
    scheduleType: 'fixedTimes',
    times: [{ value: '08:00' }],
    intervalHours: '3',
    days: ALL_DAYS.map(String),
    startDate: '',
    endDate: '',
    enabled: false,
  }
}

function ReminderForm({ reminder }: { reminder?: Reminder }) {
  const { t, i18n } = useTranslation()
  const userId = useUserId()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { babies, activeBaby } = useActiveBaby()
  const presetService = REMINDER_SERVICES.find((service) => service === searchParams.get('service')) ?? null
  const presetFor = searchParams.get('for')
  const returnTo = searchParams.get('returnTo') ?? '/reminders'
  const [defaultValues] = useState(() =>
    toFormValues(reminder, { service: presetService, forWhom: presetFor ?? activeBaby?.id ?? MOTHER }),
  )
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ReminderFormValues>({ resolver: zodResolver(reminderSchema), defaultValues })
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'times' })
  const [serviceId, scheduleType, times] = useWatch({ control, name: ['serviceId', 'scheduleType', 'times'] })

  // Depuis l'écran d'un traitement, le type et la personne sont déjà choisis
  const lockedService = Boolean(reminder ? isTreatment(reminder.serviceId) : presetService)
  // Médicaments et vitamines ne concernent que la maman (décision d'équipe du 21/10)
  const lockedPerson = isTreatment(serviceId) || Boolean(!reminder && presetFor)
  const treatment = isTreatment(serviceId)
  const fieldError = (message?: string) => (message ? t(message) : undefined)
  const availableBabies = babies.filter((baby) => !baby.archivedAt || baby.id === reminder?.babyId)

  // Traitement : « combien de fois par jour ? ». Heures proposées tant qu'elles n'ont pas été changées.
  const changeCount = (next: number) => {
    if (next < 1 || next > 12) return
    const current = times.map((time) => time.value)
    if (current.join() === spreadTimes(current.length).join()) replace(spreadTimes(next).map((value) => ({ value })))
    else if (next > current.length) append({ value: nextTime(current) })
    else remove(current.length - 1)
  }

  const onSubmit = async (values: ReminderFormValues) => {
    setActionError(null)
    // Un traitement a toujours des heures fixes : une heure par prise
    const fixed = isTreatment(values.serviceId) || values.scheduleType === 'fixedTimes'
    const input: ReminderInput = {
      serviceId: values.serviceId,
      // Les traitements (médicaments, vitamines) concernent la maman
      babyId: isTreatment(values.serviceId) || values.forWhom === MOTHER ? null : values.forWhom,
      title: values.title,
      description: values.description,
      scheduleType: fixed ? 'fixedTimes' : 'interval',
      scheduledTimes: fixed ? normalizeTimes(values.times.map((time) => time.value)) : [],
      daysOfWeek: values.days.map(Number).sort(),
      intervalMinutes: fixed ? null : Math.round(Number(values.intervalHours.replace(',', '.')) * 60),
      startDate: parseInputValue(values.startDate),
      endDate: parseInputValue(values.endDate),
      enabled: values.enabled,
    }
    try {
      if (reminder) await updateReminder(userId, reminder.id, input)
      else await createReminder(userId, input)
      await navigate(returnTo, { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
    }
  }

  const removeReminder = async () => {
    if (!reminder || !window.confirm(t('reminders.deleteConfirm', { title: reminder.title }))) return
    setActionError(null)
    setDeleting(true)
    try {
      await deleteReminder(userId, reminder.id)
      await navigate(returnTo, { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
      setDeleting(false)
    }
  }

  const title = treatment
    ? t(reminder ? 'reminders.editPlanTitle' : 'reminders.newPlanTitle')
    : t(reminder ? 'reminders.editTitle' : 'reminders.newTitle')

  return (
    <>
      <PageHeader title={title} backTo={returnTo} />
      {treatment && <Notice className="mb-4">{t('health.disclaimer')}</Notice>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {lockedService ? (
          <>
            <input type="hidden" {...register('serviceId')} />
            <p className="flex items-center gap-3 font-medium text-slate-700">
              <IconBadge spec={SERVICE_ICONS[serviceId]} /> {t(`reminders.services.${serviceId}`)}
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <label htmlFor="serviceId" className={labelClass}>
              {t('reminders.fields.service')}
            </label>
            <select id="serviceId" className={inputClass} {...register('serviceId')}>
              {REMINDER_SERVICES.map((service) => (
                <option key={service} value={service}>
                  {t(`reminders.services.${service}`)}
                </option>
              ))}
            </select>
          </div>
        )}

        {lockedPerson ? (
          <input type="hidden" {...register('forWhom')} />
        ) : (
          <div className="flex flex-col gap-1">
            <label htmlFor="forWhom" className={labelClass}>
              {t('reminders.fields.forWhom')}
            </label>
            <select id="forWhom" className={inputClass} {...register('forWhom')}>
              {availableBabies.map((baby) => (
                <option key={baby.id} value={baby.id}>
                  {baby.name}
                </option>
              ))}
              <option value={MOTHER}>{t('reminders.mother')}</option>
            </select>
          </div>
        )}

        <FormField
          id="title"
          label={
            serviceId === 'medication'
              ? t('reminders.fields.medicationName')
              : serviceId === 'supplement'
                ? t('reminders.fields.supplementName')
                : t('reminders.fields.title')
          }
          autoComplete="off"
          error={fieldError(errors.title?.message)}
          {...register('title')}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className={labelClass}>
            {treatment ? t('reminders.fields.instructions') : t('reminders.fields.description')}{' '}
            <span className="font-normal text-slate-400">({t('common.optional')})</span>
          </label>
          <textarea id="description" rows={3} className={inputClass} {...register('description')} />
          {errors.description?.message && <p className={errorText}>{t(errors.description.message)}</p>}
        </div>

        <fieldset className={`${cardClass} flex flex-col gap-3`}>
          <legend className={`${labelClass} px-1`}>{t('reminders.fields.scheduleType')}</legend>
          {treatment ? (
            <div className="flex flex-col gap-3">
              <span className={labelClass}>{t('treatments.howManyTimes')}</span>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  aria-label={t('treatments.fewer')}
                  disabled={fields.length <= 1}
                  onClick={() => changeCount(fields.length - 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-40"
                >
                  <IconMinus aria-hidden="true" size={20} stroke={2} />
                </button>
                <p aria-live="polite" className="min-w-36 text-center text-lg font-semibold text-slate-800">
                  {t('treatments.timesPerDay', { count: fields.length })}
                </p>
                <button
                  type="button"
                  aria-label={t('treatments.more')}
                  disabled={fields.length >= 12}
                  onClick={() => changeCount(fields.length + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40"
                >
                  <IconPlus aria-hidden="true" size={20} stroke={2} />
                </button>
              </div>
              {fields.map((field, index) => (
                <label key={field.id} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm font-medium text-slate-600">
                    {t('treatments.intakeTime', { n: index + 1 })}
                  </span>
                  <input type="time" className={inputClass} {...register(`times.${index}.value`)} />
                </label>
              ))}
              <p className="text-sm text-slate-500">{t('treatments.timesHint')}</p>
              {(errors.times?.message ?? errors.times?.root?.message) && (
                <p className={errorText}>{t((errors.times?.message ?? errors.times?.root?.message)!)}</p>
              )}
            </div>
          ) : (
            <>
          <div className="flex gap-4">
            {(['fixedTimes', 'interval'] as const).map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" value={type} className="h-4 w-4 accent-rose-500" {...register('scheduleType')} />
                {t(`reminders.scheduleTypes.${type}`)}
              </label>
            ))}
          </div>

          {scheduleType === 'fixedTimes' ? (
            <div className="flex flex-col gap-2">
              <span className={labelClass}>{t('reminders.fields.times')}</span>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`${t('reminders.fields.times')} ${index + 1}`}
                    className={inputClass}
                    {...register(`times.${index}.value`)}
                  />
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="text-sm text-red-600">
                      {t('reminders.removeTime')}
                    </button>
                  )}
                </div>
              ))}
              {fields.length < 12 && (
                <button type="button" onClick={() => append({ value: '' })} className={`${secondaryButton} text-sm`}>
                  {t('reminders.addTime')}
                </button>
              )}
              {(errors.times?.message ?? errors.times?.root?.message) && (
                <p className={errorText}>{t((errors.times?.message ?? errors.times?.root?.message)!)}</p>
              )}
            </div>
          ) : (
            <FormField
              id="intervalHours"
              inputMode="decimal"
              label={t('reminders.fields.intervalHours')}
              error={fieldError(errors.intervalHours?.message)}
              {...register('intervalHours')}
            />
          )}
            </>
          )}

          <div className="flex flex-col gap-2">
            <span className={labelClass}>{t('reminders.fields.days')}</span>
            <div className="grid grid-cols-7 gap-1">
              {ALL_DAYS.map((day) => (
                <label key={day} className="relative cursor-pointer">
                  <input type="checkbox" value={String(day)} className="peer sr-only" {...register('days')} />
                  <span className="flex items-center justify-center rounded-lg bg-surface py-2 text-xs font-medium text-slate-600 ring-1 ring-slate-200 peer-checked:bg-rose-100 peer-checked:text-rose-700 peer-checked:ring-2 peer-checked:ring-rose-400 peer-focus-visible:ring-2 peer-focus-visible:ring-rose-300">
                    {weekdayLabel(day, i18n.language)}
                  </span>
                </label>
              ))}
            </div>
            {errors.days?.message && <p className={errorText}>{t(errors.days.message)}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="startDate"
              type="date"
              label={`${t('reminders.fields.startDate')} (${t('common.optional')})`}
              error={fieldError(errors.startDate?.message)}
              {...register('startDate')}
            />
            <FormField
              id="endDate"
              type="date"
              label={`${t('reminders.fields.endDate')} (${t('common.optional')})`}
              error={fieldError(errors.endDate?.message)}
              {...register('endDate')}
            />
          </div>
        </fieldset>

        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-rose-500" {...register('enabled')} />
          <span>
            <span className="block font-medium text-slate-700">{t('reminders.enabled')}</span>
            <span className="block text-sm text-slate-500">{t('reminders.enabledHint')}</span>
          </span>
        </label>

        {actionError && (
          <p role="alert" className={errorText}>
            {t(actionError)}
          </p>
        )}

        <button type="submit" disabled={isSubmitting || deleting} className={primaryButton}>
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </form>

      {reminder && (
        <div className="mt-6 flex flex-col gap-4 border-t border-rose-100 pt-6">
          <ReminderCalendarExport reminder={reminder} />
          <button type="button" onClick={() => void removeReminder()} disabled={deleting} className={`${dangerButton} w-full`}>
            {t('common.delete')}
          </button>
        </div>
      )}
    </>
  )
}

/** Le rappel enregistré va dans l'agenda du téléphone, qui préviendra à chaque heure prévue */
function ReminderCalendarExport({ reminder }: { reminder: Reminder }) {
  const { t } = useTranslation()
  const { babies } = useActiveBaby()
  const [today] = useState(() => new Date())
  const babyName = reminder.babyId ? babies.find((baby) => baby.id === reminder.babyId)?.name : null
  const summary = babyName ? t('calendar.summary', { title: reminder.title, person: babyName }) : reminder.title
  const issue = reminderCalendarIssue(reminder, today)

  return (
    <CalendarExportButton
      fileName={`bambino-${fileSlug(reminder.title, 'rappel')}.ics`}
      build={() => buildCalendar(reminderEvents(reminder, summary, today), new Date())}
      unavailable={issue ? t(`calendar.${issue}`) : null}
    />
  )
}
