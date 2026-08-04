import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Guard anti double-init
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// App Check — protège les points d'écriture publics (comme "preinscriptions",
// utilisé sans authentification depuis la page V0) contre les robots et
// scripts automatisés, via reCAPTCHA v3 exécuté en arrière-plan : invisible
// pour l'utilisateur, aucune case à cocher, aucune friction.
//
// En développement local, le jeton de débogage doit être activé : au premier
// lancement, un jeton s'affiche dans la console du navigateur — à copier
// dans Firebase Console → App Check → menu de l'app → "Manage debug token",
// sinon les requêtes locales seront rejetées une fois l'application stricte
// activée côté Firestore.
if (import.meta.env.DEV) {
  // @ts-expect-error — propriété globale attendue par le SDK App Check en mode debug
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LehjHUtAAAAAAt7p6wqEGwIRefFLIKYNS5AWcse'),
  isTokenAutoRefreshEnabled: true,
});

export const db = getFirestore(app);
export const auth = getAuth(app);
export const echosCollection = collection(db, 'echos');
export const usersCollection = collection(db, 'users');
