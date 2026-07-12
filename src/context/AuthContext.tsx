import {
  createContext, useContext, useEffect, useRef, useState, ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged, signInWithEmailAndPassword,
  signOut, User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { OISEAUX, UserProfile, VILLES } from '../types';
import { verifierSuspension } from '../hooks/useModeration';

function genererPseudo(): string {
  const oiseau = OISEAUX[Math.floor(Math.random() * OISEAUX.length)];
  const ville = VILLES[Math.floor(Math.random() * VILLES.length)];
  return `${oiseau} ${ville}`;
}

async function genererPseudoUnique(): Promise<string> {
  let pseudo = genererPseudo();
  let tentatives = 0;
  while (tentatives < 10) {
    const snap = await getDoc(doc(db, 'pseudos', pseudo));
    if (!snap.exists()) return pseudo;
    pseudo = genererPseudo();
    tentatives++;
  }
  return pseudo + Math.floor(Math.random() * 999);
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  inscription: (
    email: string, password: string, prenom: string, nom: string,
    dateNaissance: string, civilite?: string
  ) => Promise<UserProfile>;
  connexion: (email: string, password: string) => Promise<import('firebase/auth').UserCredential>;
  deconnexion: () => Promise<void>;
  suspension: { suspendu: boolean; banni: boolean; message: string };
  messageDeconnexion: string;
  effacerMessageDeconnexion: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Toute la logique d'authentification vit ici, dans UNE SEULE instance
// (montée une fois par <AuthProvider> dans App.tsx). Avant ce fix, chaque
// composant qui appelait useAuth() créait son propre listener Firebase et
// son propre état — d'où les messages de suspension perdus et le flash
// du Fil avant redirection (deux instances concurrentes, désynchronisées).
function useAuthState(): AuthContextValue {
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

        const demarrerSnapshot = (tentative = 0) => {
          const unsub = onSnapshot(userRef, async (snap) => {
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
          }, async (error) => {
            if (error.code === 'permission-denied' && tentative < 3) {
              try { await u.getIdToken(true); } catch {}
              setTimeout(() => demarrerSnapshot(tentative + 1), 500 * (tentative + 1));
            }
          });
          unsubUserRef.current = unsub;
        };

        demarrerSnapshot();
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
    await cred.user.getIdToken(true);
    const pseudo = await genererPseudoUnique();
    const newProfile: UserProfile = {
      uid: cred.user.uid, pseudo, createdAt: new Date(),
      echosPublies: 0, jarresBleuesRecues: 0, jarresBleuesPartagees: 0,
      coeursRecus: 0, stockJarresBleues: 15, stockJarresRoses: 0,
    };
    const docData = { ...newProfile, prenom, nom, dateNaissance, civilite, email, suspension: null };

    try {
      await setDoc(doc(db, 'users', cred.user.uid), docData);
      console.log('setDoc users réussi !');
    } catch (e) {
      console.error('setDoc users échoué :', e);
      throw e;
    }

    try {
      await setDoc(doc(db, 'pseudos', pseudo), { uid: cred.user.uid });
      console.log('setDoc pseudos réussi !');
    } catch (e) {
      console.error('setDoc pseudos échoué :', e);
    }

    try {
      await setDoc(doc(db, 'annuaire', cred.user.uid), {
        uid: cred.user.uid, banni: false,
      });
      console.log('setDoc annuaire réussi !');
    } catch (e) {
      console.error('setDoc annuaire échoué :', e);
    }

    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (snap.exists()) {
      setProfile(snap.data() as UserProfile);
    } else {
      setProfile(newProfile);
    }
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() doit être appelé à l\'intérieur de <AuthProvider>. Vérifie que App.tsx enveloppe bien l\'application.');
  }
  return ctx;
}
