Voici le cahier des charges complet pour le fil principal :



\---



\*\*CAHIER DES CHARGES — FIL PRINCIPAL ECHOTALK\*\*



\*\*Stack :\*\* React Native + Expo + TypeScript + Firebase + Firestore

\*\*Fichier concerné :\*\* `src/app/(tabs)/index.tsx`



\---



\*\*STRUCTURE VERTICALE DU FIL\*\*



1\. \*\*Bannière communautaire\*\*

Affiche le nombre de Jares partagées cette semaine par la communauté.

Format : `🫙 27 Jares partagées cette semaine par la communauté`

Donnée dynamique depuis Firestore (collection `stats/global`).



2\. \*\*Deux boutons côte à côte\*\*



\*\*🎯 Catégories\*\*

\- Ouvre une liste déroulante (bottom sheet)

\- Permet de filtrer le fil par thématique

\- Catégories : Famille, Couple, Amitié, Travail, Études, Santé, Voyage, Spiritualité, Culture, Solidarité, Société

\- L'utilisateur sélectionne une catégorie → le fil se filtre

\- Option "Tous les échos" pour réinitialiser

\- Le classement est automatique par algorithme, jamais choisi par l'utilisateur lors de la publication



\*\*❤️ Écho Solidaire du mois\*\*

\- Ouvre une modale en lecture seule

\- Contenu intégré manuellement chaque mois par l'équipe EchoTalk

\- Affiche : auteur (pseudonyme), texte de l'écho, émotion, nombre d'EchoRep

\- Pas d'interaction possible (lecture seule)

\- Données depuis Firestore (collection `echoSolidaire/current`)



3\. \*\*Zone de publication\*\* — ne pas modifier, déjà fonctionnelle



4\. \*\*Fil des échos\*\* — données réelles Firebase, ne pas modifier



\---



\*\*TYPES D'ÉCHOS\*\*



Chaque écho a 3 paramètres choisis à la publication :



| Paramètre | Option A | Option B |

|---|---|---|

| Tonalité | ☀️ Lumière | 🌧️ Nuage |

| Diffusion | 🌊 Libre | 🏡 Cercle |

| Interaction | 🤝 Ouvert | 🔒 Fermé |



\*\*Écho Libre\*\* : visible par toute la communauté

\*\*Écho Cercle\*\* : visible uniquement par un cercle restreint (3/5/8 participants, durée 1/3/6 jours, expiration automatique, réouverture max 3 fois)

\*\*Écho Ouvert\*\* : les autres peuvent répondre via EchoRep

\*\*Écho Fermé\*\* : pas de réponse possible



\---



\*\*INTERACTIONS SUR UN ÉCHO\*\*



\*\*Réactions\*\* (3 uniquement) :

\- ❤️ Résonance

\- 💔 Soutien

\- 🫙 Jare



\*\*EchoRep\*\* : réponse textuelle à un écho ouvert

\- Suggestions prédéfinies : "Je comprends", "Bravo", "Courage", "Je suis avec toi", "Merci"

\- Champ libre pour réponse personnalisée



\*\*Jares\*\* : équivalent d'un don émotionnel symbolique

\- Compteur visible sur chaque écho

\- Compteur global dans la bannière communautaire



\---



\*\*NAVIGATION\*\*



Barre de navigation basse — 4 onglets :

\- 🏠 Fil (`index.tsx`)

\- 🔍 Découverte (`decouverte.tsx`)

\- 👤 EchoProfil (`profil.tsx`)

\- 🌱 EchoTalk (`decouvrir.tsx`)



Visible uniquement après connexion (AuthGuard en place).



\---



\*\*IDENTITÉ UTILISATEUR\*\*



\- Pseudonyme généré automatiquement au format \*\*Oiseau + Lieu\*\* (ex: "Merle Lagune")

\- Pas de nom réel exposé

\- Vérification 18 ans à l'inscription uniquement



\---



\*\*FIRESTORE — COLLECTIONS CONCERNÉES\*\*



| Collection | Contenu |

|---|---|

| `echos` | Posts du fil avec type, tonalité, diffusion, interaction, expiration |

| `echos/{id}/echoreps` | Réponses aux échos ouverts |

| `users` | Profils, pseudonymes, stats |

| `stats/global` | Compteur Jares hebdomadaires |

| `echoSolidaire/current` | Écho Solidaire du mois en cours |



\---



\*\*CE QUI EST DÉJÀ FONCTIONNEL — NE PAS TOUCHER\*\*



\- Système de publication

\- Affichage des échos Firebase

\- Réactions ❤️ 💔 🫙

\- EchoRep avec suggestions

\- Cercles avec expiration et réouverture

\- Puits communautaire

