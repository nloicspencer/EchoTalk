import { useState, useEffect, useRef } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { auth, db, usersCollection } from '../services/firebase';
import { UserProfile, OISEAUX, VILLES } from '../types';
import { verifierSuspension } from './useModeration';

function genererPseudo(): string {
  const oiseau = OISEAUX[Math.floor(Math.random() * OISEAUX.length)];
  const ville = VILLES[Math.floor(Math.random() * VILLES.length)];
  return `${oiseau} ${ville}`;
}

async function genererPseudoUnique(): Promise<string> {
  let pseudo = genererPseudo();
  let tentatives = 0;
  while (tentatives < 10) {
    const q = query(usersCollection, where('pseudo', '==', pseudo));
    const snap = await getDocs(q);
    if (snap.empty) return pseudo;
    pseudo = genererPseudo();
    tentatives++;
  }
  return pseudo + Math.floor(Math.random() * 999);
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspension, setSuspension] = useState<{ suspendu: boolean; banni: boolean; message: string }>
    ({ suspendu: false, banni: false, message: '' });
  const [messageDeconnexion, setMessageDeconnexion] = useState('');
  const unsubUserRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (unsubUserRef.current) { unsubUserRef.current(); unsubUserRef.current = null; }
      setUser(u);
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        const unsubUser = onSnapshot(userRef, async (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as UserProfile & {
            suspension?: { type: string; jusqu: Date | { seconds: number } | null; banni: boolean; raison?: string }
          };
          const etat = verifierSuspension(data.suspension);
          if (etat.banni || etat.suspendu) {
            setMessageDeconnexion(etat.message);
            setSuspension(etat);
            setProfile(null);
            await signOut(auth);
            return;
          }
          setProfile(data);
          setSuspension({ suspendu: false, banni: false, message: '' });
        });
        unsubUserRef.current = unsubUser;
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => { unsubAuth(); if (unsubUserRef.current) unsubUserRef.current(); };
  }, []);

  const inscription = async (
    email: string, password: string, prenom: string, nom: string,
    dateNaissance: string, civilite: string = 'nr'
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const pseudo = await genererPseudoUnique();
    const newProfile: UserProfile = {
      uid: cred.user.uid, pseudo, createdAt: new Date(),
      echosPublies: 0, jarresBleuesRecues: 0, jarresBleuesPartagees: 0,
      coeursRecus: 0, stockJarresBleues: 15, stockJarresRoses: 0,
    };
    await setDoc(doc(db, 'users', cred.user.uid), {
      ...newProfile, prenom, nom, dateNaissance,
      civilite, // privé — jamais exposé publiquement
      suspension: null,
    });
    setProfile(newProfile);
    return newProfile;
  };

  const connexion = async (email: string, password: string) => {
    setMessageDeconnexion('');
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const ref = doc(db, 'users', cred.user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as { suspension?: { type: string; jusqu: Date | { seconds: number } | null; banni: boolean; raison?: string } };
      const etat = verifierSuspension(data.suspension);
      if (etat.banni || etat.suspendu) {
        await signOut(auth);
        throw new Error(etat.message);
      }
    }
    return cred;
  };

  const deconnexion = async () => {
    await signOut(auth);
    setProfile(null);
    setMessageDeconnexion('');
    setSuspension({ suspendu: false, banni: false, message: '' });
  };

  const effacerMessageDeconnexion = () => setMessageDeconnexion('');

  return { user, profile, loading, inscription, connexion, deconnexion, suspension, messageDeconnexion, effacerMessageDeconnexion };
}
