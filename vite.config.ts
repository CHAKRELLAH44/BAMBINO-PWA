import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA (§24) : installable, icônes, écran de lancement (Android), interface en cache.
    // Hors ligne en v1 : seule l'interface est servie depuis le cache ; les données passent toujours par Firestore.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bambino — suivi de bébé',
        short_name: 'Bambino',
        description: 'Suivi de bébé et de la maman : biberons, tétées, sommeil, couches, stock de lait, journal.',
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#fff1f2',
        theme_color: '#fff1f2',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Appui long sur l'icône de l'application installée (Android, ordinateur) : saisies les plus fréquentes.
        // Le manifeste n'a qu'une langue : les noms restent en français.
        shortcuts: [
          {
            name: 'Nouveau biberon',
            short_name: 'Biberon',
            url: '/bottle/new',
            icons: [{ src: 'shortcut-bottle.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Tétée',
            short_name: 'Tétée',
            url: '/breastfeeding',
            icons: [{ src: 'shortcut-feeding.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Sommeil',
            short_name: 'Sommeil',
            url: '/sleep',
            icons: [{ src: 'shortcut-sleep.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        // Adresses réservées de Firebase Hosting (ex. /__/auth) : jamais servies par le cache
        navigateFallbackDenylist: [/^\/__\//],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  // Config PostCSS vide : empêche Vite de reprendre un postcss.config.js d'un dossier parent
  css: { postcss: { plugins: [] } },
})
