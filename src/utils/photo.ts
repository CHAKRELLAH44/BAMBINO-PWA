// Photo du bébé (§4, décision d'équipe du 22/10). Firebase Storage est interdit (budget 0 DH, §33) :
// la photo est recadrée en carré, réduite et compressée en JPEG sur le téléphone, puis gardée dans le
// profil du bébé (quelques dizaines de Ko, bien sous la limite d'un document Firestore).

const SIZE = 320
/** Taille maximale de la photo encodée (caractères) ; la même limite est vérifiée par firestore.rules */
export const MAX_PHOTO_LENGTH = 150_000

export class PhotoError extends Error {}

export async function photoToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new PhotoError('not-an-image')
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new PhotoError('no-canvas')
  // Carré centré : le visage est en général au milieu
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
  bitmap.close()

  let quality = 0.82
  let data = canvas.toDataURL('image/jpeg', quality)
  while (data.length > MAX_PHOTO_LENGTH && quality > 0.4) {
    quality -= 0.1
    data = canvas.toDataURL('image/jpeg', quality)
  }
  if (data.length > MAX_PHOTO_LENGTH) throw new PhotoError('too-large')
  return data
}
