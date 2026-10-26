import { useContext } from 'react'
import { AuthContext } from './AuthContext'

export const useAuth = () => useContext(AuthContext)

/** Identifiant de l'utilisatrice connectée (uniquement dans les pages protégées par RequireAuth) */
export function useUserId() {
  const { user } = useAuth()
  if (!user) throw new Error('useUserId doit être utilisé dans une page protégée')
  return user.uid
}
