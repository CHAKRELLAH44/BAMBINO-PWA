import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router'
import { errorText } from '../components/styles'
import { useUserId } from '../features/auth/useAuth'
import { useProfileLanguage } from '../features/auth/useProfileLanguage'
import { useUserProfile } from '../features/auth/useUserProfile'
import { ActiveBabyProvider } from '../features/babies/ActiveBabyProvider'
import { ActiveBabyBadge } from '../features/babies/ActiveBabyBadge'
import { useActiveBaby } from '../features/babies/useActiveBaby'
import { WelcomeGuideGate } from '../features/onboarding/WelcomeGuideGate'
import { AppStatusBanners } from './AppStatusBanners'
import { IconBook2, IconFlower, IconHome, IconListDetails, IconMoodKid } from '@tabler/icons-react'

// `sections` : pages rangées sous l'onglet (il reste en surbrillance quand on y est)
const NAV_ITEMS = [
  { to: '/', label: 'nav.home', icon: IconHome, sections: ['/stock', '/bottle', '/breastfeeding', '/sleep', '/diaper', '/pumping'] },
  { to: '/journal', label: 'nav.journal', icon: IconBook2, sections: [] },
  { to: '/history', label: 'nav.history', icon: IconListDetails, sections: [] },
  { to: '/mother', label: 'nav.mother', icon: IconFlower, sections: ['/appointments', '/reminders'] },
  { to: '/babies', label: 'nav.babies', icon: IconMoodKid, sections: ['/growth', '/reports', '/account'] },
]

// Pages de saisie pour le bébé suivi : on rappelle de quel bébé il s'agit
const BABY_PAGES = ['/journal', '/bottle', '/breastfeeding', '/sleep', '/diaper', '/pumping', '/stock']

/**
 * Mise en page des écrans connectés, sur toute la largeur de l'écran :
 * téléphone = barre de navigation en bas ; tablette et ordinateur = menu sur le côté.
 */
export function AppLayout() {
  const userId = useUserId()
  const { pathname } = useLocation()
  const { profile } = useUserProfile()
  useProfileLanguage(profile)
  const showBaby = BABY_PAGES.some((page) => pathname.startsWith(page))

  return (
    <ActiveBabyProvider key={userId}>
      <div className="min-h-svh bg-rose-50 md:flex">
        <SideNav />
        <div className="min-w-0 flex-1">
          {showBaby && (
            <header className="sticky top-0 z-10 border-b border-rose-100 bg-surface/95 px-4 py-2 backdrop-blur md:px-8">
              <div className="mx-auto w-full max-w-6xl">
                <ActiveBabyBadge />
              </div>
            </header>
          )}
          <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8">
            <AppStatusBanners />
            <LayoutContent />
          </main>
        </div>
        <BottomNav />
      </div>
      <WelcomeGuideGate key={userId} />
    </ActiveBabyProvider>
  )
}

function LayoutContent() {
  const { t } = useTranslation()
  const { loading, loadError } = useActiveBaby()

  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (loadError) return <p className={errorText}>{t('common.loadError')}</p>
  // Pages chargées à la demande (router.tsx) : le menu reste affiché pendant le chargement
  return (
    <Suspense fallback={<p className="text-slate-500">{t('common.loading')}</p>}>
      <Outlet />
    </Suspense>
  )
}

function useIsInSection() {
  const { pathname } = useLocation()
  return (sections: string[]) => sections.some((section) => pathname.startsWith(section))
}

/** Téléphone : barre en bas de l'écran */
function BottomNav() {
  const { t } = useTranslation()
  const inSection = useIsInSection()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-rose-100 bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="flex">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-xs ${
                  isActive || inSection(item.sections) ? 'font-semibold text-rose-600' : 'text-slate-500'
                }`
              }
            >
              <item.icon aria-hidden="true" size={24} stroke={1.75} />
              {t(item.label)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Tablette et ordinateur : menu fixe sur le côté */
function SideNav() {
  const { t } = useTranslation()
  const inSection = useIsInSection()

  return (
    <nav className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col gap-1 border-e border-rose-100 bg-surface p-4 md:flex lg:w-64">
      <p className="mb-4 px-3 text-xl font-semibold text-rose-600">{t('common.appName')}</p>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 ${
              isActive || inSection(item.sections)
                ? 'bg-rose-100 font-semibold text-rose-700'
                : 'text-slate-600 hover:bg-rose-50'
            }`
          }
        >
          <item.icon aria-hidden="true" size={22} stroke={1.75} />
          {t(item.label)}
        </NavLink>
      ))}
    </nav>
  )
}
