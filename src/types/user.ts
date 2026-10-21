import type { Timestamp } from 'firebase/firestore'

export type Language = 'fr' | 'ar'

/** Document users/{userId} (cahier §27) */
export interface UserProfile {
  displayName: string
  email: string
  preferredLanguage: Language
  timezone: string
  welcomeEmailSent: boolean
  onboardingCompleted: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type NewUserProfile = Pick<UserProfile, 'displayName' | 'email' | 'preferredLanguage' | 'timezone'>
