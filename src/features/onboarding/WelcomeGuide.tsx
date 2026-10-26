import { useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react'
import {
  IconFileTypePdf,
  IconHeartHandshake,
  IconMail,
  IconMailCheck,
  IconMoodKid,
  IconPlant2,
  IconUsersGroup,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { IconBadge } from '../../components/IconBadge'
import { ICONS, type Icon, type IconSpec, type Tone } from '../../components/icons'
import { Notice } from '../../components/Notice'
import { primaryButton, secondaryButton } from '../../components/styles'
import type { SignUpResult } from '../auth/authService'

interface GuideStep {
  id: 'notes' | 'growth' | 'share'
  icon: Icon
  tone: Tone
  points: [string, IconSpec][]
}

// Trois étapes : noter, suivre l'évolution, partager (textes dans guide.steps.*)
const STEPS: GuideStep[] = [
  {
    id: 'notes',
    icon: IconHeartHandshake,
    tone: 'rose',
    points: [
      ['baby', ICONS.bottle],
      ['mother', ICONS.hydration],
      ['plans', ICONS.appointment],
    ],
  },
  {
    id: 'growth',
    icon: IconPlant2,
    tone: 'emerald',
    points: [
      ['history', ICONS.journal],
      ['growth', ICONS.growth],
      ['timeline', ICONS.sleep],
    ],
  },
  {
    id: 'share',
    icon: IconUsersGroup,
    tone: 'violet',
    points: [
      ['report', ICONS.report],
      ['formats', { icon: IconFileTypePdf, tone: 'slate' }],
      ['where', { icon: IconMoodKid, tone: 'rose' }],
    ],
  },
]

const HERO_TONES: Record<Tone, string> = {
  rose: 'bg-rose-100 text-rose-600',
  amber: 'bg-amber-100 text-amber-700',
  violet: 'bg-violet-100 text-violet-700',
  sky: 'bg-sky-100 text-sky-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  slate: 'bg-slate-100 text-slate-600',
}

const SWIPE_DISTANCE = 50

/**
 * Guide de bienvenue en 3 étapes, à lire ou à passer. On avance par les boutons, les points, un glissement
 * du doigt ou les flèches du clavier (sens inversé en arabe). Juste après l'inscription, la première étape
 * dit aussi si l'e-mail de confirmation est parti.
 */
export function WelcomeGuide({
  name,
  email,
  signUp,
  dontShowInitially,
  onClose,
}: {
  name: string
  email: string
  signUp: SignUpResult | null
  dontShowInitially: boolean
  onClose: (dontShowAgain: boolean) => void
}) {
  const { t, i18n } = useTranslation()
  const [step, setStep] = useState(0)
  const [dontShow, setDontShow] = useState(dontShowInitially)
  const panelRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const rtl = i18n.dir() === 'rtl'
  const current = STEPS[step]
  const last = step === STEPS.length - 1

  // Le guide prend la main : focus dessus, la page derrière ne défile plus
  useEffect(() => {
    panelRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  const close = () => onClose(dontShow)
  const goTo = (target: number) => setStep(Math.min(STEPS.length - 1, Math.max(0, target)))
  const move = (forward: boolean) => goTo(step + (forward ? 1 : -1))

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close()
    if (event.key === 'ArrowRight') move(!rtl)
    if (event.key === 'ArrowLeft') move(rtl)
  }

  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current
    touchStartX.current = null
    if (start === null) return
    const distance = event.changedTouches[0].clientX - start
    if (Math.abs(distance) >= SWIPE_DISTANCE) move(rtl ? distance > 0 : distance < 0)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('guide.label')}
        aria-describedby="guide-text"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onTouchStart={(event) => (touchStartX.current = event.touches[0].clientX)}
        onTouchEnd={onTouchEnd}
        className="flex max-h-svh w-full flex-col gap-5 overflow-y-auto rounded-t-3xl bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-xl focus:outline-none sm:max-w-md sm:rounded-3xl sm:pb-6 motion-safe:animate-guide-panel"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-500">
            {t('guide.stepOf', { step: step + 1, total: STEPS.length })}
          </p>
          <button
            type="button"
            onClick={close}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            {t('guide.skip')}
          </button>
        </div>

        {step === 0 && signUp && (
          <Notice icon={signUp.welcomeEmailSent ? IconMailCheck : IconMail}>
            <p className="font-medium">
              {signUp.welcomeEmailSent ? t('auth.signUp.emailSent', { email }) : t('auth.signUp.emailNotSent')}
            </p>
            {signUp.welcomeEmailSent && <p className="mt-1">{t('auth.checkSpam')}</p>}
          </Notice>
        )}

        <div key={current.id} className="flex flex-col items-center gap-4 text-center motion-safe:animate-guide-step">
          <span className={`flex h-20 w-20 items-center justify-center rounded-full ${HERO_TONES[current.tone]}`}>
            <current.icon aria-hidden="true" size={40} stroke={1.5} />
          </span>
          <h2 className="text-2xl font-semibold text-slate-800">{t(`guide.steps.${current.id}.title`, { name })}</h2>
          <p id="guide-text" className="leading-relaxed text-slate-600">
            {t(`guide.steps.${current.id}.text`)}
          </p>
          <ul className="flex w-full flex-col gap-2 text-start">
            {current.points.map(([key, spec]) => (
              <li key={key} className="flex items-center gap-3 rounded-xl bg-rose-50 px-3 py-2">
                <IconBadge spec={spec} size="sm" />
                <span className="text-sm font-medium text-slate-700">{t(`guide.steps.${current.id}.points.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center gap-3">
          {STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={t('guide.goTo', { step: index + 1 })}
              aria-current={index === step ? 'step' : undefined}
              onClick={() => goTo(index)}
              className={`relative h-2.5 rounded-full transition-all before:absolute before:-inset-3 before:content-[''] ${
                index === step ? 'w-6 bg-rose-500' : 'w-2.5 bg-rose-200 hover:bg-rose-300'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button type="button" onClick={() => move(false)} className={`${secondaryButton} py-3`}>
              {t('guide.previous')}
            </button>
          )}
          <button type="button" onClick={last ? close : () => move(true)} className={`${primaryButton} flex-1 py-3 text-lg`}>
            {last ? t('guide.start') : t('guide.next')}
          </button>
        </div>

        <label className="flex items-center justify-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(event) => setDontShow(event.target.checked)}
            className="h-5 w-5 accent-rose-500"
          />
          {t('guide.dontShowAgain')}
        </label>
      </div>
    </div>
  )
}
