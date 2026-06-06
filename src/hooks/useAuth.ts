import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { auth, db, usersCollection } from '../services/firebase';
import { UserProfile, OISEAUX, VILLES } from '../types';

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const ref = doc(db, 'users', u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const inscription = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const pseudo = await genererPseudoUnique();
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      pseudo,
      createdAt: new Date(),
      echosPublies: 0,
      jarresBleuesRecues: 0,
      jarresBleuesPartagees: 0,
      coeursRecus: 0,
    };
    await setDoc(doc(db, 'users', cred.user.uid), newProfile);
    setProfile(newProfile);
    return newProfile;
  };

  const connexion = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const deconnexion = async () => {
    await signOut(auth);
    setProfile(null);
  };

  return { user, profile, loading, inscription, connexion, deconnexion };
}
