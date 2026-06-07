import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import FilPage from './pages/FilPage';
import ProfilPage from './pages/ProfilPage';
import IdentitePage from './pages/IdentitePage';
import DecouvertePage from './pages/DecouvertePage';
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <NavBar />
    </>
  );
}

export default function App() {
  const { user, loading } = useAuth();

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
      {user ? <AppLayout /> : <AuthPage />}
    </BrowserRouter>
  );
}
