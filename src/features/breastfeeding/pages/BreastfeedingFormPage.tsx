import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
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
  createFeeding,
  deleteEvent,
  newEventId,
  saveFeeding,
  segmentsFromFirestore,
} from '../../../services/repositories/eventRepository'
import type { BreastfeedingEvent } from '../../../types/event'
import { toDateTimeSecondsInputValue } from '../../../utils/dateInput'
import { optionalIntToField, parseOptionalInt } from '../../../utils/formFields'
import { useUserId } from '../../auth/useAuth'
import { useActiveBaby } from '../../babies/useActiveBaby'
import { useEvent } from '../../history/useEvent'
import { forgetSessionBackups } from '../../sessions/sessionActions'
import { feedingFormSchema, toSegments, type FeedingFormValues } from '../schemas'
import { otherSide } from '../session'
import { saveErrorKey } from '../../../utils/firebaseErrors'

/** Fin de séance, correction (§7.2, §7.3) ou saisie manuelle (/breastfeeding/new) */
export function BreastfeedingFormPage() {
  const { t } = useTranslation()
  const { eventId } = useParams()
  const [searchParams] = useSearchParams()
  const { activeBaby, loading } = useActiveBaby()

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (!activeBaby) return <Navigate to="/babies/new" replace />
  if (!eventId) return <FeedingForm babyId={activeBaby.id} />
  // Lien de l'historique vers un bébé archivé : « ?baby=… »
  const babyId = searchParams.get('baby') ?? activeBaby.id
  return <EditFeeding key={`${babyId}/${eventId}`} babyId={babyId} eventId={eventId} />
}

function EditFeeding({ babyId, eventId }: { babyId: string; eventId: string }) {
  const { t } = useTranslation()
  const state = useEvent(babyId, eventId)

  if (state.status === 'loading') return <p className="text-slate-500">{t('common.loading')}</p>
  if (state.status === 'error') return <p className={errorText}>{t('common.loadError')}</p>
  if (state.status === 'missing' || state.event.type !== 'breastfeeding') {
    return <p className="text-slate-600">{t('feeding.notFound')}</p>
  }
  // Une séance qui tourne se gère avec le chronomètre
  if (state.event.status === 'running') return <Navigate to="/breastfeeding" replace />
  return <FeedingForm babyId={babyId} event={state.event} />
}

function toFormValues(event?: BreastfeedingEvent): FeedingFormValues {
  if (event) {
    return {
      segments: segmentsFromFirestore(event.details.segments).map((segment) => ({
        side: segment.side,
        startAt: toDateTimeSecondsInputValue(segment.startAt),
        endAt: segment.endAt ? toDateTimeSecondsInputValue(segment.endAt) : '',
      })),
      estimatedLeftMl: optionalIntToField(event.details.estimatedLeftMl),
      estimatedRightMl: optionalIntToField(event.details.estimatedRightMl),
      comment: event.comment,
    }
  }
  const now = new Date()
  return {
    segments: [
      { side: 'left', startAt: toDateTimeSecondsInputValue(new Date(now.getTime() - 15 * 60_000)), endAt: toDateTimeSecondsInputValue(now) },
    ],
    estimatedLeftMl: '',
    estimatedRightMl: '',
    comment: '',
  }
}

function FeedingForm({ babyId, event }: { babyId: string; event?: BreastfeedingEvent }) {
  const { t } = useTranslation()
  const userId = useUserId()
  const navigate = useNavigate()
  const [defaultValues] = useState(() => toFormValues(event))
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FeedingFormValues>({ resolver: zodResolver(feedingFormSchema), defaultValues })
  const { fields, append, remove } = useFieldArray({ control, name: 'segments' })

  const fieldError = (message?: string) => (message ? t(message) : undefined)
  const segmentsError = errors.segments?.message ?? errors.segments?.root?.message

  const addSegment = () => {
    const last = getValues('segments').at(-1)
    append({ side: last ? otherSide(last.side) : 'left', startAt: last?.endAt ?? '', endAt: '' })
  }

  const onSubmit = async (values: FeedingFormValues) => {
    setActionError(null)
    const session = { status: 'done' as const, segments: toSegments(values.segments) }
    const extras = {
      estimatedLeftMl: parseOptionalInt(values.estimatedLeftMl),
      estimatedRightMl: parseOptionalInt(values.estimatedRightMl),
      comment: values.comment,
    }
    try {
      if (event) {
        forgetSessionBackups(userId, babyId, 'feeding')
        await saveFeeding(userId, babyId, event.id, session, extras)
      } else {
        await createFeeding(userId, babyId, newEventId(userId, babyId), session, extras)
      }
      await navigate('/history', { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
    }
  }

  const removeFeeding = async () => {
    if (!event || !window.confirm(t('feeding.deleteConfirm'))) return
    setActionError(null)
    setDeleting(true)
    try {
      forgetSessionBackups(userId, babyId, 'feeding')
      await deleteEvent(userId, babyId, event.id)
      await navigate('/history', { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader title={t(event ? 'feeding.editTitle' : 'feeding.newTitle')} backTo="/history" />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-3">
          <legend className={`${labelClass} mb-2`}>{t('feeding.segments')}</legend>
          {fields.map((field, index) => (
            <div key={field.id} className={`${cardClass} flex flex-col gap-3`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">{t('feeding.segment', { n: index + 1 })}</span>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(index)} className="text-sm text-red-600">
                    {t('feeding.removeSegment')}
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`segments.${index}.side`} className={labelClass}>
                  {t('feeding.fields.side')}
                </label>
                <select id={`segments.${index}.side`} className={inputClass} {...register(`segments.${index}.side`)}>
                  <option value="left">{t('feeding.sideLabel.left')}</option>
                  <option value="right">{t('feeding.sideLabel.right')}</option>
                </select>
              </div>
              <FormField
                id={`segments.${index}.startAt`}
                type="datetime-local"
                step={1}
                label={t('feeding.fields.startAt')}
                error={fieldError(errors.segments?.[index]?.startAt?.message)}
                {...register(`segments.${index}.startAt`)}
              />
              <FormField
                id={`segments.${index}.endAt`}
                type="datetime-local"
                step={1}
                label={t('feeding.fields.endAt')}
                error={fieldError(errors.segments?.[index]?.endAt?.message)}
                {...register(`segments.${index}.endAt`)}
              />
            </div>
          ))}
          {segmentsError && (
            <p role="alert" className={errorText}>
              {t(segmentsError)}
            </p>
          )}
          <button type="button" onClick={addSegment} className={secondaryButton}>
            {t('feeding.addSegment')}
          </button>
        </fieldset>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="estimatedLeftMl"
              inputMode="numeric"
              label={t('feeding.fields.estimatedLeftMl')}
              error={fieldError(errors.estimatedLeftMl?.message)}
              {...register('estimatedLeftMl')}
            />
            <FormField
              id="estimatedRightMl"
              inputMode="numeric"
              label={t('feeding.fields.estimatedRightMl')}
              error={fieldError(errors.estimatedRightMl?.message)}
              {...register('estimatedRightMl')}
            />
          </div>
          <p className="text-xs text-slate-500">{t('feeding.estimateNote')}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="comment" className={labelClass}>
            {t('feeding.fields.comment')} <span className="font-normal text-slate-400">({t('common.optional')})</span>
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
          <button type="button" onClick={() => void removeFeeding()} disabled={deleting} className={`${dangerButton} w-full`}>
            {t('common.delete')}
          </button>
        </div>
      )}
    </>
  )
}
