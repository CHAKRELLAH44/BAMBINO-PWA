// Données gardées sur l'appareil (bébé suivi, copies des séances en cours) : clés « bambino.… »

const ACCOUNT_DELETED_KEY = 'bambino.accountDeleted'

/** Efface tout ce que l'appareil garde pour cette utilisatrice (suppression du compte, §3.4) */
export function clearLocalUserData(userId: string) {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index) ?? '')
    for (const key of keys) {
      if (key.startsWith('bambino.') && key.includes(`.${userId}`)) localStorage.removeItem(key)
    }
  } catch {
    // Stockage indisponible (navigation privée) : rien à effacer
  }
}

/** Mémorise, le temps de revenir à la connexion, que le compte vient d'être supprimé */
export function markAccountDeleted(deleted: boolean) {
  try {
    if (deleted) sessionStorage.setItem(ACCOUNT_DELETED_KEY, '1')
    else sessionStorage.removeItem(ACCOUNT_DELETED_KEY)
  } catch {
    // Le message de confirmation ne s'affichera pas, la suppression reste faite
  }
}

export function wasAccountDeleted() {
  try {
    return sessionStorage.getItem(ACCOUNT_DELETED_KEY) === '1'
  } catch {
    return false
  }
}
