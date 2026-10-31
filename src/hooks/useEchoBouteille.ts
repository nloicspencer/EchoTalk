import { useState, useEffect } from 'react';
import {
  collection, addDoc, onSnapshot, query, where,
  updateDoc, doc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { analyserContenu } from '../services/moderation';

// Tirage du destinataire CÔTÉ SERVEUR (31/10/2026) — l'appli crée la
// bouteille SANS destinataire, au statut « a_distribuer ». La Cloud
// Function modererEchoBouteille l'analyse avec l'IA, tire un destinataire
// au sort et le notifie (voir functions/src/index.ts). L'appli ne choisit
// plus jamais le destinataire et ne lit plus l'annuaire pour ça.

export interface EchoBouteille {
  id: string;
  expediteurId: string;
  expediteurPseudo: string;
  destinataireId: string | null;
  contenu: string;
  statut: 'a_distribuer' | 'envoyee' | 'en_attente_moderation' | 'validee' | 'supprimee';
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

  // Mise en attente (19/10/2026) : seulement pour des coordonnées
  // personnelles ou un contenu inapproprié. Un simple signal « mineur
  // possible » envoie normalement la bouteille, avec un signalement à
  // vérifier (plus bas).
  if (resultat.coordonnees || resultat.inapproprie) {
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

  const refEnvoyee = await addDoc(collection(db, 'echos_bouteille'), {
    expediteurId, expediteurPseudo,
    destinataireId: null, contenu,
    statut: 'a_distribuer',
    createdAt: serverTimestamp(), expiresAt: null, lu: false,
  });
  if (resultat.mineur || resultat.numeroDissimule) {
    await addDoc(collection(db, 'signalements'), {
      echoBouteilleId: refEnvoyee.id,
      auteurSignalementId: 'systeme',
      auteurContenuId: expediteurId,
      auteurContenuPseudo: expediteurPseudo,
      contenu, raison: 'Détecté automatiquement',
      raisonsAlgo: resultat.raisons,
      type: 'echo_bouteille', source: 'algorithme',
      statut: 'en_attente', createdAt: serverTimestamp(),
    });
  }
  // Destinataire et notification : gérés par le serveur, quelques secondes
  // plus tard.
  return 'envoyee';
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

// Validation par un modérateur d'une bouteille retenue : elle repasse en
// « a_distribuer » ; la Cloud Function distribuerEchoBouteilleValidee tire
// alors le destinataire et le notifie. `expediteurId` n'est plus utilisé
// (gardé pour ne pas modifier ModerationPage.tsx).
export async function validerEchoBouteille(bouteilleId: string, _expediteurId?: string) {
  await updateDoc(doc(db, 'echos_bouteille', bouteilleId), {
    statut: 'a_distribuer', destinataireId: null,
  });
}

export async function supprimerEchoBouteille(bouteilleId: string) {
  await updateDoc(doc(db, 'echos_bouteille', bouteilleId), { statut: 'supprimee' });
}
