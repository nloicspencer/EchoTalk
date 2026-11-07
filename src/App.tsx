import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import NavBar from './components/NavBar';
import SuspensionBanner from './SuspensionBanner';
import { rafraichirPush } from './services/push';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './services/firebase';
import './App.css';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const FilPage = lazy(() => import('./pages/FilPage'));
const ProfilPage = lazy(() => import('./pages/ProfilPage'));
const IdentitePage = lazy(() => import('./pages/IdentitePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ModerationPage = lazy(() => import('./pages/ModerationPage'));
const ModerationDetressePage = lazy(() => import('./pages/ModerationDetressePage'));
const DecouvertePage = lazy(() => import('./pages/DecouvertePage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const VerificationEmailPage = lazy(() => import('./pages/VerificationEmailPage'));
const DesinscriptionPage = lazy(() => import('./pages/DesinscriptionPage'));
const ConfirmationEmailPage = lazy(() => import('./pages/ConfirmationEmailPage'));

function ChargementPage() {
  return (
    <div className="app-loading">
      <span>🫙</span>
      <p>EchoTalk</p>
    </div>
  );
}

function AppLayout() {
  // Notifications push (01/11/2026) : met à jour le jeton de cet appareil
  // à chaque ouverture, si la personne les a activées ici.
  const { user } = useAuth();
  useEffect(() => {
    if (user) rafraichirPush(user.uid);
  }, [user]);

  return (
    <>
      <SuspensionBanner />
      <main className="app-main">
        <Suspense fallback={<ChargementPage />}>
          <Routes>
            <Route path="/" element={<FilPage />} />
            <Route path="/decouverte" element={<DecouvertePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profil" element={<ProfilPage />} />
            <Route path="/identite" element={<IdentitePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/moderation" element={<ModerationPage />} />
            <Route path="/moderation-detresse" element={<ModerationDetressePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <NavBar />
    </>
  );
}

function AppContent({ basename }: { basename?: string }) {
  const { user, profile, loading, messageDeconnexion, emailVerifie } = useAuth();
  const [onboardingInfo, setOnboardingInfo] = useState<{ pseudo: string } | null>(null);
  const accueilAVoir = !!onboardingInfo
    || (profile as { accueilAVoir?: boolean } | null)?.accueilAVoir === true;
  const terminerAccueil = () => {
    setOnboardingInfo(null);
    if (user) {
      updateDoc(doc(db, 'users', user.uid), { accueilAVoir: false })
        .catch((err) => console.error('[Accueil] fin non enregistrée', err));
    }
  };

  // /test est réservé au compte admin (31/10/2026). Toute autre personne
  // connectée qui l'ouvre est renvoyée vers l'accueil. Tant que le profil
  // n'est pas chargé, on affiche l'écran de chargement plutôt que de
  // laisser entrevoir l'appli de test.
  const surTest = basename === '/test';
  const testAttenteProfil = surTest && !!user && !profile;
  const testRefuse = surTest && !!user && !!profile && profile.role !== 'admin';

  useEffect(() => {
    if (testRefuse) window.location.replace('/');
  }, [testRefuse]);

  if (loading || testAttenteProfil || testRefuse) {
    return (
      <div className="app-loading">
        <span>🫙</span>
        <p>EchoTalk</p>
      </div>
    );
  }

  return (
    <BrowserRouter basename={basename}>
      {!user && messageDeconnexion && <SuspensionBanner />}

      {!user ? (
        <Suspense fallback={<ChargementPage />}>
          <AuthPage onInscriptionComplete={(pseudo) => setOnboardingInfo({ pseudo })} />
        </Suspense>
      ) : !emailVerifie ? (
        // Adresse e-mail non confirmée (31/10/2026) : rien d'autre n'est
        // accessible. L'accueil s'affiche juste après la confirmation.
        <Suspense fallback={<ChargementPage />}>
          <VerificationEmailPage />
        </Suspense>
      ) : accueilAVoir ? (
        // Accueil (07/11/2026) : affiché à la PREMIÈRE entrée dans l'appli
        // après la confirmation de l'adresse, même si elle a lieu un autre
        // jour ou sur un autre appareil (champ accueilAVoir de la fiche,
        // écrit à l'inscription). Les comptes plus anciens n'ont pas ce
        // champ et ne le revoient pas.
        <Suspense fallback={<ChargementPage />}>
          <OnboardingPage
            pseudo={onboardingInfo?.pseudo || profile?.pseudo || ''}
            onTermine={terminerAccueil}
          />
        </Suspense>
      ) : (
        <AppLayout />
      )}
    </BrowserRouter>
  );
}

// Ouverture publique (1er novembre 2026) : la page de pré-inscription
// (V0) et l'accès /pionniers sont supprimés. Deux portes d'entrée :
//   - echotalk.fr       → l'appli, pour tout le monde
//   - echotalk.fr/test  → réservé au compte admin, suit VERSION_TEST
//                         (voir config/appVersion.ts) pour essayer une
//                         version avant de l'ouvrir au public
//
// Les anciennes adresses /pionniers (icônes d'écran d'accueil des
// pionniers, liens envoyés) sont redirigées vers l'accueil.
//
// Le `basename` de react-router fait que toutes les routes internes
// ("/", "/profil"...) se résolvent automatiquement sous /test.
export default function App() {
  const path = window.location.pathname;

  if (path.startsWith('/pionniers')) {
    window.location.replace('/');
    return null;
  }

  // Lien « Ne plus recevoir ce résumé » des e-mails (31/10/2026) :
  // accessible sans être connecté.
  if (path.startsWith('/desinscription')) {
    return (
      <Suspense fallback={<ChargementPage />}>
        <DesinscriptionPage />
      </Suspense>
    );
  }

  // Lien de confirmation de l'adresse e-mail (07/11/2026).
  if (path.startsWith('/verification')) {
    return (
      <AuthProvider>
        <Suspense fallback={<ChargementPage />}>
          <ConfirmationEmailPage />
        </Suspense>
      </AuthProvider>
    );
  }

  const basename = path.startsWith('/test') ? '/test' : undefined;

  return (
    <AuthProvider>
      <AppContent basename={basename} />
    </AuthProvider>
  );
}
