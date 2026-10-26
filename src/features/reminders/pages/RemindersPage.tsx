import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PageHeader } from '../../../components/PageHeader'
import { cardClass, errorText, primaryButton } from '../../../components/styles'
import { setReminderEnabled } from '../../../services/repositories/reminderRepository'
import type { Reminder } from '../../../types/reminder'
import { saveErrorKey } from '../../../utils/firebaseErrors'
import { useUserId } from '../../auth/useAuth'
import { useActiveBaby } from '../../babies/useActiveBaby'
import { SERVICE_ICONS } from '../reminderOptions'
import { useFormatSchedule } from '../useFormatSchedule'
import { useReminders } from '../useReminders'
import { IconBellOff } from '@tabler/icons-react'
import { IconBadge } from '../../../components/IconBadge'
import { Notice } from '../../../components/Notice'

/** Rappels configurables (§14) : enregistrés comme données, sans aucun envoi avant P2 */
export function RemindersPage() {
  const { t } = useTranslation()
  const { babies } = useActiveBaby()
  const { reminders, loading, loadError } = useReminders()

  // Un groupe par bébé, puis la maman
  const groups = [
    ...babies.map((baby) => ({
      key: baby.id,
      label: baby.name,
      items: reminders.filter((reminder) => reminder.babyId === baby.id),
    })),
    {
      key: 'mother',
      label: t('reminders.mother'),
      items: reminders.filter((reminder) => reminder.babyId === null),
    },
  ].filter((group) => group.items.length > 0)

  return (
    <>
      <PageHeader title={t('reminders.title')} backTo="/mother" />
      <Notice tone="warning" icon={IconBellOff} className="mb-4">
        {t('reminders.notice')}
      </Notice>
      <Link to="/reminders/new?returnTo=/reminders" className={`${primaryButton} block`}>
        {t('reminders.add')}
      </Link>

      {loading && <p className="mt-4 text-slate-500">{t('common.loading')}</p>}
      {loadError && <p className={`${errorText} mt-4`}>{t('common.loadError')}</p>}
      {!loading && !loadError && reminders.length === 0 && <p className="mt-4 text-slate-600">{t('reminders.empty')}</p>}

      {groups.map((group) => (
        <section key={group.key} className="mt-6 flex flex-col gap-2">
          <h2 className="font-semibold text-slate-700">{group.label}</h2>
          {group.items.map((reminder) => (
            <ReminderRow key={reminder.id} reminder={reminder} />
          ))}
        </section>
      ))}
    </>
  )
}

function ReminderRow({ reminder }: { reminder: Reminder }) {
  const { t } = useTranslation()
  const userId = useUserId()
  const formatSchedule = useFormatSchedule()
  const [error, setError] = useState<string | null>(null)

  const toggle = (enabled: boolean) => {
    setError(null)
    setReminderEnabled(userId, reminder.id, enabled).catch((reason: unknown) => setError(saveErrorKey(reason)))
  }

  return (
    <div className={`${cardClass} flex items-center gap-3`}>
      <Link to={`/reminders/${reminder.id}?returnTo=/reminders`} className="flex min-w-0 flex-1 items-center gap-3">
        <IconBadge spec={SERVICE_ICONS[reminder.serviceId]} />
        <span className="min-w-0">
          <span className="block truncate font-medium text-slate-800">{reminder.title}</span>
          <span className="block text-sm text-slate-500">{formatSchedule(reminder)}</span>
          {error && <span className={`block ${errorText}`}>{t(error)}</span>}
        </span>
      </Link>
      <input
        type="checkbox"
        role="switch"
        aria-label={t('reminders.toggleLabel', { title: reminder.title })}
        checked={reminder.enabled}
        onChange={(event) => toggle(event.target.checked)}
        className="h-6 w-6 shrink-0 accent-rose-500"
      />
    </div>
  )
}
