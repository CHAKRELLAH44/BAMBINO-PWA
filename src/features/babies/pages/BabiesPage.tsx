import { useLayoutEffect, useRef, useState } from 'react'
import {
  IconBook,
  IconCake,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconPencil,
  IconPlus,
  IconRuler2,
  IconScale,
  IconUser,
  type Icon,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { IconBadge } from '../../../components/IconBadge'
import { ICONS } from '../../../components/icons'
import { InstallHint } from '../../../components/InstallHint'
import { SegmentedControl } from '../../../components/SegmentedControl'
import { PageHeader } from '../../../components/PageHeader'
import { cardClass, dangerButton, labelClass, primaryButton, secondaryButton } from '../../../components/styles'
import { changeAppLanguage } from '../../../i18n'
import { useLanguageOptions } from '../../../i18n/useLanguageOptions'
import { useInstallState } from '../../../services/pwa/installPrompt'
import { updatePreferredLanguage } from '../../../services/repositories/userRepository'
import type { Baby } from '../../../types/baby'
import type { Language } from '../../../types/user'
import type { GrowthType } from '../../../types/growth'
import { saveErrorKey } from '../../../utils/firebaseErrors'
import { formatDate, formatShortDate } from '../../../utils/formatDate'
import { setThemePreference, THEME_PREFERENCES, useThemePreference } from '../../../utils/theme'
import { logOut } from '../../auth/authService'
import { useAuth, useUserId } from '../../auth/useAuth'
import { formatMeasure, growthQuery } from '../../growth/growthSeries'
import { useGrowthRecords } from '../../growth/useGrowthRecords'
import { FeedbackCard } from '../../feedback/FeedbackCard'
import { MotherProfileCard } from '../../mother-profile/MotherProfileCard'
import { openWelcomeGuide } from '../../onboarding/guideState'
import { BabyAvatar } from '../BabyAvatar'
import { useActiveBaby } from '../useActiveBaby'
import { useFormatBabyAge } from '../useFormatBabyAge'

/**
 * Bébés (§4) : un bébé à la fois, on glisse pour passer à l'autre. C'est le seul endroit où l'on change
 * de bébé suivi. Croissance et rapport du bébé affiché sont à part, sous le carrousel.
 */
export function BabiesPage() {
  const { t } = useTranslation()
  const { babies, activeBaby } = useActiveBaby()
  // Bébés suivis d'abord, archivés ensuite
  const ordered = [...babies.filter((baby) => !baby.archivedAt), ...babies.filter((baby) => baby.archivedAt)]
  const [index, setIndex] = useState(() => Math.max(0, ordered.findIndex((baby) => baby.id === activeBaby?.id)))
  const current = ordered[Math.min(index, ordered.length - 1)]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('babies.title')} />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6 lg:max-w-none">
          {current ? (
            <>
              <BabyCarousel babies={ordered} index={Math.min(index, ordered.length - 1)} onIndexChange={setIndex} />
              <section className="flex flex-col gap-2">
                <h2 className="font-semibold text-slate-700">{t('babies.forBaby', { name: current.name })}</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Link to={`/growth?baby=${current.id}`} className={`${cardClass} flex flex-col items-center gap-1 hover:bg-rose-100`}>
                    <IconBadge spec={ICONS.growth} size="lg" />
                    <span className="text-sm font-medium text-slate-700">{t('babies.growth')}</span>
                  </Link>
                  <Link to={`/reports?baby=${current.id}`} className={`${cardClass} flex flex-col items-center gap-1 hover:bg-rose-100`}>
                    <IconBadge spec={ICONS.report} size="lg" />
                    <span className="text-sm font-medium text-slate-700">{t('babies.report')}</span>
                  </Link>
                </div>
              </section>
            </>
          ) : (
            <p className="text-slate-600">{t('babies.empty')}</p>
          )}
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-col gap-6 lg:max-w-none">
          <Link to="/babies/new" className={primaryButton}>
            + {t('babies.add')}
          </Link>
          <MotherProfileCard />
          <AppSettingsCard />
          <FeedbackCard />
          <AccountCard />
        </div>
      </div>
    </div>
  )
}

/** Carrousel : défilement horizontal aimanté (glisser sur téléphone), flèches et points pour se repérer */
function BabyCarousel({
  babies,
  index,
  onIndexChange,
}: {
  babies: Baby[]
  index: number
  onIndexChange: (index: number) => void
}) {
  const { t } = useTranslation()
  const trackRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const initialIndex = useRef(index)

  // À l'ouverture, on se place sur le bébé suivi, sans animation
  useLayoutEffect(() => {
    slideRefs.current[initialIndex.current]?.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' })
  }, [])

  const goTo = (target: number) =>
    slideRefs.current[target]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })

  // Position lue sur le défilement : fonctionne aussi de droite à gauche (arabe)
  const onScroll = () => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    const next = Math.round(Math.abs(track.scrollLeft) / track.clientWidth)
    if (next !== index && next < babies.length) onIndexChange(next)
  }

  return (
    <section aria-roledescription={t('babies.carousel')} aria-label={t('babies.title')} className="flex flex-col gap-3">
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {babies.map((baby, position) => (
            <div
              key={baby.id}
              ref={(element) => {
                slideRefs.current[position] = element
              }}
              role="group"
              aria-roledescription={t('babies.slide')}
              aria-label={t('babies.slideLabel', { position: position + 1, total: babies.length, name: baby.name })}
              className="w-full shrink-0 snap-center px-1"
            >
              <BabyCard baby={baby} />
            </div>
          ))}
        </div>
        {babies.length > 1 && (
          <>
            <ArrowButton side="start" label={t('babies.previous')} disabled={index === 0} onClick={() => goTo(index - 1)} />
            <ArrowButton
              side="end"
              label={t('babies.next')}
              disabled={index === babies.length - 1}
              onClick={() => goTo(index + 1)}
            />
          </>
        )}
      </div>
      {babies.length > 1 && (
        <div className="flex justify-center gap-2">
          {babies.map((baby, position) => (
            <button
              key={baby.id}
              type="button"
              aria-label={t('babies.show', { name: baby.name })}
              aria-current={position === index}
              onClick={() => goTo(position)}
              className={`h-2.5 rounded-full transition-all ${position === index ? 'w-6 bg-rose-500' : 'w-2.5 bg-rose-200'}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ArrowButton({
  side,
  label,
  disabled,
  onClick,
}: {
  side: 'start' | 'end'
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-24 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-xl text-slate-600 shadow ring-1 ring-slate-200 disabled:opacity-0 ${
        side === 'start' ? 'start-0' : 'end-0'
      }`}
    >
      {side === 'start' ? (
        <IconChevronLeft aria-hidden="true" size={20} className="rtl:rotate-180" />
      ) : (
        <IconChevronRight aria-hidden="true" size={20} className="rtl:rotate-180" />
      )}
    </button>
  )
}

/** Fiche du bébé : taille, poids (dernières mesures), naissance, sexe ; « Suivre » pour en faire le bébé suivi */
function BabyCard({ baby }: { baby: Baby }) {
  const { t, i18n } = useTranslation()
  const { activeBaby, setActiveBabyId } = useActiveBaby()
  const formatAge = useFormatBabyAge()
  const { records } = useGrowthRecords(baby.id)
  const isActive = activeBaby?.id === baby.id
  // Les mesures arrivent de la plus récente à la plus ancienne
  const latest = (type: GrowthType) => records.find((record) => record.type === type)

  const measureRow = (type: 'height' | 'weight', MeasureIcon: Icon) => {
    const record = latest(type)
    const name = t(`growth.types.${type}`)
    return (
      <div className="flex items-center gap-3 py-2">
        <dt className="flex flex-1 items-center gap-2 text-slate-600">
          <MeasureIcon aria-hidden="true" size={18} stroke={1.75} className="text-rose-500" />
          {name}
        </dt>
        <dd className="text-end">
          {record ? (
            <>
              <span className="font-semibold text-slate-800">{formatMeasure(record.value, record.unit, i18n.language)}</span>
              <span className="block text-xs text-slate-500">{formatShortDate(record.measuredAt.toDate(), i18n.language)}</span>
            </>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </dd>
        <Link
          to={`/growth/new${growthQuery(baby.id, { type, label: null })}`}
          aria-label={t('babies.addMeasure', { name })}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-lg text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100"
        >
          <IconPlus aria-hidden="true" size={18} />
        </Link>
      </div>
    )
  }

  return (
    <div className={`${cardClass} flex h-full flex-col items-center gap-3 text-center`}>
      <BabyAvatar baby={baby} size="xl" />
      <div>
        <p className="text-2xl font-semibold text-slate-800">{baby.name}</p>
        <p className="text-slate-500">{formatAge(baby.birthDate.toDate())}</p>
      </div>

      {baby.archivedAt ? (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{t('babies.archivedBadge')}</span>
      ) : isActive ? (
        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">{t('babies.active')}</span>
      ) : (
        <button
          type="button"
          onClick={() => setActiveBabyId(baby.id)}
          className="rounded-full border border-rose-200 px-4 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
        >
          {t('babies.selectFull')}
        </button>
      )}

      <dl className="w-full divide-y divide-slate-100 text-start text-sm">
        {measureRow('height', IconRuler2)}
        {measureRow('weight', IconScale)}
        <div className="flex items-center gap-3 py-2">
          <dt className="flex flex-1 items-center gap-2 text-slate-600">
            <IconCake aria-hidden="true" size={18} stroke={1.75} className="text-rose-500" />
            {t('babies.fields.birthDate')}
          </dt>
          <dd className="font-medium text-slate-800">{formatDate(baby.birthDate.toDate(), i18n.language)}</dd>
        </div>
        {baby.sex && (
          <div className="flex items-center gap-3 py-2">
            <dt className="flex flex-1 items-center gap-2 text-slate-600">
              <IconUser aria-hidden="true" size={18} stroke={1.75} className="text-rose-500" />
              {t('babies.fields.sex')}
            </dt>
            <dd className="font-medium text-slate-800">{t(`babies.sex.${baby.sex}`)}</dd>
          </div>
        )}
      </dl>

      <Link to={`/babies/${baby.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-600">
        <IconPencil aria-hidden="true" size={16} stroke={1.75} />
        {t('babies.editProfile')}
      </Link>
    </div>
  )
}

/**
 * Réglages : langue (§23, gardée dans le compte), apparence (clair / sombre, sur cet appareil),
 * guide de bienvenue et installation de l'application (§24)
 */
function AppSettingsCard() {
  const { t } = useTranslation()
  const userId = useUserId()
  const theme = useThemePreference()
  const install = useInstallState()
  const languages = useLanguageOptions()
  const [languageError, setLanguageError] = useState<string | null>(null)

  // L'écran change tout de suite ; si le compte refuse l'enregistrement, on revient à l'ancienne langue
  const changeLanguage = (language: Language) => {
    const previous = languages.current
    if (language === previous) return
    setLanguageError(null)
    changeAppLanguage(language)
    updatePreferredLanguage(userId, language).catch((error: unknown) => {
      changeAppLanguage(previous)
      setLanguageError(saveErrorKey(error))
    })
  }

  return (
    <section className={`${cardClass} flex flex-col gap-4`}>
      <h2 className="font-semibold text-slate-700">{t('settings.title')}</h2>
      <div className="flex flex-col gap-2">
        <span className={labelClass}>{t('settings.language')}</span>
        <SegmentedControl
          label={t('settings.language')}
          options={languages.options}
          value={languages.current}
          onChange={changeLanguage}
        />
        {languageError && (
          <p role="alert" className="text-sm text-red-600">
            {t(languageError)}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <span className={labelClass}>{t('settings.theme')}</span>
        <SegmentedControl
          label={t('settings.theme')}
          options={THEME_PREFERENCES.map((preference) => ({ value: preference, label: t(`settings.themes.${preference}`) }))}
          value={theme}
          onChange={setThemePreference}
        />
      </div>
      <button type="button" onClick={openWelcomeGuide} className={`${secondaryButton} flex items-center justify-center gap-2`}>
        <IconBook aria-hidden="true" size={18} stroke={1.75} />
        {t('settings.guide')}
      </button>
      {install === 'installed' && (
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <IconCheck aria-hidden="true" size={18} /> {t('pwa.installed')}
        </p>
      )}
      <InstallHint />
    </section>
  )
}

function AccountCard() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <section className={`${cardClass} flex flex-col gap-3`}>
      <h2 className="font-semibold text-slate-700">{t('babies.account')}</h2>
      <p className="break-all text-sm text-slate-600">{t('babies.connectedAs', { email: user?.email })}</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => void logOut()} className={secondaryButton}>
          {t('auth.logout')}
        </button>
        <Link to="/account/delete" className={`${dangerButton} ring-1 ring-red-200`}>
          {t('account.delete')}
        </Link>
      </div>
    </section>
  )
}
