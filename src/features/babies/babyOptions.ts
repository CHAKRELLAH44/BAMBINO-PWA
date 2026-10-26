import {
  IconBabyCarriage,
  IconBalloon,
  IconButterfly,
  IconCat,
  IconCloud,
  IconDog,
  IconFeather,
  IconFish,
  IconFlower,
  IconHeart,
  IconMoodKid,
  IconMoon,
  IconPaw,
  IconRainbow,
  IconStar,
  IconSun,
  type Icon,
} from '@tabler/icons-react'
import type { BabyThemeColor } from '../../types/baby'

// Grille d'avatars (cahier §4.2 : 12 à 20 propositions, zéro fichier) : icônes au trait.
// La photo du bébé, si elle est ajoutée, passe devant l'avatar.
// La clé choisie est enregistrée dans le champ historique `avatarEmoji` (pas de migration des données).
export const BABY_AVATARS: { key: string; icon: Icon }[] = [
  { key: 'kid', icon: IconMoodKid },
  { key: 'carriage', icon: IconBabyCarriage },
  { key: 'heart', icon: IconHeart },
  { key: 'star', icon: IconStar },
  { key: 'moon', icon: IconMoon },
  { key: 'sun', icon: IconSun },
  { key: 'cloud', icon: IconCloud },
  { key: 'rainbow', icon: IconRainbow },
  { key: 'balloon', icon: IconBalloon },
  { key: 'flower', icon: IconFlower },
  { key: 'butterfly', icon: IconButterfly },
  { key: 'feather', icon: IconFeather },
  { key: 'cat', icon: IconCat },
  { key: 'dog', icon: IconDog },
  { key: 'fish', icon: IconFish },
  { key: 'paw', icon: IconPaw },
]

export const DEFAULT_BABY_AVATAR = 'kid'

/** Icône d'un avatar ; un ancien avatar emoji (avant le 22/10) prend l'icône par défaut */
export const avatarIcon = (key: string): Icon => BABY_AVATARS.find((avatar) => avatar.key === key)?.icon ?? IconMoodKid

// Classes écrites en entier pour que Tailwind les détecte
export const THEME_COLOR_CLASSES: Record<BabyThemeColor, string> = {
  rose: 'bg-rose-100 ring-rose-300 text-rose-600',
  sky: 'bg-sky-100 ring-sky-300 text-sky-700',
  amber: 'bg-amber-100 ring-amber-300 text-amber-700',
  emerald: 'bg-emerald-100 ring-emerald-300 text-emerald-700',
  violet: 'bg-violet-100 ring-violet-300 text-violet-700',
  slate: 'bg-slate-100 ring-slate-300 text-slate-600',
}

export const DEFAULT_THEME_CLASSES = 'bg-rose-50 ring-rose-200 text-rose-500'

// Pastilles du sélecteur de couleur
export const THEME_SWATCH_CLASSES: Record<BabyThemeColor, string> = {
  rose: 'bg-rose-300',
  sky: 'bg-sky-300',
  amber: 'bg-amber-300',
  emerald: 'bg-emerald-300',
  violet: 'bg-violet-300',
  slate: 'bg-slate-300',
}
