import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { ICONS, type Icon, type IconSpec, type Tone } from '../../components/icons'
import type { Baby } from '../../types/baby'
import { avatarIcon } from '../babies/babyOptions'
import type { ReportIconKey, ReportVisuals } from './reportPdf'

// Images du PDF préparées dans le navigateur : jsPDF ne sait pas dessiner les icônes SVG,
// on les transforme en PNG (mêmes icônes et mêmes teintes que l'application).

const TONE_COLORS: Record<Tone, { background: string; foreground: string }> = {
  rose: { background: '#ffe4e6', foreground: '#e11d48' },
  amber: { background: '#fef3c7', foreground: '#b45309' },
  violet: { background: '#ede9fe', foreground: '#6d28d9' },
  sky: { background: '#e0f2fe', foreground: '#0369a1' },
  emerald: { background: '#d1fae5', foreground: '#047857' },
  slate: { background: '#f1f5f9', foreground: '#475569' },
}
const DEFAULT_AVATAR_COLORS = { background: '#fff1f2', foreground: '#f43f5e' }

const ICON_SPECS: Record<ReportIconKey, IconSpec> = {
  bottle: ICONS.bottle,
  breastfeeding: ICONS.breastfeeding,
  sleep: ICONS.sleep,
  diaper: ICONS.diaper,
  milkPumping: ICONS.milkPumping,
  appointment: ICONS.appointment,
  growth: ICONS.growth,
}

/** Le SVG de l'icône, tel que l'application l'affiche */
function iconSvg(icon: Icon, color: string) {
  const container = document.createElement('div')
  const root = createRoot(container)
  flushSync(() => root.render(createElement(icon, { size: 96, stroke: 1.6, color })))
  const svg = container.innerHTML
  root.unmount()
  return svg
}

/** Icône centrée dans une pastille ronde, en PNG */
async function iconPng(icon: Icon, colors: { background: string; foreground: string }, size: number) {
  const url = URL.createObjectURL(new Blob([iconSvg(icon, colors.foreground)], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas indisponible')
    context.fillStyle = colors.background
    context.beginPath()
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    context.fill()
    const padding = size * 0.2
    context.drawImage(image, padding, padding, size - 2 * padding, size - 2 * padding)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Photo du bébé (ou son avatar) et icônes des activités pour le PDF */
export async function buildReportVisuals(baby: Baby): Promise<ReportVisuals> {
  const entries = await Promise.all(
    (Object.entries(ICON_SPECS) as [ReportIconKey, IconSpec][]).map(
      async ([key, spec]) => [key, await iconPng(spec.icon, TONE_COLORS[spec.tone], 96)] as const,
    ),
  )
  const babyImage = baby.photo
    ? { data: baby.photo, format: 'JPEG' as const }
    : {
        data: await iconPng(
          avatarIcon(baby.avatarEmoji),
          baby.themeColor ? TONE_COLORS[baby.themeColor] : DEFAULT_AVATAR_COLORS,
          256,
        ),
        format: 'PNG' as const,
      }
  return { babyImage, icons: Object.fromEntries(entries) }
}
