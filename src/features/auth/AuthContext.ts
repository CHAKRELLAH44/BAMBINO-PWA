import type { User } from 'firebase/auth'
import { createContext } from 'react'

export interface AuthState {
  user: User | null
  loading: boolean
}

export const AuthContext = createContext<AuthState>({ user: null, loading: true })
