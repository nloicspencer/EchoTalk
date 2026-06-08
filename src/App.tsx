import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import FilPage from './pages/FilPage';
import ProfilPage from './pages/ProfilPage';
import IdentitePage from './pages/IdentitePage';
import AdminPage from './pages/AdminPage';
import ModerationPage from './pages/ModerationPage';
import DecouvertePage from './pages/DecouvertePage';
import OnboardingPage from './pages/OnboardingPage';
import NavBar from './components/NavBar';
import './App.css';

function AppLayout() {
  return (
    <>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<FilPage />} />
          <Route path="/decouverte" element={<DecouvertePage />} />
          <Route path="/profil" element={<ProfilPage />} />
          <Route path="/identite" element={<IdentitePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/moderation" element={<ModerationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <NavBar />
    </>
  );
}

export default function App() {
  const { user, loading } = useAuth();
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
      {!user ? (
        <AuthPage onInscriptionComplete={(pseudo) => setOnboardingInfo({ pseudo })} />
      ) : onboardingInfo ? (
        <OnboardingPage
          pseudo={onboardingInfo.pseudo}
          onTermine={() => setOnboardingInfo(null)}
        />
      ) : (
        <AppLayout />
      )}
    </BrowserRouter>
  );
}
