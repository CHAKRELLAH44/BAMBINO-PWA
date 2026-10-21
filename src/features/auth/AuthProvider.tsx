import { onAuthStateChanged } from 'firebase/auth'
import { useEffect, useState, type ReactNode } from 'react'
import { auth } from '../../services/firebase/config'
import { AuthContext, type AuthState } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  // Firebase prévient à chaque connexion / déconnexion, et au démarrage si une session existe déjà
  useEffect(() => onAuthStateChanged(auth, (user) => setState({ user, loading: false })), [])

  return <AuthContext value={state}>{children}</AuthContext>
}
