import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import FilPage from './pages/FilPage';
import NavBar from './components/NavBar';
import SuspensionBanner from './SuspensionBanner';
import './App.css';

const ProfilPage = lazy(() => import('./pages/ProfilPage'));
const IdentitePage = lazy(() => import('./pages/IdentitePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ModerationPage = lazy(() => import('./pages/ModerationPage'));
const ModerationDetressePage = lazy(() => import('./pages/ModerationDetressePage'));
const DecouvertePage = lazy(() => import('./pages/DecouvertePage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));

function ChargementPage() {
  return (
    <div className="app-loading">
      <span>🫙</span>
      <p>EchoTalk</p>
    </div>
  );
}

function AppLayout() {
  return (
    <>
      <SuspensionBanner />
      <main className="app-main">
        <Suspense fallback={<ChargementPage />}>
          <Routes>
            <Route path="/" element={<FilPage />} />
            <Route path="/decouverte" element={<DecouvertePage />} />
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

function AppContent() {
  const { user, loading, messageDeconnexion } = useAuth();
  const [onboardingInfo, setOnboardingInfo] = useState<{ pseudo: string } | null>(null);

  if (loading) {
    return (
      <div className="app-loading">
        <span>🫙</span>
        <p>EchoTalk</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Banner visible même sur la page de connexion après déconnexion forcée */}
      {!user && messageDeconnexion && <SuspensionBanner />}

      {!user ? (
        <AuthPage onInscriptionComplete={(pseudo) => setOnboardingInfo({ pseudo })} />
      ) : onboardingInfo ? (
        <Suspense fallback={<ChargementPage />}>
          <OnboardingPage
            pseudo={onboardingInfo.pseudo}
            onTermine={() => setOnboardingInfo(null)}
          />
        </Suspense>
      ) : (
        <AppLayout />
      )}
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
