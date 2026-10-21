import { createBrowserRouter, Navigate } from 'react-router'
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { SignUpPage } from '../features/auth/pages/SignUpPage'
import { RequireAuth } from '../features/auth/RequireAuth'
import { DashboardPage } from './DashboardPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignUpPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    // Toutes les routes ci-dessous exigent une utilisatrice connectée
    element: <RequireAuth />,
    children: [{ path: '/', element: <DashboardPage /> }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
