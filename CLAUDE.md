# CLAUDE.md — Bambino (PWA suivi bébé)

> **À lire en premier, au début de chaque tâche.**
> **Avant de terminer une tâche : repasser la section « Avant de terminer » point par point, puis mettre à jour la section « Avancement ».**
> Ne cocher une case que si c'est **vérifié** (build, test, émulateur ou navigateur), pas seulement « codé ».

Référence complète : [docs/cahier-des-charges-v1.1.pdf](docs/cahier-des-charges-v1.1.pdf) (v1.1 du 20/10/2026). En cas de doute, le cahier des charges fait foi : relire la section concernée avant de coder un module.
Conventions de code et Git : [docs/conventions.md](docs/conventions.md).

Équipe : Imaska et Joska. Langue de travail : français. Interface : français + arabe. Rapports PDF : français uniquement.

---

## 1. Règles à ne jamais enfreindre

### Budget 0 DH (§33)
- Firebase plan **Spark** uniquement : Authentication, Firestore, Hosting.
- **Interdit** : Cloud Functions, Firebase Storage, tout service payant ou demandant une carte bancaire.
- Un service payant ne s'ajoute que par décision explicite de l'équipe ; sinon la fonctionnalité est reportée.
- Toute nouvelle bibliothèque doit répondre à un besoin concret de la phase en cours.

### Données et sécurité (§2, §21, §28)
- **Données fictives uniquement** tant que la conformité légale (P3) n'est pas faite. Aucune vraie utilisatrice.
- Toutes les données privées sous `users/{userId}`. Chaque utilisatrice ne lit et ne modifie que ses propres données.
- Toute nouvelle collection ou sous-collection = une règle dans `firestore.rules`, **testée sur l'émulateur**. Par défaut, tout est refusé.
- Champs obligatoires et types validés **deux fois** : par Zod (client) et par les règles Firestore (serveur).
- Aucun secret dans le code. Seule la clé **publique** EmailJS est autorisée ; jamais de clé privée EmailJS.
- `.env.local` n'est jamais commité.
- Aucune donnée personnelle dans `console.log`, les journaux ou les messages d'erreur.
- Les articles du guide sont en lecture seule pour les utilisatrices ; seules Imaska et Joska publient.

### Santé : aucun avis médical (§11, §12, §15, §22)
- L'application organise uniquement ce que la maman saisit : **pas de prescription, pas de calcul de dosage, pas de diagnostic** (déshydratation, retard de croissance…).
- Courbes de référence médicales seulement si les données sont fiables et sourcées.
- Durées de conservation du lait affichées avec leur source.

### Chronomètres et calculs (§5 à §9, §17)
- On ne compte **jamais** le temps : on enregistre des horodatages. `durée = fin (ou maintenant) − début`.
- Chaque horodatage est écrit dans Firestore **et** copié dans `localStorage`. Au démarrage, une séance non terminée est retrouvée et réaffichée.
- Allaitement : **un seul segment ouvert à la fois** ; la quantité n'est jamais déduite de la durée ; une quantité estimée est toujours affichée comme estimation.
- Biberon (décision d'équipe du 22/10, écart au §6) : on saisit **seulement la quantité bue** et le type de lait (infantile, maternel, maternel du stock) ; quantité négative refusée ; plus de « préparé », de reste ni d'alerte. « Lait maternel (stock) » : contenant obligatoire, la quantité bue en est retirée par transaction.
- Stock de lait : toute utilisation passe par une **transaction Firestore** ; refus si la quantité dépasse le stock ; un contenant n'est jamais présenté comme utilisable par défaut.
- Sommeil : une période qui traverse minuit est répartie sur les deux dates ; une période sans `endAt` n'est jamais comptée comme définitive.
- Résumé du jour : un événement n'est **jamais compté deux fois** ; le volume bu au sein n'est jamais inventé.
- Le journal ne stocke rien : il lit les événements déjà enregistrés.

### Fonctionnement
- Les fonctions de suivi doivent marcher **sans notifications**. Avant P2, les rappels sont seulement enregistrés.
- Hors ligne en v1 : seule l'interface est en cache ; pas de promesse de saisie hors ligne.
- Horodatages enregistrés de façon uniforme (`serverTimestamp()` ou `Timestamp`), affichés dans le fuseau horaire de l'utilisatrice.
- Aucun texte en dur dans l'interface : tout passe par `src/i18n/locales/`. Le RTL arabe doit rester possible (`dir`).
- Aucun emoji dans l'interface ni dans les traductions : icônes Tabler (MIT) via le registre `src/components/icons.ts` (une catégorie = une icône + une teinte), `IconBadge` et `Notice` (décision d'équipe du 22/10).
- Photo du bébé : jamais Firebase Storage ; JPEG réduit sur le téléphone (`src/utils/photo.ts`) et gardé dans le profil (≤ 150 000 caractères, vérifié par les règles). Photos fictives seulement tant que la conformité (P3) n'est pas faite.
- E-mail de bienvenue : un seul envoi, uniquement si `welcomeEmailSent == false`, sans nouvelle tentative en boucle.
- Suppression de compte : supprimer chaque sous-collection, puis `users/{userId}`, puis le compte Auth (et gérer la demande de reconnexion récente).

### Méthode de travail (§26, §29, §30)
- Petites parties : ne jamais générer toute l'application en une fois.
- Jamais de commit direct sur `main` : une branche, puis une pull request relue par l'autre membre.
- Ne pas modifier les mêmes fichiers que l'autre membre sans se coordonner.
- Les dossiers des phases futures restent vides jusqu'à leur développement.

---

## 2. Architecture (à respecter)

- `src/app/` : routeur, `App`, `AppLayout` (en-tête bébé suivi + barre de navigation), tableau de bord.
- `src/features/<module>/` : un dossier par module (pages, schémas Zod, logique). Modules : auth, babies, bottle, history, breastfeeding, sleep, sessions (chronomètres partagés), milk-stock, diaper, daily-journal, medications, mother-services, appointments, reminders, growth, reports, onboarding (guide de bienvenue en 3 étapes), calendar (fichier .ics pour l'agenda du téléphone), mother-profile (profil maman : poids, informations, contacts), feedback (messages à l'équipe) ; à venir : guide (documentaire), notifications, chatbot.
- Rangement des écrans (décisions d'équipe du 22/10, **pas de doublons**) : Accueil = « Bonjour » + prénom de la maman, date du jour, profil du bébé au centre, bouton « + » vers les 6 saisies, séance en cours, « Dernières fois » (bloc repliable : il y a combien de temps, dernier sein), « Prévu aujourd'hui » (bloc repliable), activités du jour (« Tout voir » → historique) et lien vers le journal ; Maman = services maman + rendez-vous (filtre « Pour ») + rappels ; Bébés = un bébé à la fois dans un carrousel (glisser, flèches, points) avec taille, poids, naissance, sexe et « Suivre ce bébé » ; **Croissance** et **Rapport** du bébé affiché à part, sous le carrousel ; Profil maman (poids, prénom, taille, pense-bête, contacts utiles), « Une idée, une demande ? » (message à l'équipe), compte (se déconnecter, supprimer le compte). « Ajouter à mon calendrier » : sur un rendez-vous ou un rappel enregistré (page de modification). Une fonction n'a qu'un seul point d'entrée.
- Textes partagés : `eventSummaryText` (history/eventText.ts) décrit une activité pour l'historique, la frise et les rapports ; `summarizeRange` (daily-journal) fait les totaux d'un jour ou d'une période. Ne pas réécrire ces calculs ailleurs.
- Bébé suivi : `useActiveBaby()` (`features/babies/`), choix mémorisé sur l'appareil. Toute page de suivi travaille sur `activeBaby`. **On change de bébé uniquement dans la section Bébés** (bouton « Suivre ») ; les pages de saisie affichent seulement un rappel en lecture seule (`ActiveBabyBadge`). Le filtre « Bébé » de l'historique est un simple filtre : les liens d'un autre bébé (ou d'un bébé archivé) portent `?baby=…`.
- `src/services/firebase/` : initialisation (`auth`, `db`). `src/services/repositories/` : **seul** endroit qui appelle Firestore. `src/services/email/` : EmailJS.
- `src/types/` : types TypeScript partagés. `src/i18n/locales/` : traductions. `src/utils/` : dates (saisie et affichage). `src/components/styles.ts` : styles partagés (boutons, champs, cartes).
- Modèle de données : §27 du cahier, détaillé tel qu'implémenté dans [docs/modele-donnees.md](docs/modele-donnees.md) (à tenir à jour).
- Modèle de données (rappel) : §27 du cahier. Types d'événements bébé : bottle, breastfeeding, milkPumping, sleep, diaper (pas de médicament bébé : décision d'équipe du 21/10), chacun avec son schéma Zod **et** sa validation dans `isValidEvent` (`firestore.rules`).
- Tests : `npm test` (calculs, `src/**/*.test.ts`) et `npm run test:rules` (règles Firestore, `tests/rules/`).

## 3. Pièges techniques connus

- **Java 21+ obligatoire** pour les émulateurs (Firebase CLI 15). Java 17 est le défaut du PC ; le JDK 24 est dans `C:\Program Files\Java\jdk-24`. Dans le terminal des émulateurs (PowerShell) :
  `$env:JAVA_HOME = "C:\Program Files\Java\jdk-24"; $env:Path = "$env:JAVA_HOME\bin;$env:Path"`
- Le dossier parent `Documents/PROJECT/` contient un `postcss.config.js` (Tailwind v3) d'un autre projet. `vite.config.ts` déclare `css.postcss` vide pour l'ignorer : **ne pas retirer cette ligne**.
- `@hookform/resolvers` est fixé en **v5** (la v6 a un conflit de dépendances).
- `npm audit` signale 4 failles dans `@grpc/grpc-js` (code serveur de Firebase) : **ne pas lancer `npm audit fix --force`**.
- React Router 8 : `RouterProvider` s'importe depuis `react-router/dom`.
- Linter (oxlint) : un fichier `.tsx` n'exporte que des composants (contexte et hooks dans des fichiers `.ts` séparés).
- Émulateurs : Auth `127.0.0.1:9099`, Firestore `127.0.0.1:8080`. Avec `VITE_USE_EMULATORS=true`, l'app s'y connecte.
- `firebase init` : répondre **No** s'il propose d'écraser `firestore.rules`.
- « L'application n'a pas pu démarrer / Variables manquantes dans .env.local » = `.env.local` vide ou incomplet. `main.tsx` charge l'app en import dynamique pour afficher l'erreur au lieu d'une page blanche : garder ce mécanisme.
- Vite redémarre tout seul quand `.env.local` change ; si l'ancienne valeur semble rester, relancer `npm run dev`.
- Comptes de test : utiliser **sa propre** adresse Gmail avec un suffixe (`prenom.nom+test1@gmail.com`), jamais une adresse inventée. EmailJS et Firebase envoient de vrais e-mails, même avec les émulateurs pour EmailJS. Pour une adresse inconnue, « mot de passe oublié » n'envoie rien, sans erreur (protection contre l'énumération).
- Skills Firebase (`.claude/skills/`, `.agents/`, installés par `firebase init`, non versionnés) : certains décrivent des services **interdits** ici (Cloud Functions, Data Connect, App Hosting, Storage, AI Logic). Les règles de la section 1 passent **toujours** avant ces skills. Seuls `firebase-basics`, `firebase-auth-basics`, `firebase-firestore`, `firebase-hosting-basics` et `firebase-security-rules-auditor` sont pertinents.
- `npm run test:rules` démarre son propre émulateur Firestore : il échoue si `npm run emulators` tourne déjà (port 8080 occupé). Dans ce cas, lancer directement `npx vitest run tests/rules`, qui utilise l'émulateur en cours sur un projet séparé (`demo-bambino-rules`) sans toucher aux données de test.
- Médicaments et vitamines = documents `reminders` (serviceId `medication`/`supplement`), chaque prise = un événement qui garde l'id du traitement. Ne jamais ajouter de champ de dose (règles + §11). Détails : docs/modele-donnees.md.
- Après chaque modification de `firestore.rules` : l'émulateur la recharge tout seul, mais le **vrai** Firebase n'est à jour qu'après `firebase deploy --only firestore:rules`. Symptôme typique : sur le vrai Firebase, seuls les services récents n'enregistrent pas (« Firebase a refusé l'enregistrement » en développement) alors que tout marche sur l'émulateur.

---

- Thème sombre : `src/index.css` redéfinit en sombre les nuances des palettes slate, rose, red, amber, sky, emerald, violet (généré depuis les couleurs Tailwind). Utiliser `bg-surface` au lieu de `bg-white`. Une **nouvelle palette** (ex. indigo) n'aurait pas de version sombre : rester sur ces palettes ou l'ajouter au bloc `.dark`.
- PWA : le service worker n'est actif qu'en build (`npm run build` puis `npx vite preview`), pas avec `npm run dev`. Mise à jour proposée par `UpdateToast` (20 s, « Rafraîchir », jamais forcée).
- Message « Version de test » retiré des pages de connexion et d'inscription le 22/10 (décision de l'équipe) : la règle « données fictives uniquement » reste valable jusqu'à la conformité (P3). En-têtes de cache dans `firebase.json` (sw.js et index.html sans cache).
- Préférences de l'appareil (thème, blocs repliables de l'accueil, épinglés masqués du jour, bébé suivi) : `localStorage`, clés `bambino.…` ; celles d'un compte sont effacées à sa suppression.
- Pages chargées à la demande : une **nouvelle page** se déclare dans `src/app/lazyPages.ts` puis dans `router.tsx` (seules connexion, inscription et accueil sont chargées au départ). Une page impossible à charger affiche `RouteError` dans la mise en page.
- Raccourcis de l'icône (manifeste, `vite.config.ts`) : Biberon, Tétée, Sommeil ; icônes `public/shortcut-*.png`. Le manifeste n'a qu'une langue (français). Pas de raccourcis sur iPhone.
- Traitements : le nombre de prises par jour = le nombre d'heures du traitement (pas de champ à part). Un traitement n'a plus d'option « à intervalle » ; un ancien traitement à intervalle reçoit des heures proposées à sa prochaine modification.
- Messages de statut (« Enregistré », erreurs) : garder la **clé** de traduction dans l'état, pas le texte traduit (sinon le message reste dans l'ancienne langue).
- Messages à l'équipe : EmailJS, modèle `VITE_EMAILJS_FEEDBACK_TEMPLATE_ID` (facultatif, voir README) ; 1 envoi par minute et par appareil.
- Couleurs des graphiques : variables `--chart-sleep`, `--chart-feeding`, `--chart-bottle` (index.css, version sombre dans `.dark`), validées avec le script de palette (daltonisme, contraste ≥ 3:1). Le texte ne prend jamais ces couleurs.
- Calendrier (.ics) : heures exactes (UTC) pour les rendez-vous, heures « flottantes » répétées pour les traitements ; seulement les rappels à heures fixes (un intervalle n'a pas d'heure de départ). Rien n'est envoyé par Bambino : c'est l'agenda du téléphone qui prévient.
- Arabe (§23) : `src/i18n/locales/ar.ts` doit avoir **exactement** les clés de `fr.ts` (test `locales.test.ts`). Un pluriel français `_one/_other` = six formes en arabe (`_zero`, `_one`, `_two`, `_few`, `_many`, `_other`). On s'adresse à la maman au féminin. Langue i18next `ar-MA` (chiffres 0-9). Classes Tailwind logiques (`ms-`, `pe-`, `start-`, `text-start`, `border-e`…) et `rtl:rotate-180` sur les flèches ; les graphiques (frise 24 h, croissance) restent en `dir="ltr"`.
- Français : espace insécable avant `? ! : ;` et à l'intérieur de `« »` dans `fr.ts` (sinon le signe peut se retrouver seul en début de ligne).

## 4. Avant de terminer une tâche (à repasser à chaque fois)

1. Relire la section 1 : aucune règle n'est enfreinte par le changement.
2. `npm run build` passe.
3. `npm run lint` : 0 erreur.
4. Si Firestore est touché : règle ajoutée dans `firestore.rules` et testée sur l'émulateur (cas autorisé **et** cas refusé, dont « un autre compte »).
5. Si l'interface est touchée : testée dans le navigateur (cas normal et cas d'erreur) ; textes dans `src/i18n/locales/`.
6. Aucun secret ni donnée personnelle ajoutés ; `.env.local` absent de `git status`.
7. Mettre à jour la section 5 ci-dessous : cocher uniquement ce qui a été vérifié, et noter ce qui reste à vérifier.
8. Dire clairement à l'équipe ce qui a été fait, ce qui a été vérifié et ce qui ne l'a pas été.

---

## 5. Avancement (cahier des charges = checklist)

Légende : `[x]` fait et vérifié · `[ ]` à faire · *(note)* = précision sur ce qui manque.
Dernière mise à jour : 22/10/2026 (PWA, thème sombre, écran entier, icônes, photo du bébé, PDF mis en page, planifications épinglées, chronomètre de tirage, aide à l'installation par appareil, interface arabe, guide de bienvenue, dernières fois, raccourcis, calendrier, Mon profil, chargement par page, prises par jour des traitements, profil maman, messages à l'équipe ; **mise en production le 22/10** : règles + site sur https://bambino-59127.web.app), branche `feat/socle` (**rien de commité depuis la phase 1 : le code en ligne n'est pas encore dans Git**).

### Phase 1 — Socle (§31 : environ 1 semaine)
- [x] Dépôt Git + GitHub, projet Vite + React + TypeScript
- [x] Dépendances de la phase 1 + Tailwind v4 *(build et lint OK)*
- [x] Arborescence `src/` et nettoyage du template
- [x] Conventions (`docs/conventions.md`), README (installation), cahier dans `docs/`
- [x] Type partagé `UserProfile` + `userRepository`
- [x] Inscription, connexion, déconnexion, mot de passe oublié *(testés dans le navigateur sur émulateur)*
- [x] Messages d'erreur compréhensibles, session conservée, redirection vers le tableau de bord *(testés sur émulateur)*
- [x] Règles Firestore `users/{userId}` *(9/9 cas testés sur émulateur)*
- [x] E-mail de bienvenue : logique §3.3 *(chemin « échec » vérifié : compte créé, `welcomeEmailSent` reste `false`)*
- [x] Projet Firebase `bambino-59127` créé : Spark, Firestore europe-west1, app Web *(vérifié via `firebase.json` et `.env.local`)*
- [x] Authentification e-mail/mot de passe activée dans la console *(1 compte créé sur le vrai Firebase le 21/10)*
- [x] `firebase init` → `firebase.json`, `.firebaserc`, `firestore.indexes.json` *(émulateur Firestore ajouté à la main ; émulateurs Auth + Firestore démarrent)*
- [x] `.env.local` rempli (Firebase + EmailJS) *(format vérifié sans afficher les valeurs)*
- [x] Règles déployées (`firebase deploy --only firestore:rules`) *(« Deploy complete! » sur bambino-59127)*
- [x] E-mail de bienvenue réellement reçu (EmailJS configuré) *(émulateur : `welcomeEmailSent: true` ; réception confirmée par l'équipe)*
- [x] Test de bout en bout sur le vrai Firebase *(inscription, e-mail de bienvenue, réinitialisation du mot de passe : confirmés par l'équipe le 21/10)*
- [x] Messages « vérifie ta boîte mail » après inscription (seulement si l'e-mail est parti) et « vérifie tes spams » après mot de passe oublié *(testés dans le navigateur sur émulateur, cas envoyé et cas échec)*
- [ ] Commit, push, pull request relue et fusionnée *(commit `0320626` poussé sur `origin/feat/socle` ; pull request vers `main` encore à créer)*

### Phase 2 — Suivi quotidien (P0)
Livraisons A à D faites le 21/10, **non commitées** (Git à la fin, à la demande de l'équipe). Règles publiées sur bambino-59127 le 21/10 (« Deploy complete! »).
- [x] Profils bébés : plusieurs bébés, avatar emoji (16 choix, 🐣 par défaut), couleur, âge calculé, bébé actif, archivage, suppression avec ses données (§4) ; page Bébés en carrousel avec dernière taille et dernier poids *(testés dans le navigateur sur émulateur)*
- [x] Tableau de bord réel (§16) : prénom de la maman, date du jour, bébé, séance en cours avec durée, bouton « + », rendez-vous épinglé, activités du jour, journal *(navigateur, refait le 22/10)*
- [x] Biberon (§6, revu le 22/10) : quantité bue + type de lait (infantile, maternel, maternel du stock), refus des négatifs, modification, suppression ; avec le stock : contenant obligatoire, quantité bue retirée par transaction, refus si stock insuffisant *(navigateur sur émulateur + 3 tests de saisie + tests de règles)*
- [x] Allaitement direct : segments, pause, changement de sein, reprise après fermeture, estimations, saisie manuelle (§7) *(navigateur + tests ; Wake Lock non testé sur vrai téléphone)*
- [x] Tirage et stock de lait avec transactions, refus si stock insuffisant, mise à l'écart (§8) *(navigateur + tests ; durées de conservation non affichées : à faire avec le guide sourcé)*
- [x] Chronomètre de tirage comme la tétée (22/10) : gauche / droit / les deux, pause, reprise après fermeture, « Terminer » → formulaire prérempli (début, côté, durée), annulation ; collection `pumpingSessions` *(navigateur sur émulateur : démarrage, pause, rechargement, carte de l'accueil, fin avec mise au stock, séance supprimée, annulation ; 4 tests de calcul + 4 tests de règles ; écran verrouillé sur vrai téléphone non testé)*
- [x] Sommeil : chronomètre, saisie manuelle, découpage à minuit (§9) *(navigateur + tests)*
- [x] Changement de couche (§10) *(navigateur)*
- [x] Historique : filtres type, période (dont « Aujourd'hui »), bébé ; modification et suppression avec confirmation (§16) *(navigateur)*
- [x] Historique en « Graphe 24 h » (revu le 22/10) : une carte par jour avec ses totaux (sommeil, tétées, biberons et ml, même calcul que le journal), rails sommeil / lait, repère « Maintenant », séances en cours hachurées, nuit coupée à minuit ; infobulle au toucher, au survol et au clavier (valeur d'abord, lien « Ouvrir »), ligne d'heure qui suit la souris, flèches ← → entre les marques, Échap ; légende qui masque ou affiche une activité ; jour vide en une ligne ; animation douce *(navigateur sur émulateur : téléphone et ordinateur, français et arabe, vraie souris ; 6 tests ; couleurs validées daltonisme/contraste en clair et en sombre)*
- [x] Journal du jour : chronologie, calendrier, résumé sans double comptage (§17) *(navigateur + tests)*
- [ ] Tests Vitest des calculs (durées, stock, résumé) + tests des règles sur l'émulateur *(105 tests de calcul et de traduction, 63 tests de règles ; tests sur vrai téléphone à faire)*

### Phase 3 — Journal et compléments (P1)
Faite le 21/10, **non commitée**. Règles publiées sur bambino-59127 (dernière publication vérifiée le 22/10 : « Deploy complete! »).
Non-régression du 22/10 (navigateur sur émulateur, chaque service : création, erreur, modification, suppression, vérification dans Firestore) : tout fonctionne ; corrigés au passage : ordre de l'historique d'un contenant, message d'historique vide, durées rondes (« 24 h »), filtre des rendez-vous conservé, ouverture d'un événement d'un autre bébé depuis l'historique.
- [x] Médicaments de la maman (côté bébé retiré : décision d'équipe du 21/10, écart au §11) : traitements (nom, instructions, heures, jours, dates), « prise effectuée », prise ponctuelle, historique, aucun calcul de dose (§11) *(navigateur + tests de règles)*
- [x] Hydratation (ajout en un geste, quantité facultative), repas, vitamines et compléments (§12) *(navigateur)*
- [x] Rendez-vous, collection unique avec `concerne`, affichés dans le journal du bébé et l'espace maman (§13) *(navigateur + tests de règles)*
- [x] Rappels enregistrés comme données, activables, sans aucun envoi (§14) *(navigateur + tests de règles)*
- [x] Espace « Maman » : vue séparée de sa journée (§17.1) *(navigateur)*

### Phase 4 — Croissance et rapports (P1)
- [x] Croissance + graphiques Recharts (§15) : poids, taille, périmètre crânien, mesures personnalisées ; une courbe par type ; depuis le tableau de bord et le profil ; aucune courbe de référence ni interprétation *(navigateur sur émulateur + 6 tests de règles + tests des calculs ; règles publiées le 22/10)*
- [x] Rapports PDF en français (jsPDF + AutoTable) + texte + partage Web Share (§18, mise en page revue le 22/10) : jour, semaine, mois, période personnalisée ; catégories ; graphiques de croissance ; message personnel ; télécharger, copier, partager ; rien n'est stocké *(tests + PDF relu + navigateur sur émulateur ; menu « Partager » d'un vrai téléphone non testé)*
- [x] Interface arabe RTL (§23) : traduction complète (mêmes clés que le français, pluriels arabes), sens de droite à gauche, chiffres 0-9 et mois marocains ; langue choisie à l'inscription ou dans Bébés → Application, gardée dans le compte ; PDF toujours en français *(navigateur sur émulateur : 24 pages sans texte français restant, aucun débordement à 375 px, menu à droite sur ordinateur ; 4 tests de traduction ; relecture par une arabophone à faire)*
- [x] Guide de bienvenue en 3 étapes (noter, suivre l'évolution, partager) après l'inscription, à lire ou à passer ; boutons, points, glissement du doigt, flèches du clavier ; case « Ne plus afficher ce guide » (gardée dans le compte) ; « Revoir le guide » dans Bébés *(navigateur sur émulateur, en arabe et en français, téléphone et ordinateur)*
- [x] Accueil : bloc repliable « Dernières fois » (tétée avec heure de début et dernier sein, biberon, réveil et durée du sommeil, couche, tirage ; « il y a … » mis à jour toutes les 30 s ; séances en cours exclues) *(navigateur sur émulateur + 4 tests)*
- [x] Profil maman (Bébés) : poids dans le temps avec courbe, prénom, taille, pense-bête, contacts utiles avec bouton « Appeler » ; visible par elle seule, aucun calcul *(navigateur sur émulateur : création, erreurs, modification, suppression ; 3 tests de règles + 1 pour le prénom ; données effacées avec le compte : 10 documents → 0)*
- [x] Traitements : « Combien de fois par jour ? » (une heure par prise), progression du jour (« 1 / 2 », pastilles d'heures), « C'est fait pour aujourd'hui », « Annuler la dernière prise » ; aussi sur l'accueil *(navigateur sur émulateur : 1 et 2 prises par jour, heures en double refusées ; 5 tests)*
- [x] « Une idée, une demande ? » (Bébés) : message à l'équipe par EmailJS, « des améliorations sont en cours de préparation », réponse seulement si la case est cochée, 1 envoi par minute *(navigateur : envoi intercepté et relu, erreur, délai ; modèle EmailJS créé par l'équipe le 22/10, `VITE_EMAILJS_FEEDBACK_TEMPLATE_ID` présent dans `.env.local` et dans le build (vérifié) ; si la variable manque, la carte le signale en développement ; réception d'un vrai message à confirmer par l'équipe)*
- [x] « Ajouter à mon calendrier » (.ics) sur un rendez-vous ou un rappel/traitement enregistré : alertes la veille et 1 h avant (rendez-vous), à l'heure (traitements), jours choisis et date de fin ; désactivé avec explication si passé, non prévu ou à intervalle *(navigateur : fichiers générés et relus ; 5 tests ; ouverture dans l'agenda d'un vrai téléphone non testée)*
- [x] Raccourcis de l'icône installée : Biberon, Tétée, Sommeil *(manifeste et icônes vérifiés dans le build ; appui long sur un vrai téléphone non testé)*
- [x] Chargement par page : 28 pages chargées à la demande, message « Réessayer » si une page ne peut pas se charger *(build : JavaScript de départ 1 223 Ko au lieu d'environ 1 340 Ko, le reste est surtout Firebase ; pages téléchargées à l'ouverture ; échec simulé)*
- [x] Après l'inscription : message « e-mail de confirmation envoyé » + rappel des spams (ou « n'a pas pu partir » si l'envoi échoue) ; rappel des spams après « mot de passe oublié » *(navigateur sur émulateur : les deux cas)*
- [x] Installation PWA : manifest, icônes (dont « maskable » et iPhone), interface en cache, bouton « Installer » ou marche à suivre selon l'appareil (iPhone/iPad : Partager puis « Sur l'écran d'accueil » ; Android ; ordinateur), affichée en haut de la connexion et de l'inscription, bandeau hors ligne ; nouvelle version : annonce en haut de l'écran sur toutes les pages, 20 s, bouton « Rafraîchir » (sinon installée à la prochaine ouverture), recherche de mise à jour toutes les 30 min et au retour sur l'application (§24) *(build servi en local : service worker actif, 24 fichiers en cache, l'app s'ouvre serveur coupé ; installation sur un vrai téléphone non testée, elle demande HTTPS → après `firebase deploy --only hosting`)*
- [x] Écran entier et responsive : téléphone (barre en bas), tablette et ordinateur (menu latéral, pages en colonnes) *(navigateur à 375, 768 et 1280 px, aucun débordement sur 12 pages)*
- [x] Thème sombre : Automatique / Clair / Sombre dans Bébés → Application *(navigateur)*
- [x] Accueil : planifications du jour (rendez-vous, traitements, rappels) épinglées dans un bloc repliable, masquables pour la journée *(navigateur + 3 tests)*
- [x] Icônes professionnelles à la place des emoji ; avatars en icônes ; photo du bébé facultative *(navigateur : aucun emoji sur 21 pages ; 2 tests de règles pour la photo)*
- [x] Rapport PDF mis en page : bandeau, photo du bébé, cartes de résumé avec icônes, tableau illustré, graphiques encadrés *(PDF généré dans le navigateur et relu)*
- [x] Suppression du compte (§3.4) : à côté de « Se déconnecter » ; confirmation par le mot SUPPRIMER + mot de passe (reconnexion récente exigée par Firebase) ; chaque bébé et toutes ses données, puis espace maman, rendez-vous, rappels, puis `users/{userId}`, puis le compte Auth ; données de l'appareil effacées *(navigateur sur émulateur : 13 documents → 0, compte Auth supprimé, autre compte intact ; erreurs « mauvais mot » et « mauvais mot de passe » sans rien supprimer ; 2 tests de règles)*

### Phase 5 — Guide documentaire (P1)
- [ ] Articles sourcés par tranche d'âge, lecture seule (§19)

### Phase 6 — Notifications (P2)
- [ ] Étude de faisabilité à 0 DH validée **avant** de commencer
- [ ] Rappels à heure fixe ou à intervalle, répétitions, report, arrêt (§20)
- [ ] Tests sur iOS et Android

### Phase 7 — Conformité et chatbot (P3)
- [ ] Politique de confidentialité, consentement explicite, loi 09-08 / CNDP, RGPD, lieu d'hébergement documenté (§21)
- [ ] Mini-chatbot RAG, seulement si un service gratuit existe (§22)

### Phase 8 — Finalisation
- [ ] Tests, corrections, déploiement Firebase Hosting, documentation *(déploiement fait le 22/10 ; tests sur vrai téléphone, guide d'utilisation et liste des limites restent à faire)*

### Critères d'acceptation (§32)
- [x] Création de compte, connexion, un seul e-mail de bienvenue reçu *(vérifié sur le vrai Firebase le 21/10)*
- [x] Plusieurs bébés avec emoji ; données invisibles depuis un autre compte *(navigateur sur émulateur + tests de règles)*
- [x] Biberon enregistré avec ses quantités *(navigateur sur émulateur)*
- [ ] Tétée correcte après 2 minutes téléphone verrouillé *(logique testée ; à vérifier sur vrai téléphone)*
- [x] Tétée reprise après fermeture et réouverture de l'application *(navigateur)*
- [x] Changements de sein sans double comptage *(navigateur + tests)*
- [x] Stock mis à jour après utilisation ; refus si stock insuffisant *(navigateur + émulateur)*
- [x] Sommeil traversant minuit réparti sur deux dates *(navigateur + tests)*
- [x] Modifications et suppressions reflétées dans le journal *(navigateur)*
- [x] Résumé du jour sans double comptage *(tests + navigateur)*
- [ ] PDF français lisible ; partage via le menu du téléphone *(PDF : vérifié ; partage : à tester sur un vrai téléphone)*
- [x] Interface arabe correcte en RTL *(navigateur sur émulateur ; à revoir sur un vrai téléphone et par une arabophone)*
- [x] Suppression de compte : plus aucune donnée dans Firestore *(émulateur ; règles publiées le 22/10, à refaire une fois sur le vrai Firebase avec un compte de test)*

### Livrables (§34)
- [ ] Code source sur GitHub *(phase 1 poussée sur la branche `feat/socle`, pas encore fusionnée dans `main`)*
- [x] PWA déployée sur Firebase Hosting *(22/10 : https://bambino-59127.web.app ; page de connexion, manifeste avec raccourcis, service worker actif (104 fichiers en cache), aucune erreur dans la console ; connexion avec un vrai compte et installation sur téléphone à faire par l'équipe)*
- [ ] Configuration Firebase et EmailJS documentée
- [x] Modèle de données documenté *(docs/modele-donnees.md)*
- [ ] Règles de sécurité testées *(63 tests automatisés, toutes les collections actuelles : `npm run test:rules`)*
- [ ] Tests automatisés essentiels *(en cours : calculs + règles ; parcours Playwright plus tard)*
- [x] Guide d'installation et de développement *(README)*
- [ ] Guide d'utilisation
- [ ] Guide documentaire sourcé
- [ ] Notifications, conformité, chatbot (si réalisés)
- [ ] Liste des limites connues et des dépendances externes

### Répartition (§29, indicative)
| Module | Responsable |
|---|---|
| Socle, Firebase, authentification, e-mail | Joska |
| Mise en page, navigation, tableau de bord | Imaska |
| Profils bébés | Imaska |
| Biberon, tirage et stock de lait | Joska |
| Allaitement, sommeil | Imaska |
| Couches, historique, journal, calendrier | Joska |
| Services maman, médicaments, rendez-vous, rappels | Imaska |
| Croissance, graphiques, rapports PDF | Joska |
| Traduction arabe, PWA | Imaska |
| Règles de sécurité, suppression de compte | Joska |
| Guide documentaire | Les deux |
