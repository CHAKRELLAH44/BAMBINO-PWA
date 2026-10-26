import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch, type DefaultValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { FormField } from '../../../components/FormField'
import { PageHeader } from '../../../components/PageHeader'
import { dangerButton, errorText, inputClass, labelClass, primaryButton } from '../../../components/styles'
import { createBottle, deleteEvent, updateBottle } from '../../../services/repositories/eventRepository'
import { createBottleFromStock, StockError } from '../../../services/repositories/milkStockRepository'
import type { BottleEvent, BottleInput } from '../../../types/event'
import { isInStock } from '../../../types/milkStock'
import { parseInputValue, toDateTimeInputValue } from '../../../utils/dateInput'
import { formatShortDateTime } from '../../../utils/formatDate'
import { useUserId } from '../../auth/useAuth'
import { useActiveBaby } from '../../babies/useActiveBaby'
import { useEvent } from '../../history/useEvent'
import { useMilkContainers } from '../../milk-stock/useMilkStock'
import { bottleSchema, MILK_SOURCES, type BottleFormValues, type MilkSource } from '../schemas'
import { saveErrorKey } from '../../../utils/firebaseErrors'
import { IconBadge } from '../../../components/IconBadge'
import { ICONS, type IconSpec } from '../../../components/icons'

/** Nouveau biberon (/bottle/new) ou modification (/bottle/:eventId) pour le bébé suivi (§6 : quantité bue seulement) */
export function BottleFormPage() {
  const { t } = useTranslation()
  const { eventId } = useParams()
  const [searchParams] = useSearchParams()
  const { activeBaby, loading } = useActiveBaby()

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (!activeBaby) return <Navigate to="/babies/new" replace />
  if (!eventId) return <BottleForm babyId={activeBaby.id} />
  // Lien de l'historique vers un bébé archivé : « ?baby=… »
  const babyId = searchParams.get('baby') ?? activeBaby.id
  return <EditBottle key={`${babyId}/${eventId}`} babyId={babyId} eventId={eventId} />
}

function EditBottle({ babyId, eventId }: { babyId: string; eventId: string }) {
  const { t } = useTranslation()
  const state = useEvent(babyId, eventId)

  if (state.status === 'loading') return <p className="text-slate-500">{t('common.loading')}</p>
  if (state.status === 'error') return <p className={errorText}>{t('common.loadError')}</p>
  if (state.status === 'missing' || state.event.type !== 'bottle') {
    return <p className="text-slate-600">{t('bottle.notFound')}</p>
  }
  return <BottleForm babyId={babyId} event={state.event} />
}

const SOURCE_ICONS: Record<MilkSource, IconSpec> = { formula: ICONS.bottle, breastMilk: ICONS.breastfeeding, stock: ICONS.stock }

const sourceOf = (event: BottleEvent): MilkSource => (event.details.containerId ? 'stock' : event.details.milkType)

const toFormValues = (event?: BottleEvent): DefaultValues<BottleFormValues> =>
  event
    ? {
        occurredAt: toDateTimeInputValue(event.occurredAt.toDate()),
        consumedMl: event.details.consumedMl,
        source: sourceOf(event),
        containerId: event.details.containerId ?? '',
        comment: event.comment,
      }
    : { occurredAt: toDateTimeInputValue(new Date()), source: 'formula', containerId: '', comment: '' }

function BottleForm({ babyId, event }: { babyId: string; event?: BottleEvent }) {
  const { t, i18n } = useTranslation()
  const userId = useUserId()
  const navigate = useNavigate()
  const { containers } = useMilkContainers(babyId)
  const [defaultValues] = useState(() => toFormValues(event))
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BottleFormValues>({ resolver: zodResolver(bottleSchema), defaultValues })

  const fieldError = (message?: string) => (message ? t(message) : undefined)
  // Un biberon déjà pris dans le stock garde sa quantité et son contenant : le stock a déjà été déduit (§8.3)
  const linkedToStock = Boolean(event?.details.containerId)
  const source = useWatch({ control, name: 'source' })
  // Le stock n'est proposé qu'à la création ; le contenant n'est jamais présélectionné (§8.4)
  const sources = event ? MILK_SOURCES.filter((candidate) => candidate !== 'stock') : MILK_SOURCES
  const availableContainers = source === 'stock' ? [...containers].filter(isInStock).reverse() : []

  const onSubmit = async (values: BottleFormValues) => {
    setActionError(null)
    const input: BottleInput = {
      occurredAt: parseInputValue(values.occurredAt)!,
      details: { consumedMl: values.consumedMl, milkType: values.source === 'formula' ? 'formula' : 'breastMilk' },
      comment: values.comment,
    }
    try {
      if (event) {
        await updateBottle(userId, babyId, event.id, input)
        await navigate('/history', { replace: true })
        return
      }
      if (values.source === 'stock') {
        await createBottleFromStock(userId, babyId, input, values.containerId)
      } else {
        await createBottle(userId, babyId, input)
      }
      await navigate('/', { replace: true })
    } catch (error) {
      setActionError(error instanceof StockError ? `stock.errors.${error.code}` : saveErrorKey(error))
    }
  }

  const remove = async () => {
    if (!event) return
    const message = linkedToStock ? `${t('bottle.deleteConfirm')}\n${t('bottle.fromStockDelete')}` : t('bottle.deleteConfirm')
    if (!window.confirm(message)) return
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
      <PageHeader title={t(event ? 'bottle.editTitle' : 'bottle.newTitle')} backTo={event ? '/history' : '/'} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <FormField
          id="occurredAt"
          type="datetime-local"
          label={t('bottle.fields.occurredAt')}
          error={fieldError(errors.occurredAt?.message)}
          {...register('occurredAt')}
        />
        <FormField
          id="consumedMl"
          type="number"
          inputMode="numeric"
          min={0}
          max={1000}
          readOnly={linkedToStock}
          label={t('bottle.fields.consumedMl')}
          error={fieldError(errors.consumedMl?.message)}
          {...register('consumedMl', { valueAsNumber: true })}
        />

        {linkedToStock ? (
          <>
            <input type="hidden" {...register('source')} />
            <p className="flex items-center gap-3 rounded-lg bg-surface p-3 text-sm text-slate-600">
              <IconBadge spec={SOURCE_ICONS.stock} size="sm" />
              <span>
                {t('bottle.milkTypes.stock')} · {t('bottle.fromStockLocked')}
              </span>
            </p>
          </>
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className={labelClass}>{t('bottle.fields.milkType')}</legend>
            <div className={`grid gap-3 ${sources.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {sources.map((candidate) => (
                <label key={candidate} className="relative cursor-pointer">
                  <input type="radio" value={candidate} className="peer sr-only" {...register('source')} />
                  <span className="flex h-full flex-col items-center gap-1 rounded-xl bg-surface p-3 text-center text-sm font-medium text-slate-700 ring-1 ring-slate-200 peer-checked:bg-rose-100 peer-checked:ring-2 peer-checked:ring-rose-400 peer-focus-visible:ring-2 peer-focus-visible:ring-rose-300">
                    <IconBadge spec={SOURCE_ICONS[candidate]} />
                    {t(`bottle.milkTypes.${candidate}`)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {source === 'stock' && !event && (
          <div className="flex flex-col gap-1">
            <label htmlFor="containerId" className={labelClass}>
              {t('bottle.fields.container')}
            </label>
            {availableContainers.length > 0 ? (
              <select id="containerId" className={inputClass} {...register('containerId')}>
                <option value="">{t('bottle.chooseContainer')}</option>
                {availableContainers.map((container) => (
                  <option key={container.id} value={container.id}>
                    {t('bottle.containerOption', {
                      date: formatShortDateTime(container.pumpedAt.toDate(), i18n.language),
                      storage: t(`stock.storage.${container.storageType}`),
                      remaining: container.remainingAmountMl,
                    })}
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{t('bottle.noStock')}</p>
            )}
            <p className="text-xs text-slate-500">
              {t('bottle.containerHint')} {t('stock.checkNote')}
            </p>
            {errors.containerId?.message && <p className={errorText}>{t(errors.containerId.message)}</p>}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="comment" className={labelClass}>
            {t('bottle.fields.comment')} <span className="font-normal text-slate-400">({t('common.optional')})</span>
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
