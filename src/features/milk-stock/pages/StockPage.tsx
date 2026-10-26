import { useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router'
import { PageHeader } from '../../../components/PageHeader'
import { cardClass, errorText, primaryButton } from '../../../components/styles'
import { isInStock, type MilkContainer } from '../../../types/milkStock'
import { formatShortDateTime } from '../../../utils/formatDate'
import { useActiveBaby } from '../../babies/useActiveBaby'
import { summarizeStock } from '../stockCalculations'
import { useMilkContainers } from '../useMilkStock'
import { IconSnowflake } from '@tabler/icons-react'
import { IconBadge } from '../../../components/IconBadge'
import { ICONS } from '../../../components/icons'
import { Notice } from '../../../components/Notice'

const STATUS_CLASSES: Record<MilkContainer['status'], string> = {
  available: 'bg-emerald-100 text-emerald-800',
  used: 'bg-amber-100 text-amber-800',
  depleted: 'bg-slate-100 text-slate-600',
  discarded: 'bg-slate-100 text-slate-600',
}

/** Tableau de bord du stock de lait (§8.4) */
export function StockPage() {
  const { activeBaby } = useActiveBaby()
  if (!activeBaby) return <Navigate to="/babies/new" replace />
  return <StockOverview key={activeBaby.id} babyId={activeBaby.id} />
}

function StockOverview({ babyId }: { babyId: string }) {
  const { t } = useTranslation()
  const { containers, loading, loadError } = useMilkContainers(babyId)
  const summary = summarizeStock(containers)
  // Le plus ancien d'abord, pour l'utiliser en premier
  const inStock = containers.filter(isInStock).reverse()
  const finished = containers.filter((container) => !isInStock(container))

  return (
    <>
      <PageHeader title={t('stock.title')} backTo="/" />
      {loading && <p className="text-slate-500">{t('common.loading')}</p>}
      {loadError && <p className={errorText}>{t('common.loadError')}</p>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryTile label={t('stock.available')} value={t('common.ml', { ml: summary.availableMl })} />
        <SummaryTile label={t('stock.containers')} value={String(summary.containersInStock)} />
        <SummaryTile label={t('stock.used')} value={t('common.ml', { ml: summary.usedMl })} />
        <SummaryTile label={t('stock.discarded')} value={String(summary.discardedCount)} />
      </section>

      <Notice tone="warning" className="mt-4">
        {t('stock.checkNote')}
      </Notice>

      <Link to="/pumping" className={`${primaryButton} mt-4 block`}>
        {t('stock.newPumping')}
      </Link>

      <section className="mt-6 flex flex-col gap-2">
        <h2 className="font-semibold text-slate-700">{t('stock.inStockTitle')}</h2>
        {!loading && inStock.length === 0 && <p className="text-slate-600">{t('stock.empty')}</p>}
        {inStock.map((container) => (
          <ContainerRow key={container.id} container={container} />
        ))}
      </section>

      {finished.length > 0 && (
        <section className="mt-6 flex flex-col gap-2">
          <h2 className="font-semibold text-slate-700">{t('stock.finishedTitle')}</h2>
          {finished.map((container) => (
            <ContainerRow key={container.id} container={container} />
          ))}
        </section>
      )}
    </>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className={cardClass}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-800">{value}</p>
    </div>
  )
}

function ContainerRow({ container }: { container: MilkContainer }) {
  const { t, i18n } = useTranslation()

  return (
    <Link to={`/stock/${container.id}`} className={`${cardClass} flex items-center gap-3 hover:bg-rose-50`}>
      <IconBadge spec={container.storageType === 'freezer' ? { icon: IconSnowflake, tone: 'sky' } : ICONS.stock} />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-slate-800">
          {t('stock.containerTitle', { date: formatShortDateTime(container.pumpedAt.toDate(), i18n.language) })}
        </span>
        <span className="block text-sm text-slate-500">
          {t(`stock.storage.${container.storageType}`)} ·{' '}
          {t('stock.amounts', { remaining: container.remainingAmountMl, initial: container.initialAmountMl })}
        </span>
      </span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[container.status]}`}>
        {t(`stock.status.${container.status}`)}
      </span>
    </Link>
  )
}
