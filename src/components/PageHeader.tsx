import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { IconArrowLeft } from '@tabler/icons-react'

export function PageHeader({ title, backTo }: { title: string; backTo?: string }) {
  const { t } = useTranslation()

  return (
    <div className="mb-4 flex items-center gap-2">
      {backTo && (
        <Link
          to={backTo}
          aria-label={t('common.back')}
          className="rounded-full p-2 text-slate-500 hover:bg-surface"
        >
          <IconArrowLeft aria-hidden="true" size={22} stroke={1.75} className="rtl:rotate-180" />
        </Link>
      )}
      <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
    </div>
  )
}
