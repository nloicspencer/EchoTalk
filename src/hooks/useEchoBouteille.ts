import { useState, useEffect } from 'react';
import {
  collection, addDoc, onSnapshot, query, where, orderBy, limit,
  getDocs, updateDoc, doc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { analyserContenu } from '../services/moderation';

export interface EchoBouteille {
  id: string;
  expediteurId: string;
  expediteurPseudo: string;
  destinataireId: string | null;
  contenu: string;
  statut: 'envoyee' | 'en_attente_moderation' | 'validee' | 'supprimee';
  createdAt: Date;
  expiresAt: Date | null;
  lu: boolean;
}

export async function envoyerEchoBouteille(
  expediteurId: string,
  expediteurPseudo: string,
  contenu: string
): Promise<'envoyee' | 'en_attente_moderation'> {
  const resultat = analyserContenu(contenu);

  if (resultat.flagge) {
    const ref = await addDoc(collection(db, 'echos_bouteille'), {
      expediteurId, expediteurPseudo,
      destinataireId: null, contenu,
      statut: 'en_attente_moderation',
      createdAt: serverTimestamp(), expiresAt: null, lu: false,
    });
    await addDoc(collection(db, 'signalements'), {
      echoBouteilleId: ref.id,
      auteurSignalementId: 'systeme',
      auteurContenuId: expediteurId,
      auteurContenuPseudo: expediteurPseudo,
      contenu, raison: 'Détecté automatiquement',
      raisonsAlgo: resultat.raisons,
      type: 'echo_bouteille', source: 'algorithme',
      statut: 'en_attente', createdAt: serverTimestamp(),
    });
    return 'en_attente_moderation';
  }

  const destinataireId = await tirerDestinataireAleatoire(expediteurId);
  if (!destinataireId) throw new Error('Aucun autre utilisateur disponible pour le moment.');

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await addDoc(collection(db, 'echos_bouteille'), {
    expediteurId, expediteurPseudo, destinataireId, contenu,
    statut: 'envoyee',
    createdAt: serverTimestamp(), expiresAt, lu: false,
  });
  return 'envoyee';
}

// Fix v70 — lire depuis la collection publique "annuaire" (uid + banni)
// au lieu de "users" (protégé), pour que le tirage aléatoire fonctionne
// pour tous les comptes et pas seulement pour un admin/modérateur.
//
// Fix scalabilité — l'ancienne version lisait TOUTE la collection annuaire
// à chaque envoi (coûteux à grande échelle). Cette version utilise un
// champ `alea` (nombre aléatoire fixé une fois pour toutes à l'inscription,
// voir AuthContext.tsx) : on tire un nombre au hasard, et on demande à
// Firestore les documents dont `alea` est juste au-dessus (ou, si aucun,
// juste en-dessous) — ne coûte que quelques lectures, peu importe la
// taille de la collection.
//
// On demande 3 candidats (pas 1 seul) : Firestore n'autorisant qu'un seul
// champ en inégalité par requête, on ne peut pas filtrer "uid différent de
// l'expéditeur" directement dans la même requête que le tri sur `alea`.
// En retenant les 3 premiers résultats, il est extrêmement rare (sauf très
// petite base d'utilisateurs) que TOUS soient l'expéditeur lui-même — ce
// qui permet d'exclure l'expéditeur après coup, côté client, sans avoir
// besoin d'une seconde lecture dans l'immense majorité des cas.
//
// Le résultat perçu est strictement identique à avant : un destinataire
// choisi au hasard, jamais l'expéditeur, jamais un compte banni, jamais
// un compte qui n'existe plus (voir nettoyerAnnuaireSurSuppressionUser
// côté Cloud Functions).
async function tirerCandidat(
  expediteurId: string,
  seuil: number,
  sens: 'asc' | 'desc'
): Promise<string | null> {
  const operateur = sens === 'asc' ? '>=' : '<';
  const q = query(
    collection(db, 'annuaire'),
    where('banni', '==', false),
    where('alea', operateur, seuil),
    orderBy('alea', sens),
    limit(3)
  );
  const snap = await getDocs(q);
  const candidat = snap.docs.find(d => (d.data().uid || d.id) !== expediteurId);
  return candidat ? (candidat.data().uid || candidat.id) : null;
}

async function tirerDestinataireAleatoire(expediteurId: string): Promise<string | null> {
  const seuil = Math.random();
  // Essai dans un sens, puis dans l'autre si rien trouvé (cas où le nombre
  // tiré tombe après le dernier document, ou avant le premier).
  return (await tirerCandidat(expediteurId, seuil, 'asc'))
    ?? (await tirerCandidat(expediteurId, seuil, 'desc'));
}

export function useBouteillesRecues(destinataireId: string) {
  const [bouteilles, setBouteilles] = useState<EchoBouteille[]>([]);

  useEffect(() => {
    if (!destinataireId) return;
    const maintenant = new Date();
    const q = query(
      collection(db, 'echos_bouteille'),
      where('destinataireId', '==', destinataireId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map(d => {
          const data = d.data();
          return {
            id: d.id,
            expediteurId: data.expediteurId,
            expediteurPseudo: data.expediteurPseudo,
            destinataireId: data.destinataireId,
            contenu: data.contenu,
            statut: data.statut,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : null,
            lu: data.lu || false,
          } as EchoBouteille;
        })
        .filter(b => b.statut === 'envoyee' && b.expiresAt && b.expiresAt > maintenant)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setBouteilles(items);
    });
    return unsub;
  }, [destinataireId]);

  return bouteilles;
}

export async function marquerBouteilleVue(bouteilleId: string) {
  await updateDoc(doc(db, 'echos_bouteille', bouteilleId), { lu: true });
}

export async function signalerEchoBouteille(
  bouteilleId: string, expediteurId: string, expediteurPseudo: string,
  contenu: string, signaleurId: string
) {
  await addDoc(collection(db, 'signalements'), {
    echoBouteilleId: bouteilleId,
    auteurSignalementId: signaleurId,
    auteurContenuId: expediteurId,
    auteurContenuPseudo: expediteurPseudo,
    contenu, raison: 'Signalé par un utilisateur',
    type: 'echo_bouteille', source: 'utilisateur',
    statut: 'en_attente', createdAt: serverTimestamp(),
  });
}

export async function validerEchoBouteille(bouteilleId: string, expediteurId: string) {
  const destinataireId = await tirerDestinataireAleatoire(expediteurId);
  if (!destinataireId) throw new Error('Aucun destinataire disponible.');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await updateDoc(doc(db, 'echos_bouteille', bouteilleId), {
    destinataireId, statut: 'envoyee', expiresAt,
  });
}

export async function supprimerEchoBouteille(bouteilleId: string) {
  await updateDoc(doc(db, 'echos_bouteille', bouteilleId), { statut: 'supprimee' });
}
