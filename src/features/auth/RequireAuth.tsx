import { useTranslation } from 'react-i18next'
import { Navigate, Outlet } from 'react-router'
import { useAuth } from './useAuth'

/** Laisse passer uniquement une utilisatrice connectée, sinon renvoie vers /login */
export function RequireAuth() {
  const { user, loading } = useAuth()
  const { t } = useTranslation()

  if (loading) return <p className="p-6 text-center text-slate-500">{t('common.loading')}</p>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
