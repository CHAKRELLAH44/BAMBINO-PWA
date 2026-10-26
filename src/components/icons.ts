import {
  IconAlarm,
  IconBabyBottle,
  IconBell,
  IconBook2,
  IconBottle,
  IconCalendarEvent,
  IconChartLine,
  IconDiaper,
  IconDroplet,
  IconFileText,
  IconFridge,
  IconLeaf,
  IconMoodHeart,
  IconMoon,
  IconPill,
  IconToolsKitchen2,
  type Icon,
} from '@tabler/icons-react'

// Icônes de l'application : Tabler Icons (licence MIT), un seul style au trait, lisible en clair et en sombre.
// Une catégorie = une icône + une teinte, partout (accueil, listes, journal, rapports).

export type { Icon }

export type Tone = 'rose' | 'amber' | 'violet' | 'sky' | 'emerald' | 'slate'

export interface IconSpec {
  icon: Icon
  tone: Tone
}

export const ICONS = {
  bottle: { icon: IconBabyBottle, tone: 'amber' },
  breastfeeding: { icon: IconMoodHeart, tone: 'rose' },
  sleep: { icon: IconMoon, tone: 'violet' },
  diaper: { icon: IconDiaper, tone: 'sky' },
  milkPumping: { icon: IconBottle, tone: 'emerald' },
  stock: { icon: IconFridge, tone: 'sky' },
  hydration: { icon: IconDroplet, tone: 'sky' },
  meal: { icon: IconToolsKitchen2, tone: 'amber' },
  medication: { icon: IconPill, tone: 'rose' },
  supplement: { icon: IconLeaf, tone: 'emerald' },
  appointment: { icon: IconCalendarEvent, tone: 'violet' },
  reminder: { icon: IconAlarm, tone: 'slate' },
  custom: { icon: IconBell, tone: 'slate' },
  journal: { icon: IconBook2, tone: 'rose' },
  growth: { icon: IconChartLine, tone: 'emerald' },
  report: { icon: IconFileText, tone: 'violet' },
} satisfies Record<string, IconSpec>
