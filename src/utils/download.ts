/** Fait télécharger un fichier créé dans la page (rapport PDF, fichier de calendrier…) */
export function downloadFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // Laisse au navigateur le temps de lire le fichier
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Nom de fichier lisible : « Pesée bébé » → « pesee-bebe » ; texte sans lettre latine → `fallback` */
export function fileSlug(text: string, fallback: string) {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return slug || fallback
}
