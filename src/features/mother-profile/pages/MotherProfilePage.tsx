import { zodResolver } from '@hookform/resolvers/zod'
import { lazy, Suspense, useState } from 'react'
import { IconAddressBook, IconLock, IconPencil, IconPhone, IconScale, IconUser } from '@tabler/icons-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { FormField } from '../../../components/FormField'
import { IconBadge } from '../../../components/IconBadge'
import { Notice } from '../../../components/Notice'
import { PageHeader } from '../../../components/PageHeader'
import { cardClass, errorText, inputClass, labelClass, primaryButton, secondaryButton } from '../../../components/styles'
import { saveMotherProfile } from '../../../services/repositories/motherRepository'
import type { MotherInfo } from '../../../types/mother'
import type { UserProfile } from '../../../types/user'
import { saveErrorKey } from '../../../utils/firebaseErrors'
import { formatDate, formatShortDate } from '../../../utils/formatDate'
import { parseOptionalInt } from '../../../utils/formFields'
import { useUserId } from '../../auth/useAuth'
import { useUserProfile } from '../../auth/useUserProfile'
import { formatMeasure } from '../../growth/growthSeries'
import { motherInfoSchema, type MotherInfoValues } from '../schemas'
import { useMotherContacts, useMotherInfo, useMotherWeights } from '../useMotherProfile'

const GrowthChart = lazy(() => import('../../growth/GrowthChart').then((module) => ({ default: module.GrowthChart })))

/**
 * Profil maman (Bébés → Profil maman) : son poids dans le temps, ses informations (prénom, taille, pense-bête)
 * et ses contacts utiles. Visible par elle seule ; aucun calcul ni interprétation.
 */
export function MotherProfilePage() {
  const { t } = useTranslation()
  const { profile, loading, loadError } = useUserProfile()
  const { info, loading: infoLoading } = useMotherInfo()

  if (loading || infoLoading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (loadError || !profile) return <p className={errorText}>{t('common.loadError')}</p>

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('motherProfile.title')} backTo="/babies" />
      <Notice icon={IconLock}>{t('motherProfile.private')}</Notice>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <WeightSection />
        <div className="flex flex-col gap-6">
          <InfoForm profile={profile} info={info} />
          <ContactsSection />
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: Parameters<typeof IconBadge>[0]['spec']; title: string }) {
  return (
    <h2 className="flex items-center gap-3 font-semibold text-slate-700">
      <IconBadge spec={icon} size="sm" />
      {title}
    </h2>
  )
}

function WeightSection() {
  const { t, i18n } = useTranslation()
  const { weights, loading } = useMotherWeights()
  const latest = weights[0]
  const points = weights
    .map((weight) => ({ id: weight.id, time: weight.measuredAt.toMillis(), value: weight.weightKg, unit: 'kg' }))
    .sort((a, b) => a.time - b.time)

  return (
    <section className={`${cardClass} flex flex-col gap-4`}>
      <SectionTitle icon={{ icon: IconScale, tone: 'emerald' }} title={t('motherProfile.weight.title')} />
      {loading && <p className="text-slate-500">{t('common.loading')}</p>}
      {!loading && !latest && <p className="text-slate-600">{t('motherProfile.weight.empty')}</p>}
      {latest && (
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-3xl font-semibold text-slate-800">{formatMeasure(latest.weightKg, 'kg', i18n.language)}</span>
          <span className="text-sm text-slate-500">{formatDate(latest.measuredAt.toDate(), i18n.language)}</span>
        </p>
      )}
      {points.length >= 2 && (
        <Suspense fallback={<p className="text-slate-500">{t('common.loading')}</p>}>
          <GrowthChart points={points} unit="kg" name={t('motherProfile.weight.title')} />
        </Suspense>
      )}
      <Link to="/account/weight/new" className={primaryButton}>
        {t('motherProfile.weight.add')}
      </Link>
      {weights.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-slate-600">{t('motherProfile.weight.history')}</h3>
          <ul className="divide-y divide-slate-100">
            {weights.slice(0, 10).map((weight) => (
              <li key={weight.id}>
                <Link to={`/account/weight/${weight.id}`} className="flex items-center justify-between gap-3 py-2 hover:text-rose-600">
                  <span className="text-slate-600">{formatShortDate(weight.measuredAt.toDate(), i18n.language)}</span>
                  <span className="font-medium text-slate-800">{formatMeasure(weight.weightKg, 'kg', i18n.language)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-slate-500">{t('motherProfile.weight.note')}</p>
    </section>
  )
}

function InfoForm({ profile, info }: { profile: UserProfile; info: MotherInfo | null }) {
  const { t } = useTranslation()
  const userId = useUserId()
  const [status, setStatus] = useState<{ key: string; ok: boolean } | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MotherInfoValues>({
    resolver: zodResolver(motherInfoSchema),
    defaultValues: {
      displayName: profile.displayName,
      heightCm: info?.heightCm ? String(info.heightCm) : '',
      notes: info?.notes ?? '',
    },
  })
  const fieldError = (message?: string) => (message ? t(message) : undefined)

  const onSubmit = async (values: MotherInfoValues) => {
    setStatus(null)
    try {
      await saveMotherProfile(
        userId,
        { displayName: values.displayName, heightCm: parseOptionalInt(values.heightCm), notes: values.notes },
        info !== null,
      )
      setStatus({ key: 'motherProfile.saved', ok: true })
    } catch (error) {
      setStatus({ key: saveErrorKey(error), ok: false })
    }
  }

  return (
    <section className={`${cardClass} flex flex-col gap-4`}>
      <SectionTitle icon={{ icon: IconUser, tone: 'rose' }} title={t('motherProfile.info.title')} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <FormField
            id="displayName"
            label={t('auth.fields.displayName')}
            autoComplete="given-name"
            error={fieldError(errors.displayName?.message)}
            {...register('displayName')}
          />
          <p className="text-sm text-slate-500">{t('motherProfile.info.nameHint')}</p>
        </div>
        <FormField
          id="heightCm"
          inputMode="numeric"
          label={`${t('motherProfile.info.height')} (${t('common.optional')})`}
          error={fieldError(errors.heightCm?.message)}
          {...register('heightCm')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className={labelClass}>
            {t('motherProfile.info.notes')} <span className="font-normal text-slate-400">({t('common.optional')})</span>
          </label>
          <textarea
            id="notes"
            rows={4}
            placeholder={t('motherProfile.info.notesHint')}
            className={inputClass}
            {...register('notes')}
          />
          {errors.notes?.message && <p className={errorText}>{t(errors.notes.message)}</p>}
        </div>
        {status && (
          <p role="status" className={status.ok ? 'text-sm font-medium text-emerald-700' : errorText}>
            {t(status.key)}
          </p>
        )}
        <button type="submit" disabled={isSubmitting} className={primaryButton}>
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </form>
    </section>
  )
}

function ContactsSection() {
  const { t } = useTranslation()
  const { contacts, loading } = useMotherContacts()

  return (
    <section className={`${cardClass} flex flex-col gap-3`}>
      <SectionTitle icon={{ icon: IconAddressBook, tone: 'sky' }} title={t('motherProfile.contacts.title')} />
      {loading && <p className="text-slate-500">{t('common.loading')}</p>}
      {!loading && contacts.length === 0 && <p className="text-slate-600">{t('motherProfile.contacts.empty')}</p>}
      <ul className="flex flex-col gap-2">
        {contacts.map((contact) => (
          <li key={contact.id} className="flex items-center gap-3 rounded-xl bg-rose-50 px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-slate-800">{contact.name}</span>
              <span className="block text-sm text-slate-600">
                {t(`motherProfile.contacts.roles.${contact.role}`)}
                {contact.phone && (
                  <>
                    {' · '}
                    <span dir="ltr">{contact.phone}</span>
                  </>
                )}
              </span>
            </span>
            {contact.phone && (
              <a
                href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                aria-label={t('motherProfile.contacts.call', { name: contact.name })}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              >
                <IconPhone aria-hidden="true" size={20} stroke={1.75} />
              </a>
            )}
            <Link
              to={`/account/contacts/${contact.id}`}
              aria-label={t('motherProfile.contacts.edit', { name: contact.name })}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              <IconPencil aria-hidden="true" size={18} stroke={1.75} />
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/account/contacts/new" className={secondaryButton}>
        {t('motherProfile.contacts.add')}
      </Link>
    </section>
  )
}
