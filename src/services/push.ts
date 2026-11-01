import { getApp } from 'firebase/app';
import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Notifications push (01/11/2026) — via Firebase Cloud Messaging.
//
// Chaque appareil sur lequel la personne active les notifications reçoit
// un « jeton » (identifiant technique de l'appareil), rangé dans
// users/{uid}/push/{jeton}. La Cloud Function envoyerPushNotification
// envoie un push à tous ces appareils à chaque nouvelle notification.
// Le texte du push ne contient jamais de texte d'Écho ni de pseudonyme
// (il s'affiche sur l'écran verrouillé).
//
// Les push sont reçus par NOTRE service worker (public/sw.js), pas par
// celui que Firebase propose par défaut : on lui passe l'enregistrement
// existant.
//
// Clé Web Push publique (Firebase → Paramètres du projet → Cloud
// Messaging → Certificats Web Push). Publique par nature : elle peut
// figurer dans le code.
const CLE_VAPID = 'BFRnSGepPlouprlCsAWgzfmPNmJwe44c9KiiIDHAhXkMU8Ol6_FlPrtebW4VyAII9dnr20_QxWDLL97_33zizNI';

// Mémorise, sur CET appareil, que la personne a activé les push (et pour
// quel compte), pour rafraîchir le jeton à chaque ouverture.
const CLE_LOCALE = 'echotalk-push-uid';

function lireLocal(): string | null {
  try { return localStorage.getItem(CLE_LOCALE); } catch { return null; }
}
function ecrireLocal(valeur: string | null) {
  try {
    if (valeur) localStorage.setItem(CLE_LOCALE, valeur);
    else localStorage.removeItem(CLE_LOCALE);
  } catch { /* stockage indisponible : sans conséquence */ }
}

export function estIPhone(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function estInstallee(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export type EtatPush =
  | 'indisponible'      // navigateur sans push
  | 'iphone-a-installer' // iPhone : il faut d'abord l'icône sur l'écran d'accueil
  | 'refuse'            // la personne a bloqué les notifications
  | 'inactif'
  | 'actif';

export async function etatPush(uid: string): Promise<EtatPush> {
  const possible = 'serviceWorker' in navigator && 'Notification' in window && await isSupported().catch(() => false);
  if (!possible) return estIPhone() && !estInstallee() ? 'iphone-a-installer' : 'indisponible';
  if (Notification.permission === 'denied') return 'refuse';
  if (Notification.permission === 'granted' && lireLocal() === uid) return 'actif';
  return 'inactif';
}

async function obtenirJeton(): Promise<string> {
  const enregistrement = await navigator.serviceWorker.ready;
  return getToken(getMessaging(getApp()), { vapidKey: CLE_VAPID, serviceWorkerRegistration: enregistrement });
}

async function enregistrerJeton(uid: string, jeton: string) {
  await setDoc(doc(db, 'users', uid, 'push', jeton), {
    jeton,
    plateforme: estIPhone() ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : 'ordinateur',
    majAt: serverTimestamp(),
  });
}

// Demande l'autorisation (doit être appelé depuis un clic : iPhone l'exige).
export async function activerPush(uid: string): Promise<EtatPush> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'refuse' : 'inactif';
  const jeton = await obtenirJeton();
  await enregistrerJeton(uid, jeton);
  ecrireLocal(uid);
  return 'actif';
}

export async function desactiverPush(uid: string): Promise<EtatPush> {
  try {
    const jeton = await obtenirJeton();
    await deleteDoc(doc(db, 'users', uid, 'push', jeton));
    await deleteToken(getMessaging(getApp()));
  } catch (err) {
    console.warn('[push] désactivation incomplète', err);
  }
  ecrireLocal(null);
  return 'inactif';
}

// À chaque ouverture de l'appli : le jeton d'un appareil peut changer avec
// le temps ; on le remet à jour sans rien demander à la personne.
export async function rafraichirPush(uid: string) {
  try {
    if (lireLocal() !== uid) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!(await isSupported())) return;
    const jeton = await obtenirJeton();
    await enregistrerJeton(uid, jeton);
  } catch (err) {
    console.warn('[push] rafraîchissement impossible', err);
  }
}
