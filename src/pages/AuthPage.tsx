import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import './Auth.css';

export default function AuthPage() {
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);
  const { connexion, inscription } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setLoading(true);
    try {
      if (mode === 'inscription') {
        await inscription(email, password);
      } else {
        await connexion(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue';
      setErreur(msg.includes('user-not-found') ? 'Compte introuvable' :
        msg.includes('wrong-password') ? 'Mot de passe incorrect' :
        msg.includes('email-already') ? 'Email déjà utilisé' :
        'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🫙</span>
          <h1>EchoTalk</h1>
          <p className="auth-tagline">Le réseau social où chaque émotion trouve écho et soutien.</p>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === 'connexion' ? 'active' : ''}
            onClick={() => setMode('connexion')}
          >
            Connexion
          </button>
          <button
            className={mode === 'inscription' ? 'active' : ''}
            onClick={() => setMode('inscription')}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {erreur && <p className="auth-erreur">{erreur}</p>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? '...' : mode === 'connexion' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        {mode === 'inscription' && (
          <p className="auth-note">
            Un pseudonyme vous sera attribué automatiquement. Votre identité reste privée.
          </p>
        )}
      </div>
    </div>
  );
}
