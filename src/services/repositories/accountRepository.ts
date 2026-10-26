import { collection, deleteDoc, doc, getDocs, type DocumentReference } from 'firebase/firestore'
import { db } from '../firebase/config'
import { deleteBaby } from './babyRepository'
import { deleteInBatches } from './batchDelete'

/**
 * Suppression du compte (§3.4), étapes 2 et 3 : chaque bébé avec toutes ses données (événements, croissance,
 * stock, rendez-vous et rappels du bébé), puis l'espace de la maman (événements personnels, rendez-vous,
 * rappels et traitements, profil maman : informations, poids, contacts), puis le document users/{userId}. Les « paramètres » du §27 ne sont pas encore utilisés.
 */
export async function deleteAllUserData(userId: string) {
  const babies = await getDocs(collection(db, 'users', userId, 'babies'))
  for (const baby of babies.docs) await deleteBaby(userId, baby.id)

  const refs: DocumentReference[] = []
  for (const name of ['personalEvents', 'appointments', 'reminders', 'motherInfo', 'motherWeights', 'motherContacts']) {
    const snapshot = await getDocs(collection(db, 'users', userId, name))
    refs.push(...snapshot.docs.map((d) => d.ref))
  }
  await deleteInBatches(refs)
  await deleteDoc(doc(db, 'users', userId))
}
