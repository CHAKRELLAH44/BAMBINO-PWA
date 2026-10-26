import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch, type DefaultValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { FormField } from '../../../components/FormField'
import { PageHeader } from '../../../components/PageHeader'
import { cardClass, dangerButton, errorText, inputClass, labelClass, primaryButton } from '../../../components/styles'
import { deleteEvent, updatePumping } from '../../../services/repositories/eventRepository'
import { createPumping } from '../../../services/repositories/milkStockRepository'
import type { OngoingPumping, PumpingEvent, PumpingInput } from '../../../types/event'
import { parseInputValue, toDateTimeInputValue } from '../../../utils/dateInput'
import { optionalIntToField, parseOptionalInt } from '../../../utils/formFields'
import { useUserId } from '../../auth/useAuth'
import { useActiveBaby } from '../../babies/useActiveBaby'
import { useEvent } from '../../history/useEvent'
import { forgetSessionBackups } from '../../sessions/sessionActions'
import { useOngoingPumping } from '../../sessions/useOngoingPumping'
import { pumpingMinutes } from '../pumpingSession'
import { pumpingSchema, type PumpingFormValues } from '../schemas'
import { saveErrorKey } from '../../../utils/firebaseErrors'

/** Tirage (§8.1), avec mise au stock facultative à la création (§8.2) ; « ?session=… » = fin du chronomètre */
export function PumpingFormPage() {
  const { t } = useTranslation()
  const { eventId } = useParams()
  const [searchParams] = useSearchParams()
  const { activeBaby, loading } = useActiveBaby()

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (!activeBaby) return <Navigate to="/babies/new" replace />
  if (!eventId) {
    const sessionId = searchParams.get('session')
    if (sessionId) return <FinishPumping key={sessionId} babyId={activeBaby.id} sessionId={sessionId} />
    return <PumpingForm babyId={activeBaby.id} />
  }
  // Lien de l'historique vers un bébé archivé : « ?baby=… »
  const babyId = searchParams.get('baby') ?? activeBaby.id
  return <EditPumping key={`${babyId}/${eventId}`} babyId={babyId} eventId={eventId} />
}

function EditPumping({ babyId, eventId }: { babyId: string; eventId: string }) {
  const { t } = useTranslation()
  const state = useEvent(babyId, eventId)

  if (state.status === 'loading') return <p className="text-slate-500">{t('common.loading')}</p>
  if (state.status === 'error') return <p className={errorText}>{t('common.loadError')}</p>
  if (state.status === 'missing' || state.event.type !== 'milkPumping') {
    return <p className="text-slate-600">{t('pumping.notFound')}</p>
  }
  return <PumpingForm babyId={babyId} event={state.event} />
}

/** Fin du chronomètre : la séance est gardée dès qu'on l'a trouvée, même quand l'enregistrement la supprime */
function FinishPumping({ babyId, sessionId }: { babyId: string; sessionId: string }) {
  const { t } = useTranslation()
  const { pumping, loading } = useOngoingPumping(babyId)
  const [found, setFound] = useState<OngoingPumping | null>(null)
  if (!found && pumping?.sessionId === sessionId) setFound(pumping)

  if (found) return <PumpingForm babyId={babyId} finishing={found} />
  if (loading || pumping?.sessionId === sessionId) return <p className="text-slate-500">{t('common.loading')}</p>
  // Séance déjà enregistrée ou annulée (retour arrière) : saisie ordinaire
  return <PumpingForm babyId={babyId} />
}

const fromTimer = ({ session }: OngoingPumping): DefaultValues<PumpingFormValues> => {
  const minutes = pumpingMinutes(session, new Date())
  return {
    occurredAt: toDateTimeInputValue(session.segments[0].startAt),
    side: session.side,
    leftMl: '',
    rightMl: '',
    durationMin: minutes > 0 ? String(minutes) : '',
    comment: '',
    addToStock: false,
    storageType: 'fridge',
  }
}

const toFormValues = (event?: PumpingEvent, finishing?: OngoingPumping): DefaultValues<PumpingFormValues> =>
  finishing
    ? fromTimer(finishing)
    : event
    ? {
        occurredAt: toDateTimeInputValue(event.occurredAt.toDate()),
        side: event.details.side,
        totalMl: event.details.totalMl,
        leftMl: optionalIntToField(event.details.leftMl),
        rightMl: optionalIntToField(event.details.rightMl),
        durationMin: optionalIntToField(event.details.durationMin),
        comment: event.comment,
        addToStock: false,
        storageType: 'fridge',
      }
    : {
        occurredAt: toDateTimeInputValue(new Date()),
        side: 'both',
        leftMl: '',
        rightMl: '',
        durationMin: '',
        comment: '',
        addToStock: false,
        storageType: 'fridge',
      }

function PumpingForm({
  babyId,
  event,
  finishing,
}: {
  babyId: string
  event?: PumpingEvent
  finishing?: OngoingPumping
}) {
  const { t } = useTranslation()
  const userId = useUserId()
  const navigate = useNavigate()
  const [defaultValues] = useState(() => toFormValues(event, finishing))
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PumpingFormValues>({ resolver: zodResolver(pumpingSchema), defaultValues })
  const [side, addToStock] = useWatch({ control, name: ['side', 'addToStock'] })

  const fieldError = (message?: string) => (message ? t(message) : undefined)

  const onSubmit = async (values: PumpingFormValues) => {
    setActionError(null)
    const both = values.side === 'both'
    const input: PumpingInput = {
      occurredAt: parseInputValue(values.occurredAt)!,
      details: {
        side: values.side,
        totalMl: values.totalMl,
        leftMl: both ? parseOptionalInt(values.leftMl) : null,
        rightMl: both ? parseOptionalInt(values.rightMl) : null,
        durationMin: parseOptionalInt(values.durationMin),
      },
      comment: values.comment,
    }
    try {
      if (event) {
        await updatePumping(userId, babyId, event.id, input)
        await navigate('/history', { replace: true })
      } else {
        // Le tirage et la suppression de la séance partent ensemble : jamais de chronomètre resté ouvert
        if (finishing) forgetSessionBackups(userId, babyId, 'pumping')
        await createPumping(
          userId,
          babyId,
          input,
          values.addToStock ? { storageType: values.storageType } : null,
          finishing?.sessionId ?? null,
        )
        await navigate(values.addToStock ? '/stock' : '/', { replace: true })
      }
    } catch (error) {
      setActionError(saveErrorKey(error))
    }
  }

  const remove = async () => {
    if (!event || !window.confirm(t('pumping.deleteConfirm'))) return
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
      <PageHeader
        title={t(event ? 'pumping.editTitle' : finishing ? 'pumping.finishTitle' : 'pumping.newTitle')}
        backTo={event ? '/history' : finishing ? '/pumping' : '/'}
      />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        {finishing && <p className="text-sm text-slate-500">{t('pumping.fromTimer')}</p>}
        <FormField
          id="occurredAt"
          type="datetime-local"
          label={t('pumping.fields.occurredAt')}
          error={fieldError(errors.occurredAt?.message)}
          {...register('occurredAt')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="side" className={labelClass}>
            {t('pumping.fields.side')}
          </label>
          <select id="side" className={inputClass} {...register('side')}>
            <option value="left">{t('pumping.sides.left')}</option>
            <option value="right">{t('pumping.sides.right')}</option>
            <option value="both">{t('pumping.sides.both')}</option>
          </select>
        </div>
        <FormField
          id="totalMl"
          type="number"
          inputMode="numeric"
          min={1}
          label={t('pumping.fields.totalMl')}
          error={fieldError(errors.totalMl?.message)}
          {...register('totalMl', { valueAsNumber: true })}
        />
        {side === 'both' && (
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="leftMl"
              inputMode="numeric"
              label={`${t('pumping.fields.leftMl')}`}
              error={fieldError(errors.leftMl?.message)}
              {...register('leftMl')}
            />
            <FormField
              id="rightMl"
              inputMode="numeric"
              label={t('pumping.fields.rightMl')}
              error={fieldError(errors.rightMl?.message)}
              {...register('rightMl')}
            />
          </div>
        )}
        <FormField
          id="durationMin"
          inputMode="numeric"
          label={`${t('pumping.fields.durationMin')} (${t('common.optional')})`}
          error={fieldError(errors.durationMin?.message)}
          {...register('durationMin')}
        />

        {event ? (
          <p className="text-sm text-slate-500">{t('pumping.editStockNote')}</p>
        ) : (
          <div className={`${cardClass} flex flex-col gap-3`}>
            <label className="flex items-center gap-3 font-medium text-slate-700">
              <input type="checkbox" className="h-5 w-5 accent-rose-500" {...register('addToStock')} />
              {t('pumping.addToStock')}
            </label>
            {addToStock && (
              <>
                <div className="flex flex-col gap-1">
                  <label htmlFor="storageType" className={labelClass}>
                    {t('pumping.storageType')}
                  </label>
                  <select id="storageType" className={inputClass} {...register('storageType')}>
                    <option value="fridge">{t('stock.storage.fridge')}</option>
                    <option value="freezer">{t('stock.storage.freezer')}</option>
                    <option value="other">{t('stock.storage.other')}</option>
                  </select>
                </div>
                <p className="text-sm text-slate-500">{t('pumping.stockNote')}</p>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="comment" className={labelClass}>
            {t('pumping.fields.comment')} <span className="font-normal text-slate-400">({t('common.optional')})</span>
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
