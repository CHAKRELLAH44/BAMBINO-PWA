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

## Commandes
| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production dans `dist/` |
| `npm run lint` | vérification du code |
| `npm run emulators` | émulateurs Auth et Firestore |
| `firebase deploy --only firestore:rules` | publier les règles de sécurité |
