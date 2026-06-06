# EchoTalk

> Le réseau social où chaque émotion trouve écho et soutien.

## Lancer en local

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur de développement
npm run dev
```

L'application sera disponible sur **http://localhost:5173**

## Structure

```
src/
  services/firebase.ts   → Config Firebase (1 seul fichier)
  types/index.ts         → Types TypeScript + constantes
  hooks/
    useAuth.ts           → Authentification + pseudonymes
    useEchos.ts          → Lecture/écriture des échos
  pages/
    AuthPage.tsx         → Connexion / Inscription
    FilPage.tsx          → Fil principal
  components/
    NavBar.tsx           → 4 onglets de navigation
    EchoCard.tsx         → Carte d'un écho
    PublierEcho.tsx      → Formulaire de publication
    EchoSolidaireModal   → Modal écho solidaire
```

## Variables d'environnement

Le fichier `.env` contient les clés Firebase. Ne jamais le commiter.

## Déployer sur Vercel

```bash
npm run build
# puis connecter le repo GitHub à Vercel
# ajouter les variables VITE_FIREBASE_* dans les settings Vercel
```
