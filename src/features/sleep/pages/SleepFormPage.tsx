import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { FormField } from '../../../components/FormField'
import { PageHeader } from '../../../components/PageHeader'
import { dangerButton, errorText, inputClass, labelClass, primaryButton } from '../../../components/styles'
import { createSleep, deleteEvent, newEventId, updateSleep } from '../../../services/repositories/eventRepository'
import type { SleepEvent } from '../../../types/event'
import { parseInputValue, toDateTimeSecondsInputValue } from '../../../utils/dateInput'
import { useUserId } from '../../auth/useAuth'
import { useActiveBaby } from '../../babies/useActiveBaby'
import { useEvent } from '../../history/useEvent'
import { sleepFormSchema, type SleepFormValues } from '../schemas'
import { saveErrorKey } from '../../../utils/firebaseErrors'

/** Saisie manuelle (/sleep/new), modification et commentaire d'un sommeil terminé (§9) */
export function SleepFormPage() {
  const { t } = useTranslation()
  const { eventId } = useParams()
  const [searchParams] = useSearchParams()
  const { activeBaby, loading } = useActiveBaby()

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (!activeBaby) return <Navigate to="/babies/new" replace />
  if (!eventId) return <SleepForm babyId={activeBaby.id} />
  // Lien de l'historique vers un bébé archivé : « ?baby=… »
  const babyId = searchParams.get('baby') ?? activeBaby.id
  return <EditSleep key={`${babyId}/${eventId}`} babyId={babyId} eventId={eventId} />
}

function EditSleep({ babyId, eventId }: { babyId: string; eventId: string }) {
  const { t } = useTranslation()
  const state = useEvent(babyId, eventId)

  if (state.status === 'loading') return <p className="text-slate-500">{t('common.loading')}</p>
  if (state.status === 'error') return <p className={errorText}>{t('common.loadError')}</p>
  if (state.status === 'missing' || state.event.type !== 'sleep') {
    return <p className="text-slate-600">{t('sleep.notFound')}</p>
  }
  if (state.event.status === 'running') return <Navigate to="/sleep" replace />
  return <SleepForm babyId={babyId} event={state.event} />
}

function toFormValues(event?: SleepEvent): SleepFormValues {
  if (event) {
    return {
      startAt: toDateTimeSecondsInputValue(event.startAt.toDate()),
      endAt: event.endAt ? toDateTimeSecondsInputValue(event.endAt.toDate()) : '',
      comment: event.comment,
    }
  }
  const now = new Date()
  return {
    startAt: toDateTimeSecondsInputValue(new Date(now.getTime() - 60 * 60_000)),
    endAt: toDateTimeSecondsInputValue(now),
    comment: '',
  }
}

function SleepForm({ babyId, event }: { babyId: string; event?: SleepEvent }) {
  const { t } = useTranslation()
  const userId = useUserId()
  const navigate = useNavigate()
  const [defaultValues] = useState(() => toFormValues(event))
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SleepFormValues>({ resolver: zodResolver(sleepFormSchema), defaultValues })

  const fieldError = (message?: string) => (message ? t(message) : undefined)

  const onSubmit = async (values: SleepFormValues) => {
    setActionError(null)
    const startAt = parseInputValue(values.startAt)!
    const endAt = parseInputValue(values.endAt)!
    try {
      if (event) await updateSleep(userId, babyId, event.id, startAt, endAt, values.comment)
      else await createSleep(userId, babyId, newEventId(userId, babyId), startAt, endAt, values.comment)
      await navigate('/history', { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
    }
  }

  const remove = async () => {
    if (!event || !window.confirm(t('sleep.deleteConfirm'))) return
    setActionError(null)
    setDeleting(true)
    try {
      await deleteEvent(userId, babyId, event.id)
      await navigate('/history', { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader title={t(event ? 'sleep.editTitle' : 'sleep.newTitle')} backTo="/history" />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <FormField
          id="startAt"
          type="datetime-local"
          step={1}
          label={t('sleep.fields.startAt')}
          error={fieldError(errors.startAt?.message)}
          {...register('startAt')}
        />
        <FormField
          id="endAt"
          type="datetime-local"
          step={1}
          label={t('sleep.fields.endAt')}
          error={fieldError(errors.endAt?.message)}
          {...register('endAt')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="comment" className={labelClass}>
            {t('sleep.fields.comment')} <span className="font-normal text-slate-400">({t('common.optional')})</span>
          </label>
          <textarea id="comment" rows={3} className={inputClass} {...register('comment')} />
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
