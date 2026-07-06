import { useState, useEffect } from 'react';
import {
  onSnapshot, query, orderBy, where,
  addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, Timestamp, collection, getDocs, writeBatch,
} from 'firebase/firestore';
import { db, echosCollection } from '../services/firebase';
import { analyserEtSignaler, soumettreEchoRep } from './useModeration';
import { Echo, EchoType, Tonalite } from '../types';

function convertEcho(id: string, data: Record<string, unknown>): Echo {
  return {
    ...data, id,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
    suppressionAt: data.suppressionAt instanceof Timestamp ? data.suppressionAt.toDate() : undefined,
    reouverturesRestantes: data.reouverturesRestantes !== undefined ? data.reouverturesRestantes : 3,
  } as Echo;
}

export function useEchos() {
  const [echos, setEchos] = useState<Echo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(echosCollection, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const maintenant = Date.now();
      const heures24 = 24 * 60 * 60 * 1000;
      const echosFiltres = snap.docs
        .map((d) => convertEcho(d.id, d.data() as Record<string, unknown>))
        .filter(e => {
          if (e.masque) return false;
          if (e.supprime && e.suppressionAt) {
            const suppressionDate = e.suppressionAt instanceof Date ? e.suppressionAt : new Date(e.suppressionAt);
            if (!isNaN(suppressionDate.getTime())) {
              return maintenant - suppressionDate.getTime() < heures24;
            }
          }
          return true;
        });
      setEchos(echosFiltres);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { echos, loading };
}

export function useEchoSolidaire() {
  const [echoSolidaire, setEchoSolidaire] = useState<Echo | null>(null);
  useEffect(() => {
    const q = query(echosCollection, where('estSolidaire', '==', true), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, async (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data();
        const jusquau = data.solidaireJusquau instanceof Timestamp
          ? data.solidaireJusquau.toDate()
          : data.solidaireJusquau ? new Date(data.solidaireJusquau) : null;
        if (jusquau && new Date() > jusquau) {
          await updateDoc(doc(db, 'echos', d.id), { estSolidaire: false, solidaireTermineAt: new Date() });
          setEchoSolidaire(null);
        } else {
          setEchoSolidaire(convertEcho(d.id, data as Record<string, unknown>));
        }
      } else { setEchoSolidaire(null); }
    });
    return unsub;
  }, []);
  return echoSolidaire;
}

interface EchoRepBrute {
  id: string;
  auteurId: string;
  auteurPseudo: string;
  contenu: string;
  createdAt: Date;
  updatedAt?: Date;
  supprime?: boolean;
  modifie?: boolean;
  masque?: boolean;
  suppressionAt?: Date;
}

export function useEchoReps(echoId: string) {
  const [echoReps, setEchoReps] = useState<EchoRepBrute[]>([]);

  useEffect(() => {
    if (!echoId) return;
    const repsRef = collection(db, 'echos', echoId, 'echoreps');
    const q = query(repsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const maintenant = Date.now();
      const heures24 = 24 * 60 * 60 * 1000;
      const reps: EchoRepBrute[] = snap.docs
        .map((d): EchoRepBrute => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            auteurId: data.auteurId as string,
            auteurPseudo: data.auteurPseudo as string,
            contenu: data.contenu as string,
            supprime: data.supprime as boolean | undefined,
            modifie: data.modifie as boolean | undefined,
            masque: data.masque as boolean | undefined,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
            suppressionAt: data.suppressionAt
              ? new Date(
                  (data.suppressionAt as { seconds?: number }).seconds
                    ? (data.suppressionAt as { seconds: number }).seconds * 1000
                    : (data.suppressionAt as string | number | Date)
                )
              : undefined,
          };
        })
        .filter(r => {
          // Masquée par modération → invisible
          if (r.masque) return false;
          if (r.supprime && r.suppressionAt && r.contenu === 'EchoRep supprimée suite à un signalement.') {
            return maintenant - r.suppressionAt.getTime() < heures24;
          }
          return true;
        });
      setEchoReps(reps);
    });
    return unsub;
  }, [echoId]);

  return echoReps;
}

interface PublierEchoParams {
  contenu: string; auteurId: string; auteurPseudo: string;
  tonalite: Tonalite; type: EchoType; placesMax?: 3 | 6 | 8; periodicitéJours?: 2 | 6 | 10;
}

export async function publierEcho(params: PublierEchoParams) {
  const expiresAt = params.periodicitéJours
    ? new Date(Date.now() + params.periodicitéJours * 24 * 60 * 60 * 1000) : null;
  const echoRef = await addDoc(echosCollection, {
    contenu: params.contenu, auteurId: params.auteurId, auteurPseudo: params.auteurPseudo,
    tonalite: params.tonalite, type: params.type, categorie: 'general',
    createdAt: serverTimestamp(), jarresBleues: 0, coeurs: 0, coeursBrises: 0,
    estSolidaire: false, modifie: false, supprime: false, masque: false,
    ...(params.type === 'ouvert' && {
      placesMax: params.placesMax ?? 6, placesOccupees: 0,
      periodicitéJours: params.periodicitéJours ?? 6, ouvertureCount: 1,
      reouverturesRestantes: 3, estOuvert: true, expiresAt,
    }),
  });
  await analyserEtSignaler(echoRef.id, params.auteurId, params.auteurPseudo, params.contenu, 'echo');
  return echoRef;
}

export async function modifierEcho(echoId: string, nouveauContenu: string, createdAt: Date) {
  if (Date.now() - createdAt.getTime() > 24 * 60 * 60 * 1000) throw new Error('Le délai de modification de 24h est dépassé.');
  await updateDoc(doc(db, 'echos', echoId), { contenu: nouveauContenu, modifie: true, updatedAt: serverTimestamp() });
}

export async function supprimerEcho(echo: Echo) {
  const echoRef = doc(db, 'echos', echo.id);
  if (echo.type === 'ouvert') {
    const repsRef = collection(db, 'echos', echo.id, 'echoreps');
    const reps = await getDocs(repsRef);
    const nbReps = reps.docs.filter(d => !d.data().supprime).length;
    const batch = writeBatch(db);
    reps.docs.forEach(d => batch.delete(d.ref));
    batch.update(echoRef, {
      supprime: true,
      contenu: `Écho Ouvert supprimé par son auteur — ${nbReps} EchoRep${nbReps !== 1 ? 's' : ''} ${nbReps !== 1 ? 'avaient été partagés' : 'avait été partagé'}`,
      estOuvert: false,
      suppressionAt: serverTimestamp(),
    });
    await batch.commit();
  } else { await deleteDoc(echoRef); }
}

export async function publierEchoRep(
  echoId: string, auteurId: string, auteurPseudo: string, contenu: string,
  placesOccupees: number, placesMax: number, estProprietaire: boolean, echoContenu: string = ''
) {
  const repsRef = collection(db, 'echos', echoId, 'echoreps');
  const existing = await getDocs(query(repsRef, where('auteurId', '==', auteurId)));
  if (existing.empty && !estProprietaire && placesOccupees >= placesMax) {
    throw new Error('Plus de places disponibles dans cet écho');
  }
  if (estProprietaire) {
    await addDoc(repsRef, { auteurId, auteurPseudo, contenu, createdAt: serverTimestamp(), modifie: false, supprime: false });
  } else {
    await soumettreEchoRep(echoId, echoContenu, auteurId, auteurPseudo, contenu);
    throw new Error('VALIDATION_REQUISE');
  }
}

export async function modifierEchoRep(echoId: string, repId: string, nouveauContenu: string, createdAt: Date) {
  if (Date.now() - createdAt.getTime() > 60 * 60 * 1000) throw new Error('Le délai de modification de 60 minutes est dépassé.');
  await updateDoc(doc(db, 'echos', echoId, 'echoreps', repId), { contenu: nouveauContenu, modifie: true, updatedAt: serverTimestamp() });
}

export async function supprimerEchoRep(echoId: string, repId: string, auteurId: string, placesOccupees: number, estProprietaire: boolean) {
  const repsRef = collection(db, 'echos', echoId, 'echoreps');
  const autresReps = await getDocs(query(repsRef, where('auteurId', '==', auteurId)));
  const seulementCetteRep = autresReps.docs.length === 1;
  await updateDoc(doc(db, 'echos', echoId, 'echoreps', repId), { supprime: true, contenu: 'EchoRep supprimée par son auteur.' });
  if (seulementCetteRep && !estProprietaire) {
    await updateDoc(doc(db, 'echos', echoId), { placesOccupees: Math.max(0, placesOccupees - 1) });
  }
}

export async function toggleEchoOuvert(
  echoId: string, estOuvert: boolean, reouverturesRestantes: number, nouvellePeriodicite?: 2 | 6 | 10
) {
  if (estOuvert) {
    await updateDoc(doc(db, 'echos', echoId), { estOuvert: false, clotureManuellement: true });
    return;
  }
  if (reouverturesRestantes <= 0) throw new Error('Plus de réouvertures disponibles pour cet écho');
  const periodicitéJours = nouvellePeriodicite ?? 6;
  const expiresAt = new Date(Date.now() + periodicitéJours * 24 * 60 * 60 * 1000);
  await updateDoc(doc(db, 'echos', echoId), {
    estOuvert: true, reouverturesRestantes: reouverturesRestantes - 1,
    clotureManuellement: false, fermeAutomatiquement: false,
    periodicitéJours, expiresAt,
  });
}

// Constate qu'un écho ouvert a dépassé sa date d'expiration et le ferme
// automatiquement en base (sans consommer de réouverture, sans alerter l'auteur).
export async function fermerEchoExpire(echoId: string) {
  await updateDoc(doc(db, 'echos', echoId), {
    estOuvert: false, clotureManuellement: false, fermeAutomatiquement: true,
  });
}

export async function reagir(echoId: string, reaction: 'jarresBleues' | 'coeurs' | 'coeursBrises' | 'jarresRoses', valeur: number) {
  await updateDoc(doc(db, 'echos', echoId), { [reaction]: valeur });
}
