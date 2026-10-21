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
- Biberon : `reste = préparé − consommé` ; quantités négatives refusées ; alerte si consommé > préparé ; le reste n'est **jamais** présenté comme réutilisable.
- Stock de lait : toute utilisation passe par une **transaction Firestore** ; refus si la quantité dépasse le stock ; un contenant n'est jamais présenté comme utilisable par défaut.
- Sommeil : une période qui traverse minuit est répartie sur les deux dates ; une période sans `endAt` n'est jamais comptée comme définitive.
- Résumé du jour : un événement n'est **jamais compté deux fois** ; le volume bu au sein n'est jamais inventé.
- Le journal ne stocke rien : il lit les événements déjà enregistrés.

### Fonctionnement
- Les fonctions de suivi doivent marcher **sans notifications**. Avant P2, les rappels sont seulement enregistrés.
- Hors ligne en v1 : seule l'interface est en cache ; pas de promesse de saisie hors ligne.
- Horodatages enregistrés de façon uniforme (`serverTimestamp()` ou `Timestamp`), affichés dans le fuseau horaire de l'utilisatrice.
- Aucun texte en dur dans l'interface : tout passe par `src/i18n/locales/`. Le RTL arabe doit rester possible (`dir`).
- E-mail de bienvenue : un seul envoi, uniquement si `welcomeEmailSent == false`, sans nouvelle tentative en boucle.
- Suppression de compte : supprimer chaque sous-collection, puis `users/{userId}`, puis le compte Auth (et gérer la demande de reconnexion récente).

### Méthode de travail (§26, §29, §30)
- Petites parties : ne jamais générer toute l'application en une fois.
- Jamais de commit direct sur `main` : une branche, puis une pull request relue par l'autre membre.
- Ne pas modifier les mêmes fichiers que l'autre membre sans se coordonner.
- Les dossiers des phases futures restent vides jusqu'à leur développement.

---

## 2. Architecture (à respecter)

- `src/app/` : routeur, `App`, pages transverses (tableau de bord).
- `src/features/<module>/` : un dossier par module (pages, schémas Zod, logique). Modules prévus : auth, babies, bottle, breastfeeding, milk-stock, sleep, diaper, medications, mother-services, appointments, growth, daily-journal, reports, guide, notifications, chatbot.
- `src/services/firebase/` : initialisation (`auth`, `db`). `src/services/repositories/` : **seul** endroit qui appelle Firestore. `src/services/email/` : EmailJS.
- `src/types/` : types TypeScript partagés. `src/i18n/locales/` : traductions.
- Modèle de données : §27 du cahier. Types d'événements bébé : bottle, breastfeeding, milkPumping, sleep, diaper, babyMedication, chacun avec son schéma Zod.

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

---

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
Dernière mise à jour : 21/10/2026 (fin de la phase 1, avant la pull request), branche `feat/socle`.

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
- [ ] Commit, push, pull request relue et fusionnée

### Phase 2 — Suivi quotidien (P0)
- [ ] Profils bébés : plusieurs bébés, avatar emoji (12 à 20 choix, un par défaut), bébé actif, archivage (§4)
- [ ] Tableau de bord réel (§16)
- [ ] Biberon (§6)
- [ ] Allaitement direct : séances, segments, reprise après fermeture (§7)
- [ ] Tirage et stock de lait avec transactions (§8)
- [ ] Sommeil (§9)
- [ ] Changement de couche (§10)
- [ ] Historique : filtres, modification et suppression avec confirmation (§16)
- [ ] Journal du jour : chronologie, calendrier, résumé (§17)
- [ ] Tests Vitest des calculs (durées, stock, résumé) + tests des règles sur l'émulateur

### Phase 3 — Journal et compléments (P1)
- [ ] Médicaments maman et bébé (§11)
- [ ] Hydratation, repas, vitamines (§12)
- [ ] Rendez-vous, collection unique avec `concerne` (§13)
- [ ] Rappels enregistrés comme données, sans envoi (§14)

### Phase 4 — Croissance et rapports (P1)
- [ ] Croissance + graphiques Recharts (§15)
- [ ] Rapports PDF en français (jsPDF) + texte + partage Web Share (§18)
- [ ] Interface arabe RTL (§23)
- [ ] Installation PWA : manifest, icônes, cache (§24)
- [ ] Suppression du compte (§3.4)

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
- [ ] Tests, corrections, déploiement Firebase Hosting, documentation

### Critères d'acceptation (§32)
- [x] Création de compte, connexion, un seul e-mail de bienvenue reçu *(vérifié sur le vrai Firebase le 21/10)*
- [ ] Plusieurs bébés avec emoji ; données invisibles depuis un autre compte
- [ ] Biberon enregistré avec ses quantités
- [ ] Tétée correcte après 2 minutes téléphone verrouillé
- [ ] Tétée reprise après fermeture et réouverture de l'application
- [ ] Changements de sein sans double comptage
- [ ] Stock mis à jour après utilisation ; refus si stock insuffisant
- [ ] Sommeil traversant minuit réparti sur deux dates
- [ ] Modifications et suppressions reflétées dans le journal
- [ ] Résumé du jour sans double comptage
- [ ] PDF français lisible ; partage via le menu du téléphone
- [ ] Interface arabe correcte en RTL
- [ ] Suppression de compte : plus aucune donnée dans Firestore

### Livrables (§34)
- [ ] Code source sur GitHub *(dépôt créé ; code de la phase 1 pas encore poussé)*
- [ ] PWA déployée sur Firebase Hosting
- [ ] Configuration Firebase et EmailJS documentée
- [ ] Modèle de données documenté
- [ ] Règles de sécurité testées *(users : oui, sur émulateur ; tests automatisés à ajouter en phase 2)*
- [ ] Tests automatisés essentiels
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
