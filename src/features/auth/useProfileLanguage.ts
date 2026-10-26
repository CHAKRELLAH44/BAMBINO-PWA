import { useEffect } from 'react'
import { changeAppLanguage } from '../../i18n'
import type { UserProfile } from '../../types/user'

/** La langue du compte s'applique sur chaque appareil où la maman se connecte (§23) */
export function useProfileLanguage(profile: UserProfile | null) {
  const language = profile?.preferredLanguage
  useEffect(() => {
    if (language) changeAppLanguage(language)
  }, [language])
}
