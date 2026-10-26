// Partage d'un rapport (§18) : texte copié, ou menu « Partager » du téléphone (Web Share API).
// Le téléchargement de fichier est dans utils/download.ts.

export type ShareResult = 'shared' | 'cancelled' | 'unsupported'

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

/** Ouvre le menu de partage avec le PDF, si l'appareil sait partager des fichiers */
export async function shareFile(blob: Blob, fileName: string, title: string): Promise<ShareResult> {
  const file = new File([blob], fileName, { type: blob.type })
  if (!navigator.canShare?.({ files: [file] })) return 'unsupported'
  try {
    await navigator.share({ files: [file], title })
    return 'shared'
  } catch (error) {
    // Partage refusé (ex. geste trop ancien) : la page propose alors le téléchargement
    return isAbort(error) ? 'cancelled' : 'unsupported'
  }
}

export async function shareText(text: string, title: string): Promise<ShareResult> {
  if (typeof navigator.share !== 'function') return 'unsupported'
  try {
    await navigator.share({ title, text })
    return 'shared'
  } catch (error) {
    return isAbort(error) ? 'cancelled' : 'unsupported'
  }
}

export async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
}
