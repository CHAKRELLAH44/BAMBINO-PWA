# Bambino — PWA de suivi bébé

Application web progressive (React, TypeScript, Firebase) pour le suivi quotidien du bébé.
Cahier des charges et conventions : [docs/](docs/).

## Prérequis
- Node.js 22 ou plus
- Firebase CLI : `npm install -g firebase-tools`
- Java 21 ou plus (pour les émulateurs Firebase)

## Installation
1. `npm install`
2. Copier `.env.example` en `.env.local` et remplir les valeurs (console Firebase et EmailJS).
3. `firebase login`

## Lancer en local
- Terminal 1 : `npm run emulators`
- Terminal 2 : `npm run dev` puis ouvrir http://localhost:5173

Avec `VITE_USE_EMULATORS=true`, l'application utilise les émulateurs (données effacées à l'arrêt).

## Messages des utilisatrices (« Une idée, une demande ? »)
Section Bébés : le message part par EmailJS (gratuit, 200 e-mails par mois) vers l'adresse de l'équipe.
1. EmailJS → Email Templates → Create New Template.
2. **To Email** : l'adresse de l'équipe ; **Reply To** : `{{reply_to}}` ; **Subject** : `Bambino : {{kind}} de {{from_name}}`.
3. **Content** : `{{message}}` puis `Langue : {{language}} · Répondre à : {{reply_to}}` (vide si la maman ne veut pas de réponse).
4. Copier l'identifiant du modèle dans `.env.local` : `VITE_EMAILJS_FEEDBACK_TEMPLATE_ID=...`, puis relancer `npm run dev` (et refaire le build avant de déployer).

Sans cette variable, la section affiche « L'envoi des messages sera bientôt disponible ». L'adresse de l'équipe n'est jamais dans le code.

## Commandes
| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production dans `dist/` |
| `npm run lint` | vérification du code |
| `npm run emulators` | émulateurs Auth et Firestore |
| `npm test` | tests des calculs (âge, biberon…) |
| `npm run test:rules` | tests des règles de sécurité sur l'émulateur (Java 21+, émulateurs arrêtés) |
| `firebase deploy --only firestore:rules` | publier les règles de sécurité |
| `npm run build` puis `firebase deploy --only hosting` | mettre en ligne la PWA (HTTPS, installable) |
| `npm run build` puis `npx vite preview` | tester la PWA en local (le service worker n'existe pas avec `npm run dev`) |
