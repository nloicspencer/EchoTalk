import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import FilPage from './pages/FilPage';
import PlaceholderPage from './pages/PlaceholderPage';
import NavBar from './components/NavBar';
import './App.css';

function AppLayout() {
  return (
    <>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<FilPage />} />
          <Route path="/decouverte" element={
            <PlaceholderPage
              icon="🔍"
              titre="Découverte"
              description="Recherche d'échos par critères et groupes — bientôt disponible."
            />
          } />
          <Route path="/profil" element={
            <PlaceholderPage
              icon="👤"
              titre="EchoProfil"
              description="Vos statistiques, jarres partagées et reçues — bientôt disponible."
            />
          } />
          <Route path="/identite" element={
            <PlaceholderPage
              icon="💡"
              titre="Identité EchoTalk"
              description="L'esprit, les valeurs et l'image de l'application — bientôt disponible."
            />
          } />
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
