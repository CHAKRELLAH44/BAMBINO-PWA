// Tests des règles Firestore sur l'émulateur : npm run test:rules (Java 21+ requis)
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment

const aliceDb = () => env.authenticatedContext('alice').firestore()
const bobDb = () => env.authenticatedContext('bob').firestore()
const anonymousDb = () => env.unauthenticatedContext().firestore()

const userProfile = (extra = {}) => ({
  displayName: 'Alice',
  email: 'alice@exemple.test',
  preferredLanguage: 'fr',
  timezone: 'Africa/Casablanca',
  welcomeEmailSent: false,
  onboardingCompleted: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const baby = (extra = {}) => ({
  name: 'Lina',
  birthDate: Timestamp.fromDate(new Date(2026, 8, 1)),
  sex: null,
  avatarEmoji: '🐣',
  themeColor: null,
  archivedAt: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const bottle = (details = {}, extra = {}) => ({
  type: 'bottle',
  occurredAt: Timestamp.fromDate(new Date(2026, 9, 21, 10, 0)),
  details: { consumedMl: 90, milkType: 'formula', ...details },
  comment: '',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const babyPath = 'users/alice/babies/b1'
const eventPath = `${babyPath}/events/e1`

/** Crée le bébé b1 d'Alice sans passer par les règles */
async function seedBaby() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), babyPath), baby())
  })
}

async function seedBottle() {
  await seedBaby()
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), eventPath), bottle())
  })
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-bambino-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
})

describe('users/{userId}', () => {
  it('la propriétaire crée et lit son profil', async () => {
    await assertSucceeds(setDoc(doc(aliceDb(), 'users/alice'), userProfile()))
    await assertSucceeds(getDoc(doc(aliceDb(), 'users/alice')))
  })

  it('un autre compte ne lit pas le profil', async () => {
    await assertSucceeds(setDoc(doc(aliceDb(), 'users/alice'), userProfile()))
    await assertFails(getDoc(doc(bobDb(), 'users/alice')))
    await assertFails(getDoc(doc(anonymousDb(), 'users/alice')))
  })

  it('refuse welcomeEmailSent = true à la création', async () => {
    await assertFails(setDoc(doc(aliceDb(), 'users/alice'), userProfile({ welcomeEmailSent: true })))
  })

  it('langue (§23) et guide de bienvenue : la propriétaire seulement, valeurs connues seulement', async () => {
    await assertSucceeds(setDoc(doc(aliceDb(), 'users/alice'), userProfile()))
    const ref = doc(aliceDb(), 'users/alice')
    await assertSucceeds(updateDoc(ref, { preferredLanguage: 'ar', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(ref, { onboardingCompleted: true, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { preferredLanguage: 'en', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { onboardingCompleted: 'oui', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(bobDb(), 'users/alice'), { preferredLanguage: 'fr', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(bobDb(), 'users/alice'), { onboardingCompleted: false, updatedAt: serverTimestamp() }))
  })

  it('Mon profil : la propriétaire change son prénom (1 à 50 caractères), pas un autre compte', async () => {
    await assertSucceeds(setDoc(doc(aliceDb(), 'users/alice'), userProfile()))
    const ref = doc(aliceDb(), 'users/alice')
    await assertSucceeds(updateDoc(ref, { displayName: 'Alicia', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { displayName: '', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { displayName: 'a'.repeat(51), updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(bobDb(), 'users/alice'), { displayName: 'Bob', updatedAt: serverTimestamp() }))
  })
})

describe('babies/{babyId} (§4)', () => {
  it('la propriétaire crée un bébé valide', async () => {
    await assertSucceeds(setDoc(doc(aliceDb(), babyPath), baby()))
  })

  it('accepte sexe et couleur facultatifs', async () => {
    await assertSucceeds(setDoc(doc(aliceDb(), babyPath), baby({ sex: 'female', themeColor: 'sky' })))
  })

  it('un autre compte ne lit ni ne crée de bébé chez Alice', async () => {
    await seedBaby()
    await assertFails(getDoc(doc(bobDb(), babyPath)))
    await assertFails(setDoc(doc(bobDb(), 'users/alice/babies/b2'), baby()))
  })

  it('refuse un prénom vide, un emoji vide, un champ inconnu', async () => {
    await assertFails(setDoc(doc(aliceDb(), babyPath), baby({ name: '' })))
    await assertFails(setDoc(doc(aliceDb(), babyPath), baby({ avatarEmoji: '' })))
    await assertFails(setDoc(doc(aliceDb(), babyPath), baby({ photoUrl: 'x' })))
  })

  it('refuse une date de naissance dans le futur', async () => {
    const future = Timestamp.fromMillis(Date.now() + 7 * 24 * 3600 * 1000)
    await assertFails(setDoc(doc(aliceDb(), babyPath), baby({ birthDate: future })))
  })

  it('refuse un sexe ou une couleur hors liste', async () => {
    await assertFails(setDoc(doc(aliceDb(), babyPath), baby({ sex: 'other' })))
    await assertFails(setDoc(doc(aliceDb(), babyPath), baby({ themeColor: 'black' })))
  })

  it('modifie, archive puis supprime son bébé', async () => {
    await seedBaby()
    const ref = doc(aliceDb(), babyPath)
    await assertSucceeds(updateDoc(ref, { name: 'Lina Rose', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(ref, { archivedAt: serverTimestamp(), updatedAt: serverTimestamp() }))
    await assertSucceeds(deleteDoc(ref))
  })

  it('refuse de modifier createdAt', async () => {
    await seedBaby()
    await assertFails(
      updateDoc(doc(aliceDb(), babyPath), { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    )
  })

  it('photo facultative : JPEG réduit seulement, ni autre format ni photo trop lourde', async () => {
    const jpeg = `data:image/jpeg;base64,${'A'.repeat(2000)}`
    await assertSucceeds(setDoc(doc(aliceDb(), babyPath), baby({ photo: jpeg })))
    await assertSucceeds(setDoc(doc(aliceDb(), 'users/alice/babies/b2'), baby({ photo: null })))
    await assertFails(setDoc(doc(aliceDb(), babyPath), baby({ photo: 'data:image/svg+xml;base64,PHN2Zz4=' })))
    await assertFails(setDoc(doc(aliceDb(), babyPath), baby({ photo: 'https://exemple.test/photo.jpg' })))
    await assertFails(setDoc(doc(aliceDb(), babyPath), baby({ photo: `data:image/jpeg;base64,${'A'.repeat(150001)}` })))
  })

  it('un bébé sans photo (profil plus ancien) reste modifiable et archivable', async () => {
    await seedBaby()
    const ref = doc(aliceDb(), babyPath)
    await assertSucceeds(updateDoc(ref, { archivedAt: serverTimestamp(), updatedAt: serverTimestamp() }))
  })
})

describe('events/{eventId} — biberon (§6)', () => {
  it('la propriétaire enregistre un biberon pour son bébé', async () => {
    await seedBaby()
    await assertSucceeds(setDoc(doc(aliceDb(), eventPath), bottle()))
  })

  it('refuse un biberon pour un bébé inexistant', async () => {
    await assertFails(setDoc(doc(aliceDb(), 'users/alice/babies/inconnu/events/e1'), bottle()))
  })

  it('refuse une quantité bue négative ou démesurée, et l’ancien champ « préparé »', async () => {
    await seedBaby()
    await assertFails(setDoc(doc(aliceDb(), eventPath), bottle({ consumedMl: -10 })))
    await assertFails(setDoc(doc(aliceDb(), eventPath), bottle({ consumedMl: 1500 })))
    await assertFails(setDoc(doc(aliceDb(), eventPath), bottle({ preparedMl: 120 })))
  })

  it('accepte 0 ml bu (biberon refusé), sauf pour du lait pris dans le stock', async () => {
    await seedBaby()
    await assertSucceeds(setDoc(doc(aliceDb(), eventPath), bottle({ consumedMl: 0 })))
    await assertFails(
      setDoc(doc(aliceDb(), eventPath), bottle({ milkType: 'breastMilk', containerId: 'c1', consumedMl: 0 })),
    )
  })

  it('refuse un type de lait inconnu ou un détail en trop', async () => {
    await seedBaby()
    await assertFails(setDoc(doc(aliceDb(), eventPath), bottle({ milkType: 'soda' })))
    await assertFails(setDoc(doc(aliceDb(), eventPath), bottle({ leftoverReusable: true })))
  })

  it('un autre compte ne lit ni n’écrit les biberons d’Alice', async () => {
    await seedBottle()
    await assertFails(getDoc(doc(bobDb(), eventPath)))
    await assertFails(setDoc(doc(bobDb(), `${babyPath}/events/e2`), bottle()))
    await assertFails(deleteDoc(doc(bobDb(), eventPath)))
  })

  it('modifie et supprime son biberon, sans changer son type', async () => {
    await seedBottle()
    const ref = doc(aliceDb(), eventPath)
    await assertSucceeds(updateDoc(ref, { 'details.consumedMl': 100, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { type: 'sleep', updatedAt: serverTimestamp() }))
    await assertSucceeds(deleteDoc(ref))
  })
})

const t = (minutes: number) => Timestamp.fromDate(new Date(2026, 9, 21, 9, minutes))

const feeding = (extra = {}, details = {}) => ({
  type: 'breastfeeding',
  occurredAt: t(0),
  startAt: t(0),
  endAt: null,
  status: 'running',
  details: {
    segments: [
      { side: 'left', startAt: t(0), endAt: t(10) },
      { side: 'right', startAt: t(10), endAt: null },
    ],
    estimatedLeftMl: null,
    estimatedRightMl: null,
    ...details,
  },
  comment: '',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const doneSegments = [
  { side: 'left', startAt: t(0), endAt: t(10) },
  { side: 'right', startAt: t(10), endAt: t(18) },
]

const sleepEvent = (extra = {}) => ({
  type: 'sleep',
  occurredAt: t(0),
  startAt: t(0),
  endAt: null,
  status: 'running',
  details: {},
  comment: '',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const pointEvent = (type: string, details: object, extra = {}) => ({
  type,
  occurredAt: t(0),
  details,
  comment: '',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const container = (extra = {}) => ({
  pumpedAt: t(0),
  initialAmountMl: 120,
  remainingAmountMl: 120,
  storageType: 'fridge',
  storedAt: t(0),
  status: 'available',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const containerPath = `${babyPath}/milkContainers/c1`

async function seedContainer(extra = {}) {
  await seedBaby()
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), containerPath), container(extra))
  })
}

describe('events — allaitement (§7)', () => {
  it('séance en cours : un seul segment ouvert, le dernier', async () => {
    await seedBaby()
    await assertSucceeds(setDoc(doc(aliceDb(), eventPath), feeding()))
  })

  it('séance terminée avec heure de fin et estimations', async () => {
    await seedBaby()
    await assertSucceeds(
      setDoc(
        doc(aliceDb(), eventPath),
        feeding({ status: 'done', endAt: t(18) }, { segments: doneSegments, estimatedLeftMl: 40 }),
      ),
    )
  })

  it('refuse une séance incohérente', async () => {
    await seedBaby()
    const ref = doc(aliceDb(), eventPath)
    await assertFails(setDoc(ref, feeding({ endAt: t(18) }))) // en cours avec une fin
    await assertFails(setDoc(ref, feeding({ status: 'done' }, { segments: doneSegments }))) // terminée sans fin
    await assertFails(setDoc(ref, feeding({}, { segments: [] }))) // aucun segment
    await assertFails(setDoc(ref, feeding({}, { segments: doneSegments }))) // en cours sans segment ouvert
    await assertFails(setDoc(ref, feeding({ startAt: t(5), occurredAt: t(5) }))) // début différent du 1er segment
    await assertFails(setDoc(ref, feeding({}, { estimatedLeftMl: -5 })))
  })

  it('pause puis reprise : mises à jour acceptées', async () => {
    await seedBaby()
    const ref = doc(aliceDb(), eventPath)
    await assertSucceeds(setDoc(ref, feeding()))
    await assertSucceeds(
      updateDoc(ref, { status: 'paused', 'details.segments': doneSegments, updatedAt: serverTimestamp() }),
    )
  })
})

describe('events — sommeil (§9)', () => {
  it('en cours sans fin, puis terminé après le début', async () => {
    await seedBaby()
    const ref = doc(aliceDb(), eventPath)
    await assertSucceeds(setDoc(ref, sleepEvent()))
    await assertSucceeds(updateDoc(ref, { status: 'done', endAt: t(50), updatedAt: serverTimestamp() }))
  })

  it('refuse fin avant début, en cours avec fin, détails non vides', async () => {
    await seedBaby()
    const ref = doc(aliceDb(), eventPath)
    await assertFails(setDoc(ref, sleepEvent({ status: 'done', endAt: t(0) })))
    await assertFails(setDoc(ref, sleepEvent({ endAt: t(30) })))
    await assertFails(setDoc(ref, sleepEvent({ details: { quality: 'good' } })))
  })
})

describe('events — couche (§10) et tirage (§8.1)', () => {
  it('couche valide, type inconnu refusé, pas de chronomètre', async () => {
    await seedBaby()
    const ref = doc(aliceDb(), eventPath)
    await assertSucceeds(setDoc(ref, pointEvent('diaper', { kind: 'both' })))
    await assertFails(setDoc(ref, pointEvent('diaper', { kind: 'blue' })))
    await assertFails(setDoc(ref, pointEvent('diaper', { kind: 'wet' }, { status: 'running' })))
  })

  it('tirage valide ; quantité nulle ou côté inconnu refusés', async () => {
    await seedBaby()
    const ref = doc(aliceDb(), eventPath)
    const pumping = { side: 'both', totalMl: 150, leftMl: 70, rightMl: 80, durationMin: 15 }
    await assertSucceeds(setDoc(ref, pointEvent('milkPumping', pumping)))
    await assertFails(setDoc(ref, pointEvent('milkPumping', { ...pumping, totalMl: 0 })))
    await assertFails(setDoc(ref, pointEvent('milkPumping', { ...pumping, side: 'middle' })))
  })

  it('biberon lié au stock seulement avec du lait maternel', async () => {
    await seedBaby()
    const ref = doc(aliceDb(), eventPath)
    await assertSucceeds(setDoc(ref, bottle({ milkType: 'breastMilk', containerId: 'c1' })))
    await assertFails(setDoc(ref, bottle({ milkType: 'formula', containerId: 'c1' })))
  })
})

const pumpingSession = (extra = {}) => ({
  side: 'both',
  status: 'running',
  startAt: t(0),
  segments: [
    { startAt: t(0), endAt: t(8) },
    { startAt: t(12), endAt: null },
  ],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const pumpingSessionPath = `${babyPath}/pumpingSessions/s1`

describe('pumpingSessions — chronomètre de tirage (§5, §8.1)', () => {
  it('la propriétaire démarre, met en pause, reprend et annule ; un autre compte ne peut rien', async () => {
    await seedBaby()
    const ref = doc(aliceDb(), pumpingSessionPath)
    await assertFails(setDoc(doc(bobDb(), pumpingSessionPath), pumpingSession()))
    await assertSucceeds(setDoc(ref, pumpingSession()))
    await assertSucceeds(getDoc(ref))
    await assertFails(getDoc(doc(bobDb(), pumpingSessionPath)))
    await assertFails(getDoc(doc(anonymousDb(), pumpingSessionPath)))
    const paused = { status: 'paused', segments: [{ startAt: t(0), endAt: t(8) }, { startAt: t(12), endAt: t(20) }] }
    await assertFails(updateDoc(doc(bobDb(), pumpingSessionPath), { ...paused, updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(ref, { ...paused, updatedAt: serverTimestamp() }))
    await assertFails(deleteDoc(doc(bobDb(), pumpingSessionPath)))
    await assertSucceeds(deleteDoc(ref))
  })

  it('refuse un état incohérent, un côté inconnu, un champ en trop ou un bébé inexistant', async () => {
    const ref = doc(aliceDb(), pumpingSessionPath)
    await assertFails(setDoc(ref, pumpingSession()))
    await seedBaby()
    await assertFails(setDoc(ref, pumpingSession({ status: 'paused' })))
    await assertFails(setDoc(ref, pumpingSession({ segments: [{ startAt: t(0), endAt: t(8) }] })))
    await assertFails(setDoc(ref, pumpingSession({ side: 'middle' })))
    await assertFails(setDoc(ref, pumpingSession({ totalMl: 120 })))
    await assertFails(setDoc(ref, pumpingSession({ startAt: t(5) })))
    await assertFails(setDoc(ref, pumpingSession({ status: 'paused', segments: [{ startAt: t(10), endAt: t(5) }], startAt: t(10) })))
  })

  it('le début de la séance ne change pas', async () => {
    await seedBaby()
    const ref = doc(aliceDb(), pumpingSessionPath)
    await assertSucceeds(setDoc(ref, pumpingSession()))
    await assertFails(
      updateDoc(ref, { startAt: t(1), segments: [{ startAt: t(1), endAt: null }], updatedAt: serverTimestamp() }),
    )
  })

  it('fin du chronomètre : tirage enregistré et séance supprimée dans le même lot', async () => {
    await seedBaby()
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), pumpingSessionPath), pumpingSession())
    })
    const db = aliceDb()
    const batch = writeBatch(db)
    batch.set(doc(db, eventPath), pointEvent('milkPumping', { side: 'both', totalMl: 120, leftMl: null, rightMl: null, durationMin: 16 }))
    batch.delete(doc(db, pumpingSessionPath))
    await assertSucceeds(batch.commit())
  })
})

describe('milkContainers et operations (§8)', () => {
  it('tirage mis au stock : contenant et opération « ajout » dans le même lot', async () => {
    await seedBaby()
    const db = aliceDb()
    const batch = writeBatch(db)
    batch.set(doc(db, containerPath), container())
    batch.set(doc(db, `${containerPath}/operations/o1`), {
      type: 'add',
      amountMl: 120,
      linkedEventId: 'e1',
      occurredAt: t(0),
    })
    await assertSucceeds(batch.commit())
  })

  it('refuse un nouveau contenant déjà entamé ou un statut incohérent', async () => {
    await seedBaby()
    await assertFails(setDoc(doc(aliceDb(), containerPath), container({ remainingAmountMl: 80 })))
    await assertFails(setDoc(doc(aliceDb(), containerPath), container({ status: 'used' })))
  })

  it('utilisation : la quantité baisse et le statut suit', async () => {
    await seedContainer()
    const ref = doc(aliceDb(), containerPath)
    await assertSucceeds(updateDoc(ref, { remainingAmountMl: 40, status: 'used', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { remainingAmountMl: 60, status: 'used', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { remainingAmountMl: 0, status: 'used', updatedAt: serverTimestamp() }))
  })

  it('un contenant épuisé ou écarté ne bouge plus', async () => {
    await seedContainer({ remainingAmountMl: 0, status: 'depleted' })
    await assertFails(
      updateDoc(doc(aliceDb(), containerPath), { status: 'discarded', updatedAt: serverTimestamp() }),
    )
  })

  it('biberon, déduction et opération dans la même écriture', async () => {
    await seedContainer()
    const db = aliceDb()
    const batch = writeBatch(db)
    batch.set(doc(db, eventPath), bottle({ milkType: 'breastMilk', containerId: 'c1', consumedMl: 120 }))
    batch.update(doc(db, containerPath), { remainingAmountMl: 0, status: 'depleted', updatedAt: serverTimestamp() })
    batch.set(doc(db, `${containerPath}/operations/o2`), {
      type: 'use',
      amountMl: 120,
      linkedEventId: 'e1',
      occurredAt: t(30),
    })
    await assertSucceeds(batch.commit())
  })

  it('historique non modifiable et privé', async () => {
    await seedContainer()
    const opRef = doc(aliceDb(), `${containerPath}/operations/o1`)
    await assertSucceeds(setDoc(opRef, { type: 'add', amountMl: 120, linkedEventId: null, occurredAt: t(0) }))
    await assertFails(updateDoc(opRef, { amountMl: 500 }))
    await assertFails(getDoc(doc(bobDb(), containerPath)))
    await assertFails(getDoc(doc(bobDb(), `${containerPath}/operations/o1`)))
  })

  it('refuse une opération pour un contenant inexistant', async () => {
    await seedBaby()
    await assertFails(
      setDoc(doc(aliceDb(), `${babyPath}/milkContainers/inconnu/operations/o1`), {
        type: 'use',
        amountMl: 10,
        linkedEventId: null,
        occurredAt: t(0),
      }),
    )
  })
})

const personal = (type: string, details: object, extra = {}) => ({
  type,
  occurredAt: t(0),
  details,
  comment: '',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const appointment = (extra = {}) => ({
  concerne: 'mother',
  title: 'Visite post-natale',
  scheduledAt: Timestamp.fromDate(new Date(2026, 10, 3, 10, 0)),
  location: null,
  contact: null,
  comment: '',
  status: 'planned',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const reminder = (extra = {}) => ({
  serviceId: 'medication',
  babyId: null,
  title: 'Fer',
  description: 'Selon l’ordonnance',
  scheduleType: 'fixedTimes',
  scheduledTimes: ['08:00', '20:00'],
  daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
  intervalMinutes: null,
  maxRepeats: 0,
  repeatEveryMinutes: null,
  startDate: null,
  endDate: null,
  timezone: 'Africa/Casablanca',
  enabled: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

describe('personalEvents (§12)', () => {
  it('eau, repas, médicament et vitamine valides', async () => {
    const db = aliceDb()
    await assertSucceeds(setDoc(doc(db, 'users/alice/personalEvents/p1'), personal('hydration', { amountMl: 250 })))
    await assertSucceeds(setDoc(doc(db, 'users/alice/personalEvents/p2'), personal('hydration', { amountMl: null })))
    await assertSucceeds(
      setDoc(doc(db, 'users/alice/personalEvents/p3'), personal('meal', { mealType: 'lunch', composition: 'Soupe' })),
    )
    await assertSucceeds(
      setDoc(doc(db, 'users/alice/personalEvents/p4'), personal('motherMedication', { reminderId: null, name: 'Fer' })),
    )
    await assertSucceeds(
      setDoc(doc(db, 'users/alice/personalEvents/p5'), personal('supplement', { reminderId: 'r1', name: 'Vitamine D' })),
    )
  })

  it('refuse type inconnu, quantité négative, nom vide, dose ajoutée', async () => {
    const db = aliceDb()
    await assertFails(setDoc(doc(db, 'users/alice/personalEvents/p1'), personal('sport', {})))
    await assertFails(setDoc(doc(db, 'users/alice/personalEvents/p1'), personal('hydration', { amountMl: -1 })))
    await assertFails(
      setDoc(doc(db, 'users/alice/personalEvents/p1'), personal('motherMedication', { reminderId: null, name: '' })),
    )
    await assertFails(
      setDoc(
        doc(db, 'users/alice/personalEvents/p1'),
        personal('motherMedication', { reminderId: null, name: 'Fer', doseMg: 80 }),
      ),
    )
  })

  it('privé : un autre compte ne lit ni n’écrit', async () => {
    await assertSucceeds(setDoc(doc(aliceDb(), 'users/alice/personalEvents/p1'), personal('hydration', { amountMl: 250 })))
    await assertFails(getDoc(doc(bobDb(), 'users/alice/personalEvents/p1')))
    await assertFails(setDoc(doc(bobDb(), 'users/alice/personalEvents/p2'), personal('hydration', { amountMl: 250 })))
  })
})

describe('appointments (§13)', () => {
  it('pour la maman ou pour un bébé existant', async () => {
    await seedBaby()
    const db = aliceDb()
    await assertSucceeds(setDoc(doc(db, 'users/alice/appointments/a1'), appointment()))
    await assertSucceeds(setDoc(doc(db, 'users/alice/appointments/a2'), appointment({ concerne: 'b1', title: 'Vaccin' })))
  })

  it('refuse un bébé inexistant, un statut inconnu, un titre vide', async () => {
    const db = aliceDb()
    await assertFails(setDoc(doc(db, 'users/alice/appointments/a1'), appointment({ concerne: 'inconnu' })))
    await assertFails(setDoc(doc(db, 'users/alice/appointments/a1'), appointment({ status: 'maybe' })))
    await assertFails(setDoc(doc(db, 'users/alice/appointments/a1'), appointment({ title: '' })))
  })

  it('privé', async () => {
    await assertSucceeds(setDoc(doc(aliceDb(), 'users/alice/appointments/a1'), appointment()))
    await assertFails(getDoc(doc(bobDb(), 'users/alice/appointments/a1')))
  })
})

describe('reminders (§14)', () => {
  it('heures fixes ou intervalle, pour la maman ou un bébé', async () => {
    await seedBaby()
    const db = aliceDb()
    await assertSucceeds(setDoc(doc(db, 'users/alice/reminders/r1'), reminder()))
    await assertSucceeds(
      setDoc(
        doc(db, 'users/alice/reminders/r2'),
        reminder({ serviceId: 'bottle', babyId: 'b1', scheduleType: 'interval', scheduledTimes: [], intervalMinutes: 180 }),
      ),
    )
  })

  it('refuse un horaire incohérent, des dates inversées, un bébé inexistant', async () => {
    const db = aliceDb()
    await assertFails(setDoc(doc(db, 'users/alice/reminders/r1'), reminder({ scheduledTimes: [] })))
    await assertFails(
      setDoc(doc(db, 'users/alice/reminders/r1'), reminder({ scheduleType: 'interval', intervalMinutes: 5 })),
    )
    await assertFails(setDoc(doc(db, 'users/alice/reminders/r1'), reminder({ daysOfWeek: [] })))
    await assertFails(
      setDoc(
        doc(db, 'users/alice/reminders/r1'),
        reminder({ startDate: Timestamp.fromDate(new Date(2026, 9, 25)), endDate: Timestamp.fromDate(new Date(2026, 9, 20)) }),
      ),
    )
    await assertFails(setDoc(doc(db, 'users/alice/reminders/r1'), reminder({ babyId: 'inconnu' })))
  })

  it('médicaments et vitamines : jamais pour un bébé, et plus d’événement « médicament du bébé »', async () => {
    await seedBaby()
    const db = aliceDb()
    await assertFails(setDoc(doc(db, 'users/alice/reminders/r1'), reminder({ babyId: 'b1' })))
    await assertFails(setDoc(doc(db, 'users/alice/reminders/r1'), reminder({ serviceId: 'supplement', babyId: 'b1' })))
    await assertFails(setDoc(doc(db, eventPath), pointEvent('babyMedication', { reminderId: null, name: 'Vitamine D' })))
  })

  it('activer ou désactiver un rappel ; privé', async () => {
    const ref = doc(aliceDb(), 'users/alice/reminders/r1')
    await assertSucceeds(setDoc(ref, reminder()))
    await assertSucceeds(updateDoc(ref, { enabled: true, updatedAt: serverTimestamp() }))
    await assertFails(getDoc(doc(bobDb(), 'users/alice/reminders/r1')))
  })
})

const growth = (extra = {}) => ({
  type: 'weight',
  label: null,
  value: 4.2,
  unit: 'kg',
  measuredAt: Timestamp.fromDate(new Date(2026, 9, 20, 10, 0)),
  comment: '',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const growthPath = `${babyPath}/growthRecords/g1`

describe('growthRecords (§15)', () => {
  it('poids, taille, périmètre crânien et mesure personnalisée', async () => {
    await seedBaby()
    const db = aliceDb()
    await assertSucceeds(setDoc(doc(db, growthPath), growth()))
    await assertSucceeds(setDoc(doc(db, `${babyPath}/growthRecords/g2`), growth({ type: 'height', value: 54.5, unit: 'cm' })))
    await assertSucceeds(
      setDoc(doc(db, `${babyPath}/growthRecords/g3`), growth({ type: 'headCircumference', value: 37, unit: 'cm' })),
    )
    await assertSucceeds(
      setDoc(doc(db, `${babyPath}/growthRecords/g4`), growth({ type: 'custom', label: 'Tour de bras', value: 11, unit: 'cm' })),
    )
  })

  it('refuse unité incohérente, valeur nulle ou démesurée, mesure personnalisée sans nom', async () => {
    await seedBaby()
    const db = aliceDb()
    await assertFails(setDoc(doc(db, growthPath), growth({ unit: 'g' })))
    await assertFails(setDoc(doc(db, growthPath), growth({ value: 0 })))
    await assertFails(setDoc(doc(db, growthPath), growth({ value: 3500 })))
    await assertFails(setDoc(doc(db, growthPath), growth({ type: 'height', value: 54, unit: 'kg' })))
    await assertFails(setDoc(doc(db, growthPath), growth({ type: 'custom', label: '', unit: 'cm' })))
    await assertFails(setDoc(doc(db, growthPath), growth({ type: 'custom', label: 'Bras', unit: '' })))
    await assertFails(setDoc(doc(db, growthPath), growth({ type: 'bmi', unit: 'kg' })))
  })

  it('aucune interprétation : percentile ou diagnostic refusés', async () => {
    await seedBaby()
    const db = aliceDb()
    await assertFails(setDoc(doc(db, growthPath), growth({ percentile: 50 })))
    await assertFails(setDoc(doc(db, growthPath), growth({ diagnosis: 'normal' })))
  })

  it('refuse un bébé inexistant', async () => {
    await assertFails(setDoc(doc(aliceDb(), 'users/alice/babies/inconnu/growthRecords/g1'), growth()))
  })

  it('corrige la valeur sans changer le type, puis supprime', async () => {
    await seedBaby()
    const ref = doc(aliceDb(), growthPath)
    await assertSucceeds(setDoc(ref, growth()))
    await assertSucceeds(updateDoc(ref, { value: 4.25, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { type: 'height', unit: 'cm', updatedAt: serverTimestamp() }))
    await assertSucceeds(deleteDoc(ref))
  })

  it('privé : un autre compte ne lit ni n’écrit', async () => {
    await seedBaby()
    await assertSucceeds(setDoc(doc(aliceDb(), growthPath), growth()))
    await assertFails(getDoc(doc(bobDb(), growthPath)))
    await assertFails(setDoc(doc(bobDb(), `${babyPath}/growthRecords/g2`), growth()))
    await assertFails(getDoc(doc(anonymousDb(), growthPath)))
  })
})

const motherInfo = (extra = {}) => ({
  heightCm: 165,
  notes: 'Groupe sanguin fictif',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const motherWeight = (extra = {}) => ({
  weightKg: 64.5,
  measuredAt: Timestamp.fromDate(new Date(2026, 9, 21, 8, 0)),
  comment: '',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const motherContact = (extra = {}) => ({
  role: 'midwife',
  name: 'Sage-femme (test)',
  phone: '+212 6 00 00 00 00',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

describe('profil maman : informations, poids, contacts', () => {
  it('informations : un seul document « profile », valeurs encadrées, un autre compte refusé', async () => {
    const ref = doc(aliceDb(), 'users/alice/motherInfo/profile')
    await assertFails(setDoc(doc(bobDb(), 'users/alice/motherInfo/profile'), motherInfo()))
    await assertFails(setDoc(doc(aliceDb(), 'users/alice/motherInfo/autre'), motherInfo()))
    await assertFails(setDoc(ref, motherInfo({ heightCm: 50 })))
    await assertFails(setDoc(ref, motherInfo({ bmi: 22 })))
    await assertSucceeds(setDoc(ref, motherInfo({ heightCm: null })))
    await assertSucceeds(updateDoc(ref, { heightCm: 170, notes: 'x'.repeat(2000), updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { notes: 'x'.repeat(2001), updatedAt: serverTimestamp() }))
    await assertSucceeds(getDoc(ref))
    await assertFails(getDoc(doc(bobDb(), 'users/alice/motherInfo/profile')))
  })

  it('poids : la propriétaire seulement, entre 20 et 300 kg', async () => {
    const ref = doc(aliceDb(), 'users/alice/motherWeights/w1')
    await assertSucceeds(setDoc(ref, motherWeight()))
    await assertFails(setDoc(doc(aliceDb(), 'users/alice/motherWeights/w2'), motherWeight({ weightKg: 5 })))
    await assertFails(setDoc(doc(aliceDb(), 'users/alice/motherWeights/w3'), motherWeight({ weightKg: '64' })))
    await assertSucceeds(updateDoc(ref, { weightKg: 63.8, updatedAt: serverTimestamp() }))
    await assertFails(getDoc(doc(bobDb(), 'users/alice/motherWeights/w1')))
    await assertFails(deleteDoc(doc(bobDb(), 'users/alice/motherWeights/w1')))
    await assertSucceeds(deleteDoc(ref))
  })

  it('contacts : rôle connu, nom obligatoire, téléphone fait de chiffres', async () => {
    const ref = doc(aliceDb(), 'users/alice/motherContacts/c1')
    await assertSucceeds(setDoc(ref, motherContact()))
    await assertSucceeds(setDoc(doc(aliceDb(), 'users/alice/motherContacts/c2'), motherContact({ phone: '' })))
    await assertFails(setDoc(doc(aliceDb(), 'users/alice/motherContacts/c3'), motherContact({ role: 'plombier' })))
    await assertFails(setDoc(doc(aliceDb(), 'users/alice/motherContacts/c4'), motherContact({ name: '' })))
    await assertFails(setDoc(doc(aliceDb(), 'users/alice/motherContacts/c5'), motherContact({ phone: '<script>' })))
    await assertFails(setDoc(doc(bobDb(), 'users/alice/motherContacts/c6'), motherContact()))
    await assertFails(getDoc(doc(bobDb(), 'users/alice/motherContacts/c1')))
  })
})

describe('suppression du compte (§3.4)', () => {
  const paths = [
    eventPath,
    growthPath,
    `${containerPath}/operations/o1`,
    containerPath,
    pumpingSessionPath,
    babyPath,
    'users/alice/personalEvents/p1',
    'users/alice/appointments/a1',
    'users/alice/reminders/r1',
    'users/alice/motherInfo/profile',
    'users/alice/motherWeights/w1',
    'users/alice/motherContacts/c1',
    'users/alice',
  ]

  async function seedAccount() {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'users/alice'), userProfile())
      await setDoc(doc(db, babyPath), baby())
      await setDoc(doc(db, eventPath), bottle())
      await setDoc(doc(db, growthPath), growth())
      await setDoc(doc(db, containerPath), container())
      await setDoc(doc(db, pumpingSessionPath), pumpingSession())
      await setDoc(doc(db, `${containerPath}/operations/o1`), { type: 'add', amountMl: 100, linkedEventId: null, occurredAt: Timestamp.now() })
      await setDoc(doc(db, 'users/alice/personalEvents/p1'), personal('hydration', { amountMl: 250 }))
      await setDoc(doc(db, 'users/alice/appointments/a1'), appointment())
      await setDoc(doc(db, 'users/alice/reminders/r1'), reminder())
      await setDoc(doc(db, 'users/alice/motherInfo/profile'), motherInfo())
      await setDoc(doc(db, 'users/alice/motherWeights/w1'), motherWeight())
      await setDoc(doc(db, 'users/alice/motherContacts/c1'), motherContact())
    })
  }

  it('un autre compte ne peut rien supprimer', async () => {
    await seedAccount()
    for (const path of paths) await assertFails(deleteDoc(doc(bobDb(), path)))
  })

  it('la propriétaire supprime chaque sous-collection, puis son profil', async () => {
    await seedAccount()
    for (const path of paths) await assertSucceeds(deleteDoc(doc(aliceDb(), path)))
  })
})
