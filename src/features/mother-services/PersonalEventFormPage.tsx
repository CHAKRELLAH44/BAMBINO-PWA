import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { z } from 'zod'
import { FormField } from '../../components/FormField'
import { PageHeader } from '../../components/PageHeader'
import { dangerButton, errorText, inputClass, labelClass, primaryButton } from '../../components/styles'
import {
  createPersonalEvent,
  deletePersonalEvent,
  updatePersonalEvent,
} from '../../services/repositories/personalRepository'
import type { MealType, PersonalEvent, PersonalEventInput, PersonalEventType } from '../../types/personal'
import { parseInputValue, toDateTimeInputValue } from '../../utils/dateInput'
import { commentField, optionalIntField, optionalIntToField, parseOptionalInt, pastDateTimeField } from '../../utils/formFields'
import { useUserId } from '../auth/useAuth'
import { useReminders } from '../reminders/useReminders'
import { PERSONAL_LIST_PATHS } from './personalOptions'
import { usePersonalEvent } from './usePersonalEvents'
import { saveErrorKey } from '../../utils/firebaseErrors'
import { Notice } from '../../components/Notice'

const TYPES: PersonalEventType[] = ['hydration', 'meal', 'motherMedication', 'supplement']
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other']

// Un seul schéma : les champs inutiles pour le type choisi sont ignorés
const personalSchema = (type: PersonalEventType) =>
  z.object({
    occurredAt: pastDateTimeField(),
    amountMl: optionalIntField(3000, 'personal.validation.amount'),
    mealType: z.enum(MEAL_TYPES),
    composition: z.string().trim().max(500, 'validation.tooLong'),
    name:
      type === 'motherMedication' || type === 'supplement'
        ? z.string().trim().min(1, 'validation.required').max(80, 'validation.tooLong')
        : z.string(),
    comment: commentField(),
  })

type PersonalFormValues = z.infer<ReturnType<typeof personalSchema>>

/** Eau, repas, médicament ou vitamine de la maman : /mother/new/:type[?reminder=…] ou /mother/events/:eventId */
export function PersonalEventFormPage() {
  const { t } = useTranslation()
  const { eventId, type } = useParams()

  if (eventId) return <EditPersonalEvent key={eventId} eventId={eventId} />
  const eventType = TYPES.find((candidate) => candidate === type)
  if (!eventType) return <p className="text-slate-600">{t('personal.notFound')}</p>
  return <NewPersonalEvent type={eventType} />
}

function NewPersonalEvent({ type }: { type: PersonalEventType }) {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const reminderId = searchParams.get('reminder')
  const { reminders, loading } = useReminders()

  if (reminderId && loading) return <p className="text-slate-500">{t('common.loading')}</p>
  const plan = reminders.find((reminder) => reminder.id === reminderId)
  return <PersonalForm type={type} reminderId={plan?.id ?? null} defaultName={plan?.title ?? ''} />
}

function EditPersonalEvent({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const { event, loading, loadError } = usePersonalEvent(eventId)

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (loadError) return <p className={errorText}>{t('common.loadError')}</p>
  if (!event) return <p className="text-slate-600">{t('personal.notFound')}</p>
  const isIntake = event.type === 'motherMedication' || event.type === 'supplement'
  return (
    <PersonalForm
      type={event.type}
      event={event}
      reminderId={isIntake ? event.details.reminderId : null}
      defaultName={isIntake ? event.details.name : ''}
    />
  )
}

function toFormValues(event: PersonalEvent | undefined, defaultName: string): PersonalFormValues {
  return {
    occurredAt: toDateTimeInputValue(event ? event.occurredAt.toDate() : new Date()),
    amountMl: event?.type === 'hydration' ? optionalIntToField(event.details.amountMl) : '',
    mealType: event?.type === 'meal' ? event.details.mealType : 'lunch',
    composition: event?.type === 'meal' ? event.details.composition : '',
    name: defaultName,
    comment: event?.comment ?? '',
  }
}

function PersonalForm({
  type,
  event,
  reminderId,
  defaultName,
}: {
  type: PersonalEventType
  event?: PersonalEvent
  reminderId: string | null
  defaultName: string
}) {
  const { t } = useTranslation()
  const userId = useUserId()
  const navigate = useNavigate()
  const [defaultValues] = useState(() => toFormValues(event, defaultName))
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PersonalFormValues>({ resolver: zodResolver(personalSchema(type)), defaultValues })
  const backTo = PERSONAL_LIST_PATHS[type]
  const isIntake = type === 'motherMedication' || type === 'supplement'
  const fieldError = (message?: string) => (message ? t(message) : undefined)

  const toInput = (values: PersonalFormValues): PersonalEventInput => {
    const occurredAt = parseInputValue(values.occurredAt)!
    if (type === 'hydration') {
      return { type, occurredAt, details: { amountMl: parseOptionalInt(values.amountMl) }, comment: values.comment }
    }
    if (type === 'meal') {
      return { type, occurredAt, details: { mealType: values.mealType, composition: values.composition }, comment: values.comment }
    }
    return { type, occurredAt, details: { reminderId, name: values.name }, comment: values.comment }
  }

  const onSubmit = async (values: PersonalFormValues) => {
    setActionError(null)
    try {
      if (event) await updatePersonalEvent(userId, event.id, toInput(values))
      else await createPersonalEvent(userId, toInput(values))
      await navigate(backTo, { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
    }
  }

  const remove = async () => {
    if (!event || !window.confirm(t('personal.deleteConfirm'))) return
    setActionError(null)
    setDeleting(true)
    try {
      await deletePersonalEvent(userId, event.id)
      await navigate(backTo, { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader title={event ? t('personal.editTitle') : t(`personal.newTitle.${type}`)} backTo={backTo} />
      {isIntake && <Notice className="mb-4">{t('health.disclaimer')}</Notice>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {isIntake && (
          <FormField
            id="name"
            label={t('personal.fields.name')}
            autoComplete="off"
            error={fieldError(errors.name?.message)}
            {...register('name')}
          />
        )}
        {type === 'hydration' && (
          <FormField
            id="amountMl"
            inputMode="numeric"
            label={`${t('personal.fields.amountMl')} (${t('common.optional')})`}
            error={fieldError(errors.amountMl?.message)}
            {...register('amountMl')}
          />
        )}
        {type === 'meal' && (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor="mealType" className={labelClass}>
                {t('personal.fields.mealType')}
              </label>
              <select id="mealType" className={inputClass} {...register('mealType')}>
                {MEAL_TYPES.map((mealType) => (
                  <option key={mealType} value={mealType}>
                    {t(`personal.mealTypes.${mealType}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="composition" className={labelClass}>
                {t('personal.fields.composition')}{' '}
                <span className="font-normal text-slate-400">({t('common.optional')})</span>
              </label>
              <textarea id="composition" rows={2} className={inputClass} {...register('composition')} />
              {errors.composition?.message && <p className={errorText}>{t(errors.composition.message)}</p>}
            </div>
          </>
        )}
        <FormField
          id="occurredAt"
          type="datetime-local"
          label={t('personal.fields.occurredAt')}
          error={fieldError(errors.occurredAt?.message)}
          {...register('occurredAt')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="comment" className={labelClass}>
            {t('personal.fields.comment')} <span className="font-normal text-slate-400">({t('common.optional')})</span>
          </label>
          <textarea id="comment" rows={2} className={inputClass} {...register('comment')} />
          {errors.comment?.message && <p className={errorText}>{t(errors.comment.message)}</p>}
        </div>

        {actionError && (
          <p role="alert" className={errorText}>
            {t(actionError)}
          </p>
        )}
        <button type="submit" disabled={isSubmitting || deleting} className={primaryButton}>
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </form>

      {event && (
        <div className="mt-6 border-t border-rose-100 pt-6">
          <button type="button" onClick={() => void remove()} disabled={deleting} className={`${dangerButton} w-full`}>
            {t('common.delete')}
          </button>
        </div>
      )}
    </>
  )
}
