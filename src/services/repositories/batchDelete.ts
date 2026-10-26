import { writeBatch, type DocumentReference } from 'firebase/firestore'
import { db } from '../firebase/config'

/** Supprime des documents par lots (une écriture groupée Firestore accepte au plus 500 opérations) */
export async function deleteInBatches(refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db)
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
}
