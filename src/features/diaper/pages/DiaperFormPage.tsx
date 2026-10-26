import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { z } from 'zod'
import { FormField } from '../../../components/FormField'
import { PageHeader } from '../../../components/PageHeader'
import { dangerButton, errorText, inputClass, labelClass, primaryButton } from '../../../components/styles'
import { createDiaper, deleteEvent, updateDiaper } from '../../../services/repositories/eventRepository'
import type { DiaperEvent, DiaperKind } from '../../../types/event'
import { parseInputValue, toDateTimeInputValue } from '../../../utils/dateInput'
import { commentField, pastDateTimeField } from '../../../utils/formFields'
import { useUserId } from '../../auth/useAuth'
import { useActiveBaby } from '../../babies/useActiveBaby'
import { useEvent } from '../../history/useEvent'
import { saveErrorKey } from '../../../utils/firebaseErrors'
import { IconDroplet, IconPoo, type Icon } from '@tabler/icons-react'

const KINDS: { kind: DiaperKind; icons: Icon[] }[] = [
  { kind: 'wet', icons: [IconDroplet] },
  { kind: 'dirty', icons: [IconPoo] },
  { kind: 'both', icons: [IconDroplet, IconPoo] },
]

const diaperSchema = z.object({
  occurredAt: pastDateTimeField(),
  kind: z.enum(['wet', 'dirty', 'both']),
  comment: commentField(),
})

type DiaperFormValues = z.infer<typeof diaperSchema>

/** Change de couche (§10) : nouveau (/diaper/new) ou modification */
export function DiaperFormPage() {
  const { t } = useTranslation()
  const { eventId } = useParams()
  const [searchParams] = useSearchParams()
  const { activeBaby, loading } = useActiveBaby()

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (!activeBaby) return <Navigate to="/babies/new" replace />
  if (!eventId) return <DiaperForm babyId={activeBaby.id} />
  // Lien de l'historique vers un bébé archivé : « ?baby=… »
  const babyId = searchParams.get('baby') ?? activeBaby.id
  return <EditDiaper key={`${babyId}/${eventId}`} babyId={babyId} eventId={eventId} />
}

function EditDiaper({ babyId, eventId }: { babyId: string; eventId: string }) {
  const { t } = useTranslation()
  const state = useEvent(babyId, eventId)

  if (state.status === 'loading') return <p className="text-slate-500">{t('common.loading')}</p>
  if (state.status === 'error') return <p className={errorText}>{t('common.loadError')}</p>
  if (state.status === 'missing' || state.event.type !== 'diaper') {
    return <p className="text-slate-600">{t('diaper.notFound')}</p>
  }
  return <DiaperForm babyId={babyId} event={state.event} />
}

const toFormValues = (event?: DiaperEvent): DiaperFormValues =>
  event
    ? {
        occurredAt: toDateTimeInputValue(event.occurredAt.toDate()),
        kind: event.details.kind,
        comment: event.comment,
      }
    : { occurredAt: toDateTimeInputValue(new Date()), kind: 'wet', comment: '' }

function DiaperForm({ babyId, event }: { babyId: string; event?: DiaperEvent }) {
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
  } = useForm<DiaperFormValues>({ resolver: zodResolver(diaperSchema), defaultValues })

  const onSubmit = async (values: DiaperFormValues) => {
    setActionError(null)
    const input = { occurredAt: parseInputValue(values.occurredAt)!, kind: values.kind, comment: values.comment }
    try {
      if (event) {
        await updateDiaper(userId, babyId, event.id, input)
        await navigate('/history', { replace: true })
      } else {
        await createDiaper(userId, babyId, input)
        await navigate('/', { replace: true })
      }
    } catch (error) {
      setActionError(saveErrorKey(error))
    }
  }

  const remove = async () => {
    if (!event || !window.confirm(t('diaper.deleteConfirm'))) return
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
      <PageHeader title={t(event ? 'diaper.editTitle' : 'diaper.newTitle')} backTo={event ? '/history' : '/'} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className={labelClass}>{t('diaper.fields.kind')}</legend>
          <div className="grid grid-cols-3 gap-3">
            {KINDS.map(({ kind, icons }) => (
              <label key={kind} className="relative cursor-pointer">
                <input type="radio" value={kind} className="peer sr-only" {...register('kind')} />
                <span className="flex flex-col items-center gap-1 rounded-xl bg-surface p-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200 peer-checked:bg-rose-100 peer-checked:ring-2 peer-checked:ring-rose-400 peer-focus-visible:ring-2 peer-focus-visible:ring-rose-300">
                  <span aria-hidden="true" className="flex gap-0.5 text-sky-700">
                    {icons.map((KindIcon, index) => (
                      <KindIcon key={index} size={26} stroke={1.75} />
                    ))}
                  </span>
                  {t(`diaper.kinds.${kind}`)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <FormField
          id="occurredAt"
          type="datetime-local"
          label={t('diaper.fields.occurredAt')}
          error={errors.occurredAt?.message && t(errors.occurredAt.message)}
          {...register('occurredAt')}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="comment" className={labelClass}>
            {t('diaper.fields.comment')} <span className="font-normal text-slate-400">({t('common.optional')})</span>
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
