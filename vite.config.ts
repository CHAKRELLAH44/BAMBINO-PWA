import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Config PostCSS vide : empêche Vite de reprendre un postcss.config.js d'un dossier parent
  css: { postcss: { plugins: [] } },
})
