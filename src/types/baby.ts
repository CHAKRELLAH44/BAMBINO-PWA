import type { Timestamp } from 'firebase/firestore'

export type BabySex = 'female' | 'male'

export const BABY_THEME_COLORS = ['rose', 'sky', 'amber', 'emerald', 'violet', 'slate'] as const
export type BabyThemeColor = (typeof BABY_THEME_COLORS)[number]

/** Document users/{userId}/babies/{babyId} (cahier §4, §27) */
export interface Baby {
  id: string
  name: string
  birthDate: Timestamp
  sex: BabySex | null
  avatarEmoji: string
  themeColor: BabyThemeColor | null
  archivedAt: Timestamp | null
  /** Photo du bébé (JPEG réduit, « data:image/jpeg;base64,… ») ; absente sur les profils plus anciens */
  photo?: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface BabyInput {
  name: string
  birthDate: Date
  sex: BabySex | null
  avatarEmoji: string
  themeColor: BabyThemeColor | null
  photo: string | null
}
