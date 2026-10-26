import { useSyncExternalStore } from 'react'

// Thème clair / sombre : préférence de l'appareil (pas une donnée du compte).
// La première application se fait dans index.html, avant l'affichage, pour éviter un flash blanc.

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

const STORAGE_KEY = 'bambino.theme'
// Couleur de la barre d'état du téléphone (fond de page clair / sombre)
const THEME_COLORS = { light: '#fff1f2', dark: '#1d1418' }
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return THEME_PREFERENCES.find((preference) => preference === value) ?? 'system'
  } catch {
    return 'system'
  }
}

function applyTheme() {
  const preference = readPreference()
  const dark = preference === 'dark' || (preference === 'system' && darkQuery().matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light)
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Stockage indisponible : le choix vaut pour cette visite seulement
  }
  applyTheme()
  listeners.forEach((listener) => listener())
}

/** À appeler une fois au démarrage : suit le thème du téléphone quand le choix est « Automatique » */
export function watchSystemTheme() {
  applyTheme()
  darkQuery().addEventListener('change', applyTheme)
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    readPreference,
  )
}
