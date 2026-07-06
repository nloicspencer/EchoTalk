import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  const [civilite, setCivilite] = useState<'M.' | 'Mme' | 'Mlle' | ''>('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [majeur, setMajeur] = useState(false);
  const [attestation, setAttestation] = useState(false);
  const [erreur, setErreur] = useState('');
  const [erreurType, setErreurType] = useState<'normal' | 'suspension' | 'ban'>('normal');
  const [loading, setLoading] = useState(false);
  const { connexion, inscription } = useAuth();

  const handleConnexion = async (e: React.FormEvent) => {
    e.preventDefault(); setErreur(''); setErreurType('normal'); setLoading(true);
    try { await connexion(email, password); }
    catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('banni')) {
        setErreurType('ban'); setErreur(msg);
      } else if (msg.includes('suspendu')) {
        setErreurType('suspension'); setErreur(msg);
      } else {
        setErreurType('normal');
        setErreur(msg.includes('user-not-found') || msg.includes('invalid-credential')
          ? 'Email ou mot de passe incorrect' : 'Une erreur est survenue');
      }
    } finally { setLoading(false); }
  };

  const handleInscription = async (e: React.FormEvent) => {
    e.preventDefault(); setErreur(''); setErreurType('normal');
    if (calculerAge(dateNaissance) < 18) { setErreur('Vous devez avoir 18 ans ou plus pour rejoindre EchoTalk.'); return; }
    if (password !== confirmPassword) { setErreur('Les mots de passe ne correspondent pas.'); return; }
    if (!majeur || !attestation) { setErreur('Veuillez cocher les deux cases pour continuer.'); return; }
    setLoading(true);
    try {
      const profile = await inscription(email, password, prenom, nom, dateNaissance, civilite || 'nr');
      onInscriptionComplete(profile.pseudo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setErreur(msg.includes('email-already') ? 'Email déjà utilisé'
        : msg.includes('weak-password') ? 'Mot de passe trop faible (6 caractères min)'
        : 'Une erreur est survenue');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="48" height="60" viewBox="0 0 64 84" className="auth-logo-icon" aria-hidden="true">
            <rect x="20" y="6" width="24" height="8" rx="3" fill="none" stroke="#7B5EA7" strokeWidth="2"/>
            <rect x="10" y="20" width="44" height="56" rx="8" fill="none" stroke="#7B5EA7" strokeWidth="2"/>
            <path d="M10 48 Q22 40 32 48 Q42 56 54 48" fill="none" stroke="#7B5EA7" strokeWidth="1.5" opacity="0.5"/>
            <path d="M10 62 Q22 54 32 62 Q42 70 54 62" fill="none" stroke="#7B5EA7" strokeWidth="1" opacity="0.3"/>
            <circle cx="32" cy="34" r="5" fill="none" stroke="#7B5EA7" strokeWidth="1" opacity="0.4"/>
            <line x1="16" y1="14" x2="10" y2="20" stroke="#7B5EA7" strokeWidth="2" strokeLinecap="round"/>
            <line x1="48" y1="14" x2="54" y2="20" stroke="#7B5EA7" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <h1>Echo<em>Talk</em></h1>
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
              <button type="button" className="toggle-pwd" onClick={() => setShowPassword(!showPassword)}>
                <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
              </button>
            </div>
            {erreur && (
              <div className={`auth-erreur-bloc ${erreurType}`}>
                <i className={`ti ${erreurType === 'ban' ? 'ti-ban' : erreurType === 'suspension' ? 'ti-clock' : 'ti-alert-circle'}`} />
                <p>{erreur}</p>
              </div>
            )}
            <button type="submit" className="auth-submit" disabled={loading}>{loading ? '...' : 'Se connecter'}</button>
          </form>
        ) : (
          <form onSubmit={handleInscription} className="auth-form">

            {/* Civilité + Prénom + Nom */}
            <div className="auth-civilite-row">
              <div className="auth-civilite-group">
                {(['M.', 'Mme', 'Mlle'] as const).map(civ => (
                  <button
                    key={civ}
                    type="button"
                    className={`auth-civilite-btn ${civilite === civ ? 'active' : ''}`}
                    onClick={() => setCivilite(civ)}
                  >
                    {civ}
                  </button>
                ))}
              </div>
            </div>
            <div className="auth-row">
              <input type="text" placeholder="Prénom" value={prenom} onChange={e => setPrenom(e.target.value)} required />
              <input type="text" placeholder="Nom" value={nom} onChange={e => setNom(e.target.value)} required />
            </div>

            <label className="auth-label-small">Date de naissance</label>
            <input type="date" value={dateNaissance} onChange={e => setDateNaissance(e.target.value)} required max={new Date().toISOString().split('T')[0]} />

            <input type="email" placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} required />
            <div className="input-password">
              <input type={showPassword ? 'text' : 'password'} placeholder="Mot de passe (6 caractères min)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              <button type="button" className="toggle-pwd" onClick={() => setShowPassword(!showPassword)}>
                <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
              </button>
            </div>
            <div className="input-password">
              <input type={showConfirm ? 'text' : 'password'} placeholder="Confirmer le mot de passe" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              <button type="button" className="toggle-pwd" onClick={() => setShowConfirm(!showConfirm)}>
                <i className={`ti ${showConfirm ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
              </button>
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
