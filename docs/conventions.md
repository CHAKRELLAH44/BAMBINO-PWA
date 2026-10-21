# Conventions de développement

## Git
- Jamais de commit directement sur `main`.
- Une branche par sujet : `feat/<module>`, `fix/<sujet>`, `chore/<sujet>`, `docs/<sujet>`.
- Messages de commit : `type: description` (ex. `feat(bottle): formulaire biberon`).
- Chaque pull request est relue par l'autre membre avant fusion.
- On ne modifie pas les mêmes fichiers en même temps sans se prévenir.

## Code
- Un module = un dossier `src/features/<module>/` (pages, schémas Zod, logique).
- Firestore uniquement via `src/services/repositories/`, jamais depuis une page.
- Types partagés dans `src/types/`.
- Aucun texte en dur dans l'interface : tout passe par `src/i18n/locales/`.
- Horodatages Firestore avec `serverTimestamp()`.
- Nouvelle sous-collection = nouvelle règle dans `firestore.rules`, testée sur l'émulateur.

## Budget et données
- 0 DH : pas de Cloud Functions, pas de Firebase Storage, aucun service payant.
- Données fictives uniquement tant que la conformité légale (P3) n'est pas faite.
- Aucune donnée personnelle dans les `console.log` ni dans les messages d'erreur.
