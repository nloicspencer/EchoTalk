import { useEffect, useState } from 'react';
import {
  addDoc, collection, doc, limit, onSnapshot, orderBy, query,
  serverTimestamp, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Notification, NotificationType } from '../types';

function convertNotification(id: string, data: Record<string, unknown>): Notification {
  return {
    id,
    destinataireId: data.destinataireId as string,
    type: data.type as NotificationType,
    expediteurId: (data.expediteurId as string) || undefined,
    expediteurPseudo: (data.expediteurPseudo as string) || undefined,
    echoId: (data.echoId as string) || undefined,
    contenuApercu: (data.contenuApercu as string) || undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    lu: data.lu === true,
  };
}

interface CreerNotificationParams {
  destinataireId: string;
  type: NotificationType;
  expediteurId?: string;
  expediteurPseudo?: string;
  echoId?: string;
  contenuApercu?: string;
}

// Point d'entrée unique pour créer une notification — appelé depuis
// useReactions.ts (jarres, cœurs) et useEchos.ts (EchoRep). On ne notifie
// jamais quelqu'un de sa propre action (réagir à son propre écho, par
// exemple), donc on court-circuite silencieusement dans ce cas plutôt que
// de laisser chaque appelant vérifier lui-même.
export async function creerNotification(params: CreerNotificationParams) {
  if (params.expediteurId && params.expediteurId === params.destinataireId) return;
  await addDoc(collection(db, 'notifications'), {
    destinataireId: params.destinataireId,
    type: params.type,
    expediteurId: params.expediteurId ?? null,
    expediteurPseudo: params.expediteurPseudo ?? null,
    echoId: params.echoId ?? null,
    contenuApercu: params.contenuApercu ? params.contenuApercu.slice(0, 140) : null,
    createdAt: serverTimestamp(),
    lu: false,
  });
}

const LIMITE_PAGE = 50;

// Liste complète (NotificationsPage.tsx) — les 50 plus récentes, en direct.
export function useNotifications(uid: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErreur('');
    const q = query(
      collection(db, 'notifications'),
      where('destinataireId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(LIMITE_PAGE)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(snap.docs.map((d) => convertNotification(d.id, d.data())));
        setLoading(false);
      },
      (err) => {
        // Sans ce callback d'erreur, un souci Firestore (ex. index composite
        // manquant sur destinataireId+createdAt) échouait en silence : le
        // callback de succès n'était jamais rappelé, et la page restait
        // bloquée en "Chargement..." indéfiniment, sans aucun message.
        console.error('[useNotifications] erreur de lecture', err);
        setErreur(err.message || 'Impossible de charger les notifications pour le moment.');
        setLoading(false);
      }
    );
    return unsub;
  }, [uid]);

  const nonLues = notifications.filter((n) => !n.lu).length;

  const marquerCommeLue = async (notifId: string) => {
    await updateDoc(doc(db, 'notifications', notifId), { lu: true });
  };

  const marquerToutesCommeLues = async () => {
    const aMarquer = notifications.filter((n) => !n.lu);
    if (aMarquer.length === 0) return;
    const batch = writeBatch(db);
    aMarquer.forEach((n) => batch.update(doc(db, 'notifications', n.id), { lu: true }));
    await batch.commit();
  };

  return { notifications, loading, erreur, nonLues, marquerCommeLue, marquerToutesCommeLues };
}

// Compteur léger pour la cloche de NavBar.tsx : une requête `where(lu==false)`
// dont on ne garde que la taille, sans jamais charger le contenu des 50
// notifications — reste bon marché même affiché en permanence.
export function useCompteurNotificationsNonLues(uid: string | undefined) {
  const [nonLues, setNonLues] = useState(0);

  useEffect(() => {
    if (!uid) {
      setNonLues(0);
      return;
    }
    const q = query(
      collection(db, 'notifications'),
      where('destinataireId', '==', uid),
      where('lu', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => setNonLues(snap.size));
    return unsub;
  }, [uid]);

  return nonLues;
}
