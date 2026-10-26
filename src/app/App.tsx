import { RouterProvider } from 'react-router/dom'
import { AuthProvider } from '../features/auth/AuthProvider'
import { router } from './router'
import { UpdateToast } from './UpdateToast'

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <UpdateToast />
    </AuthProvider>
  )
}
