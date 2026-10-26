import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import i18n from './i18n'
import { listenForInstallPrompt } from './services/pwa/installPrompt'
import { startServiceWorker } from './services/pwa/serviceWorker'
import { watchSystemTheme } from './utils/theme'

watchSystemTheme()
listenForInstallPrompt()
startServiceWorker()

const root = createRoot(document.getElementById('root')!)

// Import dynamique : si l'app ne peut pas démarrer (ex. .env.local vide), on affiche l'erreur au lieu d'une page blanche
import('./app/App')
  .then(({ App }) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch((error: unknown) => {
    console.error(error)
    root.render(
      <main className="flex min-h-svh flex-col items-center justify-center gap-2 p-4 text-center">
        <p className="font-semibold text-slate-800">{i18n.t('common.startupError')}</p>
        {import.meta.env.DEV && error instanceof Error && (
          <p className="text-sm text-red-600">{error.message}</p>
        )}
      </main>,
    )
  })
