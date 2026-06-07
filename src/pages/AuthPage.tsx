import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import './Auth.css';

interface Props {
  onInscriptionComplete: (pseudo: string) => void;
}

function calculerAge(dateNaissance: string): number {
  const naissance = new Date(dateNaissance);
  const aujourd = new Date();
  let age = aujourd.getFullYear() - naissance.getFullYear();
  const m = aujourd.getMonth() - naissance.getMonth();
  if (m < 0 || (m === 0 && aujourd.getDate() < naissance.getDate())) age--;
  return age;
}

export default function AuthPage({ onInscriptionComplete }: Props) {
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [majeur, setMajeur] = useState(false);
  const [attestation, setAttestation] = useState(false);
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);

  const { connexion, inscription } = useAuth();

  const handleConnexion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setLoading(true);
    try {
      await connexion(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setErreur(
        msg.includes('user-not-found') || msg.includes('invalid-credential')
          ? 'Email ou mot de passe incorrect'
          : 'Une erreur est survenue'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    if (calculerAge(dateNaissance) < 18) {
      setErreur('Vous devez avoir 18 ans ou plus pour rejoindre EchoTalk.');
      return;
    }
    if (password !== confirmPassword) {
      setErreur('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!majeur || !attestation) {
      setErreur('Veuillez cocher les deux cases pour continuer.');
      return;
    }
    setLoading(true);
    try {
      const profile = await inscription(email, password, prenom, nom, dateNaissance);
      onInscriptionComplete(profile.pseudo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setErreur(
        msg.includes('email-already') ? 'Email déjà utilisé' :
        msg.includes('weak-password') ? 'Mot de passe trop faible (6 caractères min)' :
        'Une erreur est survenue'
      );
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
          <button className={mode === 'connexion' ? 'active' : ''} onClick={() => { setMode('connexion'); setErreur(''); }}>Connexion</button>
          <button className={mode === 'inscription' ? 'active' : ''} onClick={() => { setMode('inscription'); setErreur(''); }}>Inscription</button>
        </div>

        {mode === 'connexion' ? (
          <form onSubmit={handleConnexion} className="auth-form">
            <input type="email" placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} required />
            <div className="input-password">
              <input type={showPassword ? 'text' : 'password'} placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" className="toggle-pwd" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '🙈' : '👁'}</button>
            </div>
            {erreur && <p className="auth-erreur">{erreur}</p>}
            <button type="submit" className="auth-submit" disabled={loading}>{loading ? '...' : 'Se connecter'}</button>
          </form>
        ) : (
          <form onSubmit={handleInscription} className="auth-form">
            <div className="auth-row">
              <input type="text" placeholder="Prénom" value={prenom} onChange={e => setPrenom(e.target.value)} required />
              <input type="text" placeholder="Nom" value={nom} onChange={e => setNom(e.target.value)} required />
            </div>
            <label className="auth-label-small">Date de naissance</label>
            <input type="date" value={dateNaissance} onChange={e => setDateNaissance(e.target.value)} required max={new Date().toISOString().split('T')[0]} />
            <input type="email" placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} required />
            <div className="input-password">
              <input type={showPassword ? 'text' : 'password'} placeholder="Mot de passe (6 caractères min)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              <button type="button" className="toggle-pwd" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '🙈' : '👁'}</button>
            </div>
            <div className="input-password">
              <input type={showConfirm ? 'text' : 'password'} placeholder="Confirmer le mot de passe" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              <button type="button" className="toggle-pwd" onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? '🙈' : '👁'}</button>
            </div>
            <label className="auth-checkbox">
              <input type="checkbox" checked={majeur} onChange={e => setMajeur(e.target.checked)} />
              <span>J'ai 18 ans ou plus</span>
            </label>
            <label className="auth-checkbox">
              <input type="checkbox" checked={attestation} onChange={e => setAttestation(e.target.checked)} />
              <span>J'atteste que les informations renseignées sont exactes</span>
            </label>
            {erreur && <p className="auth-erreur">{erreur}</p>}
            <button type="submit" className="auth-submit" disabled={loading || !majeur || !attestation}>
              {loading ? 'Création du compte...' : 'Créer mon compte'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
