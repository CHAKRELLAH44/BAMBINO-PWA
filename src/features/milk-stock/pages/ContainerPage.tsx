import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router'
import { FormField } from '../../../components/FormField'
import { PageHeader } from '../../../components/PageHeader'
import { cardClass, dangerButton, errorText, secondaryButton } from '../../../components/styles'
import {
  discardContainer,
  StockError,
  takeFromContainer,
} from '../../../services/repositories/milkStockRepository'
import { isInStock, type MilkContainer } from '../../../types/milkStock'
import { formatShortDateTime } from '../../../utils/formatDate'
import { useUserId } from '../../auth/useAuth'
import { useActiveBaby } from '../../babies/useActiveBaby'
import { stockUseSchema, type StockUseValues } from '../schemas'
import { useMilkContainers, useStockOperations } from '../useMilkStock'
import { saveErrorKey } from '../../../utils/firebaseErrors'
import { Notice } from '../../../components/Notice'

const stockErrorKey = (error: unknown) =>
  error instanceof StockError ? `stock.errors.${error.code}` : saveErrorKey(error)

/** Détail d'un contenant : quantités, historique, utilisation et mise à l'écart (§8.2, §8.3) */
export function ContainerPage() {
  const { containerId } = useParams()
  const { activeBaby } = useActiveBaby()
  if (!activeBaby || !containerId) return <Navigate to="/stock" replace />
  return <ContainerLoader key={containerId} babyId={activeBaby.id} containerId={containerId} />
}

function ContainerLoader({ babyId, containerId }: { babyId: string; containerId: string }) {
  const { t } = useTranslation()
  const { containers, loading, loadError } = useMilkContainers(babyId)
  const container = containers.find((candidate) => candidate.id === containerId)

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (loadError) return <p className={errorText}>{t('common.loadError')}</p>
  if (!container) return <p className="text-slate-600">{t('stock.notFound')}</p>
  return <ContainerDetail babyId={babyId} container={container} />
}

function ContainerDetail({ babyId, container }: { babyId: string; container: MilkContainer }) {
  const { t, i18n } = useTranslation()
  const userId = useUserId()
  const { operations } = useStockOperations(babyId, container.id)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StockUseValues>({ resolver: zodResolver(stockUseSchema) })

  const onUse = async (values: StockUseValues) => {
    setActionError(null)
    try {
      await takeFromContainer(userId, babyId, container.id, values.amountMl)
      reset()
    } catch (error) {
      setActionError(stockErrorKey(error))
    }
  }

  const discard = async () => {
    if (!window.confirm(t('stock.discardConfirm'))) return
    setActionError(null)
    setBusy(true)
    try {
      await discardContainer(userId, babyId, container.id)
    } catch (error) {
      setActionError(stockErrorKey(error))
    } finally {
      setBusy(false)
    }
  }

  const pumpedAt = formatShortDateTime(container.pumpedAt.toDate(), i18n.language)

  return (
    <>
      <PageHeader title={t('stock.containerTitle', { date: pumpedAt })} backTo="/stock" />

      <section className={`${cardClass} grid grid-cols-2 gap-3 text-sm`}>
        <Detail label={t('stock.pumpedAt')} value={pumpedAt} />
        <Detail label={t('stock.storedIn')} value={t(`stock.storage.${container.storageType}`)} />
        <Detail
          label={t('stock.remaining')}
          value={t('stock.amounts', { remaining: container.remainingAmountMl, initial: container.initialAmountMl })}
        />
        <Detail label="" value={t(`stock.status.${container.status}`)} />
      </section>

      {isInStock(container) && (
        <>
          <Notice tone="warning" className="mt-4">
        {t('stock.checkNote')}
      </Notice>
          <form onSubmit={handleSubmit(onUse)} noValidate className={`${cardClass} mt-4 flex flex-col gap-3`}>
            <h2 className="font-semibold text-slate-700">{t('stock.useTitle')}</h2>
            <FormField
              id="amountMl"
              type="number"
              inputMode="numeric"
              min={1}
              max={container.remainingAmountMl}
              label={t('stock.useAmount')}
              error={errors.amountMl?.message && t(errors.amountMl.message)}
              {...register('amountMl', { valueAsNumber: true })}
            />
            <button type="submit" disabled={isSubmitting || busy} className={secondaryButton}>
              {t('stock.useSubmit')}
            </button>
          </form>
          <button type="button" onClick={() => void discard()} disabled={busy} className={`${dangerButton} mt-3 w-full`}>
            {t('stock.discard')}
          </button>
        </>
      )}

      {actionError && (
        <p role="alert" className={`${errorText} mt-3`}>
          {t(actionError)}
        </p>
      )}

      <section className="mt-6 flex flex-col gap-2">
        <h2 className="font-semibold text-slate-700">{t('stock.historyTitle')}</h2>
        {operations.map((operation) => (
          <div key={operation.id} className={`${cardClass} flex items-center justify-between text-sm`}>
            <span className="text-slate-700">
              {t(`stock.operations.${operation.type}`)} · {operation.amountMl} ml
              {operation.linkedEventId && operation.type === 'use' && ` · ${t('stock.linkedBottle')}`}
            </span>
            <time className="text-slate-500">{formatShortDateTime(operation.occurredAt.toDate(), i18n.language)}</time>
          </div>
        ))}
      </section>
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      {label && <p className="text-slate-500">{label}</p>}
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  )
}
