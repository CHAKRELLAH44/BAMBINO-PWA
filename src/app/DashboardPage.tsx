import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { logOut, type SignUpResult } from '../features/auth/authService'
import { useAuth } from '../features/auth/useAuth'

// Écran provisoire : le vrai tableau de bord (§16) sera construit en phase 2.
// À garder dans le futur tableau de bord : le message affiché juste après l'inscription.
export function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const signUpResult = location.state as SignUpResult | null

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-rose-50 p-4">
      {signUpResult?.welcomeEmailSent && (
        <div
          role="status"
          className="flex w-full max-w-sm items-start gap-3 rounded-xl bg-white p-4 text-sm text-slate-700 shadow-sm"
        >
          <p className="flex-1">{t('dashboard.welcomeEmailSent')}</p>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => void navigate(location.pathname, { replace: true, state: null })}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}
      <h1 className="text-2xl font-semibold text-slate-800">{t('dashboard.hello')}</h1>
      <p className="text-slate-600">{t('dashboard.connectedAs', { email: user?.email })}</p>
      <button
        type="button"
        onClick={() => void logOut()}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
      >
        {t('auth.logout')}
      </button>
    </main>
  )
}
