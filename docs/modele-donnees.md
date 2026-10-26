# Modèle de données Firestore (tel qu'implémenté)

Référence : §27 du cahier des charges. Toutes les données privées sont sous `users/{userId}` ;
chaque collection a sa règle dans `firestore.rules`, testée par `npm run test:rules`.
Les dates sont des `Timestamp` ; `createdAt` / `updatedAt` sont posés par `serverTimestamp()`.

| Collection | Champs | Notes |
|---|---|---|
| `users/{userId}` | displayName, email, preferredLanguage (`fr`/`ar`), timezone, welcomeEmailSent, onboardingCompleted, createdAt, updatedAt | §3 ; `preferredLanguage` = langue de l'interface sur tous les appareils (§23) ; `onboardingCompleted` = case « Ne plus afficher ce guide » du guide de bienvenue |
| `…/babies/{babyId}` | name, birthDate, sex (`female`/`male`/null), avatarEmoji (clé d'avatar : `kid`, `cat`…), themeColor (null ou couleur), archivedAt (null ou date), photo? (JPEG réduit en `data:image/jpeg;base64,…`, ≤ 150 000 caractères), createdAt, updatedAt | §4 ; voir décision « Photo » |
| `…/babies/{babyId}/events/{eventId}` | type, occurredAt, startAt?, endAt?, status?, details, comment, createdAt, updatedAt | voir types ci-dessous |
| `…/babies/{babyId}/milkContainers/{id}` | pumpedAt, initialAmountMl, remainingAmountMl, storageType (`fridge`/`freezer`/`other`), storedAt, status (`available`/`used`/`depleted`/`discarded`), createdAt, updatedAt | §8.2 ; la quantité restante ne fait que baisser |
| `…/babies/{babyId}/pumpingSessions/{id}` | side (`left`/`right`/`both`), status (`running`/`paused`), startAt, segments [{startAt, endAt}], createdAt, updatedAt | §5, §8.1 ; chronomètre de tirage en cours, supprimé quand le tirage est enregistré (même lot) ou annulé ; voir décision ci-dessous |
| `…/milkContainers/{id}/operations/{opId}` | type (`add`/`use`/`discard`), amountMl, linkedEventId (null ou id), occurredAt | §8.3 ; jamais modifiées |
| `…/babies/{babyId}/growthRecords/{id}` | type (`weight`/`height`/`headCircumference`/`custom`), label (nom d'une mesure personnalisée, sinon null), value, unit, measuredAt, comment, createdAt, updatedAt | §15 ; voir décision ci-dessous |
| `users/{userId}/personalEvents/{id}` | type, occurredAt, details, comment, createdAt, updatedAt | §12 |
| `users/{userId}/appointments/{id}` | concerne (`mother` ou babyId), title, scheduledAt, location?, contact?, comment, status (`planned`/`done`/`cancelled`), createdAt, updatedAt | §13 |
| `users/{userId}/reminders/{id}` | serviceId, babyId (null = maman), title, description, scheduleType (`fixedTimes`/`interval`), scheduledTimes (`HH:mm`), daysOfWeek (1 = lundi … 7), intervalMinutes, maxRepeats, repeatEveryMinutes, startDate, endDate, timezone, enabled, createdAt, updatedAt | §14 ; voir décision ci-dessous |
| `users/{userId}/motherInfo/profile` | heightCm (null ou 100 à 230), notes (≤ 2000), createdAt, updatedAt | Profil maman : un seul document « profile » ; aucun calcul (pas d'IMC) |
| `users/{userId}/motherWeights/{id}` | weightKg (20 à 300), measuredAt, comment, createdAt, updatedAt | Poids de la maman, courbe simple sans objectif |
| `users/{userId}/motherContacts/{id}` | role (`midwife`/`gynecologist`/`pediatrician`/`doctor`/`pharmacy`/`family`/`other`), name, phone (chiffres, espaces, + ( ) - .), createdAt, updatedAt | Contacts utiles (bouton « Appeler ») |
| `users/{userId}/serviceSettings/{id}` | — | prévu au §27, pas encore utilisé (fermé par les règles) |
| `users/{userId}/reminderOccurrences/{id}` | — | réservé aux notifications (P2), fermé |
| `guideArticles/{id}` | — | guide documentaire (P1, phase 5), fermé |

## Types d'événements bébé (`events`)

| type | Chronomètre | details |
|---|---|---|
| `bottle` | non | consumedMl (quantité bue), milkType (`formula`/`breastMilk`), containerId? (« lait maternel (stock) » : lait maternel seulement, quantité bue > 0 retirée du contenant) |
| `breastfeeding` | oui : startAt, endAt, status `running`/`paused`/`done` | segments [{side, startAt, endAt}], estimatedLeftMl, estimatedRightMl |
| `sleep` | oui : startAt, endAt, status `running`/`done` | `{}` |
| `milkPumping` | non (le chronomètre est à part : `pumpingSessions`) | side (`left`/`right`/`both`), totalMl, leftMl?, rightMl?, durationMin? |
| `diaper` | non | kind (`wet`/`dirty`/`both`) |

## Types d'événements personnels (`personalEvents`)

| type | details |
|---|---|
| `hydration` | amountMl (null = non noté) |
| `meal` | mealType (`breakfast`/`lunch`/`dinner`/`snack`/`other`), composition |
| `motherMedication`, `supplement` | reminderId (traitement ou null), name |

## Décisions

- **Traitements = rappels.** Un médicament ou une vitamine (§11, §12 : nom, instructions, heures, jours,
  dates de début et de fin) est enregistré dans `reminders` avec `serviceId` = `medication` ou `supplement`,
  `title` = nom, `description` = instructions saisies par la maman. Chaque prise est un événement
  (`motherMedication`/`supplement`) qui garde l'id du traitement.
  Avant P2, `enabled` est seulement enregistré : **rien n'est envoyé**.
- **Pas de médicaments côté bébé** (décision d'équipe du 21/10, écart au §11) : les traitements ont toujours
  `babyId = null` et le type d'événement `babyMedication` n'existe plus (refusé par les règles, ignoré à l'affichage).
- **Biberon = quantité bue** (décision d'équipe du 22/10, écart au §6) : plus de `preparedMl` (refusé par les règles,
  retiré des anciens biberons à leur modification), ni reste, ni alerte.
- **Aucune dose** n'est stockée ni calculée : les règles refusent tout champ de dose (§11).
- **Croissance** (§15) : unité imposée pour les mesures standard (poids en `kg`, taille et périmètre crânien
  en `cm`) ; une mesure personnalisée a un nom (`label`, ajouté au §27 pour distinguer ses courbes) et son unité.
  Bornes de saisie contre les fautes de frappe (poids ≤ 50 kg, tailles ≤ 200 cm) : ce ne sont pas des normes.
  Le type d'une mesure ne change pas après création. Aucune courbe de référence, aucun percentile ni diagnostic
  (champs refusés par les règles).
- **Bébé supprimé** : ses événements, ses mesures de croissance, son stock (contenants + opérations),
  ses rendez-vous et ses rappels sont supprimés avant lui (§3.4, §4.3).
- **Rapports** (§18) : rien n'est stocké. Le rapport est calculé à la demande à partir des événements,
  rendez-vous et mesures ; le message personnel reste sur l'appareil.
- **Avatar et photo** (décision d'équipe du 22/10) : les avatars sont des icônes ; la clé est gardée dans le champ
  historique `avatarEmoji` (un ancien emoji s'affiche avec l'icône par défaut). La photo facultative est réduite sur le
  téléphone et gardée dans le profil, car Firebase Storage est interdit (§33). Elle sort seulement dans les rapports.
- **Chronomètre de tirage** (demande de l'équipe du 22/10) : comme la tétée, on enregistre des horodatages
  (segments, pauses exclues) dans `pumpingSessions` et dans `localStorage`. « Terminer » ferme le segment ouvert,
  puis le formulaire reprend l'heure de début, le côté et la durée (en minutes, au moins 1) ; la quantité est
  toujours saisie par la maman, jamais déduite de la durée. L'enregistrement crée l'événement `milkPumping`
  (et le contenant si « Mettre au stock ») et supprime la séance dans le même lot.
- **Préférences de l'appareil** (thème, épinglés masqués du jour, blocs de l'accueil ouverts ou fermés `bambino.pinsOpen` / `bambino.lastTimesOpen`, langue avant connexion `bambino.language`) : `localStorage`, pas Firestore. Guide de bienvenue fermé pendant la visite : `sessionStorage` (`bambino.guideClosed.{userId}`).
- **Traitements : « combien de fois par jour »** (22/10) : un traitement a toujours des heures fixes, une heure par prise ; le nombre de prises du jour = nombre d'heures. La page compte les « Prise effectuée » du jour (événements qui gardent l'id du traitement) : « 1 / 2 », puis « C'est fait pour aujourd'hui ». Aucune dose.
- **Messages à l'équipe** : envoyés par EmailJS (modèle `VITE_EMAILJS_FEEDBACK_TEMPLATE_ID`), rien n'est gardé dans Firestore. L'adresse e-mail de la maman n'est jointe que si elle coche « Je veux une réponse ».
- **Langue** (22/10) : celle du compte (`preferredLanguage`) s'applique dès la connexion ; elle se change à l'inscription ou dans Bébés → Application. L'arabe utilise le code `ar-MA` (chiffres 0-9, mois marocains) et le sens de droite à gauche. Le PDF reste en français ; le texte du rapport suit la langue.
- **Aucun index composé** : les requêtes filtrent sur un seul champ (`occurredAt`, `measuredAt`, `status`, `concerne`, `babyId`)
  et le reste est trié côté application.
