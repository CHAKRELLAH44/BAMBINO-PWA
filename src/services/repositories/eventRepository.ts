import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore'
import type {
  BabyEvent,
  BottleInput,
  DiaperInput,
  FeedingSegment,
  FeedingSession,
  PumpingInput,
  SessionEvent,
  SessionSegment,
} from '../../types/event'
import { db } from '../firebase/config'

export const eventsCollection = (userId: string, babyId: string) =>
  collection(db, 'users', userId, 'babies', babyId, 'events')
const eventRef = (userId: string, babyId: string, eventId: string) =>
  doc(db, 'users', userId, 'babies', babyId, 'events', eventId)

const fromSnapshot = (snapshot: DocumentSnapshot) =>
  ({ id: snapshot.id, ...snapshot.data({ serverTimestamps: 'estimate' }) }) as BabyEvent

// Types gérés par l'application ; un ancien type retiré (ex. médicament du bébé) est ignoré à l'affichage
const KNOWN_TYPES = new Set<string>(['bottle', 'breastfeeding', 'milkPumping', 'sleep', 'diaper'])
const isKnown = (event: BabyEvent) => KNOWN_TYPES.has(event.type)

const ts = (date: Date) => Timestamp.fromDate(date)
const created = () => ({ createdAt: serverTimestamp(), updatedAt: serverTimestamp() })

/** Identifiant créé à l'avance (utile pour écrire la copie de secours avant Firestore) */
export const newEventId = (userId: string, babyId: string) => doc(eventsCollection(userId, babyId)).id

export interface EventQuery {
  maxCount: number
  /** Inclus */
  from?: Date
  /** Exclu */
  to?: Date
}

/** Écoute en direct les événements d'un bébé, du plus récent au plus ancien */
export function subscribeToEvents(
  userId: string,
  babyId: string,
  options: EventQuery,
  onChange: (events: BabyEvent[]) => void,
  onError: (error: Error) => void,
) {
  const constraints: QueryConstraint[] = []
  if (options.from) constraints.push(where('occurredAt', '>=', ts(options.from)))
  if (options.to) constraints.push(where('occurredAt', '<', ts(options.to)))
  constraints.push(orderBy('occurredAt', 'desc'), limit(options.maxCount))

  return onSnapshot(
    query(eventsCollection(userId, babyId), ...constraints),
    (snapshot) => onChange(snapshot.docs.map(fromSnapshot).filter(isKnown)),
    onError,
  )
}

/**
 * Séances en cours ou en pause (§5 : au démarrage, on recherche une séance non terminée).
 * `fromCache` indique que la réponse ne vient pas encore du serveur (hors ligne, démarrage).
 */
export function subscribeToOngoingSessions(
  userId: string,
  babyId: string,
  onChange: (events: SessionEvent[], fromCache: boolean) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(eventsCollection(userId, babyId), where('status', 'in', ['running', 'paused'])),
    { includeMetadataChanges: true },
    (snapshot) => onChange(snapshot.docs.map(fromSnapshot) as SessionEvent[], snapshot.metadata.fromCache),
    onError,
  )
}

/** Écoute un événement : inclut les écritures locales pas encore confirmées par le serveur */
export function subscribeToEvent(
  userId: string,
  babyId: string,
  eventId: string,
  onChange: (event: BabyEvent | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    eventRef(userId, babyId, eventId),
    (snapshot) => {
      const event = snapshot.exists() ? fromSnapshot(snapshot) : null
      onChange(event && isKnown(event) ? event : null)
    },
    onError,
  )
}

export async function deleteEvent(userId: string, babyId: string, eventId: string) {
  await deleteDoc(eventRef(userId, babyId, eventId))
}

// --- Biberon (§6) ---

export const bottleToFirestore = (input: BottleInput) => ({
  type: 'bottle',
  occurredAt: ts(input.occurredAt),
  details: input.details,
  comment: input.comment,
})

export async function createBottle(userId: string, babyId: string, input: BottleInput) {
  await setDoc(doc(eventsCollection(userId, babyId)), { ...bottleToFirestore(input), ...created() })
}

/**
 * Champ par champ, pour conserver le lien éventuel avec un contenant du stock.
 * L'ancien champ « préparé » (avant la décision du 22/10) est retiré au passage.
 */
export async function updateBottle(userId: string, babyId: string, eventId: string, input: BottleInput) {
  await updateDoc(eventRef(userId, babyId, eventId), {
    occurredAt: ts(input.occurredAt),
    'details.preparedMl': deleteField(),
    'details.consumedMl': input.details.consumedMl,
    'details.milkType': input.details.milkType,
    comment: input.comment,
    updatedAt: serverTimestamp(),
  })
}

// --- Allaitement (§7) ---

const segmentsToFirestore = (segments: SessionSegment[]) =>
  segments.map((segment) => ({
    side: segment.side,
    startAt: ts(segment.startAt),
    endAt: segment.endAt ? ts(segment.endAt) : null,
  }))

export const segmentsFromFirestore = (segments: FeedingSegment[]): SessionSegment[] =>
  segments.map((segment) => ({
    side: segment.side,
    startAt: segment.startAt.toDate(),
    endAt: segment.endAt?.toDate() ?? null,
  }))

function feedingTimes(session: FeedingSession) {
  const first = session.segments[0]
  const last = session.segments[session.segments.length - 1]
  return {
    occurredAt: ts(first.startAt),
    startAt: ts(first.startAt),
    endAt: session.status === 'done' && last.endAt ? ts(last.endAt) : null,
    status: session.status,
  }
}

export interface FeedingExtras {
  estimatedLeftMl: number | null
  estimatedRightMl: number | null
  comment: string
}

const NO_EXTRAS: FeedingExtras = { estimatedLeftMl: null, estimatedRightMl: null, comment: '' }

export async function createFeeding(
  userId: string,
  babyId: string,
  eventId: string,
  session: FeedingSession,
  extras: FeedingExtras = NO_EXTRAS,
) {
  await setDoc(eventRef(userId, babyId, eventId), {
    type: 'breastfeeding',
    ...feedingTimes(session),
    details: {
      segments: segmentsToFirestore(session.segments),
      estimatedLeftMl: extras.estimatedLeftMl,
      estimatedRightMl: extras.estimatedRightMl,
    },
    comment: extras.comment,
    ...created(),
  })
}

/** Action du chronomètre : seuls les horodatages changent */
export async function updateFeedingSession(
  userId: string,
  babyId: string,
  eventId: string,
  session: FeedingSession,
) {
  await updateDoc(eventRef(userId, babyId, eventId), {
    ...feedingTimes(session),
    'details.segments': segmentsToFirestore(session.segments),
    updatedAt: serverTimestamp(),
  })
}

/** Fin de séance ou correction (§7.2, §7.3) */
export async function saveFeeding(
  userId: string,
  babyId: string,
  eventId: string,
  session: FeedingSession,
  extras: FeedingExtras,
) {
  await updateDoc(eventRef(userId, babyId, eventId), {
    ...feedingTimes(session),
    details: {
      segments: segmentsToFirestore(session.segments),
      estimatedLeftMl: extras.estimatedLeftMl,
      estimatedRightMl: extras.estimatedRightMl,
    },
    comment: extras.comment,
    updatedAt: serverTimestamp(),
  })
}

// --- Sommeil (§9) ---

const sleepFields = (startAt: Date, endAt: Date | null) => ({
  occurredAt: ts(startAt),
  startAt: ts(startAt),
  endAt: endAt ? ts(endAt) : null,
  status: endAt ? 'done' : 'running',
})

export async function createSleep(
  userId: string,
  babyId: string,
  eventId: string,
  startAt: Date,
  endAt: Date | null,
  comment = '',
) {
  await setDoc(eventRef(userId, babyId, eventId), {
    type: 'sleep',
    ...sleepFields(startAt, endAt),
    details: {},
    comment,
    ...created(),
  })
}

export async function updateSleep(
  userId: string,
  babyId: string,
  eventId: string,
  startAt: Date,
  endAt: Date | null,
  comment?: string,
) {
  await updateDoc(eventRef(userId, babyId, eventId), {
    ...sleepFields(startAt, endAt),
    ...(comment === undefined ? {} : { comment }),
    updatedAt: serverTimestamp(),
  })
}

// --- Couche (§10) ---

const diaperToFirestore = (input: DiaperInput) => ({
  occurredAt: ts(input.occurredAt),
  details: { kind: input.kind },
  comment: input.comment,
})

export async function createDiaper(userId: string, babyId: string, input: DiaperInput) {
  await setDoc(doc(eventsCollection(userId, babyId)), { type: 'diaper', ...diaperToFirestore(input), ...created() })
}

export async function updateDiaper(userId: string, babyId: string, eventId: string, input: DiaperInput) {
  await updateDoc(eventRef(userId, babyId, eventId), { ...diaperToFirestore(input), updatedAt: serverTimestamp() })
}

// --- Tirage (§8.1) : la création avec mise au stock est dans milkStockRepository ---

export const pumpingToFirestore = (input: PumpingInput) => ({
  type: 'milkPumping',
  occurredAt: ts(input.occurredAt),
  details: input.details,
  comment: input.comment,
})

export async function updatePumping(userId: string, babyId: string, eventId: string, input: PumpingInput) {
  const { type: _type, ...fields } = pumpingToFirestore(input)
  await updateDoc(eventRef(userId, babyId, eventId), { ...fields, updatedAt: serverTimestamp() })
}
