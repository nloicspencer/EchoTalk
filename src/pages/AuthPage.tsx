import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import './Auth.css';

type Etape = 'auth' | 'onboarding' | 'pseudo';

function calculerAge(dateNaissance: string): number {
  const naissance = new Date(dateNaissance);
  const aujourd = new Date();
  let age = aujourd.getFullYear() - naissance.getFullYear();
  const m = aujourd.getMonth() - naissance.getMonth();
  if (m < 0 || (m === 0 && aujourd.getDate() < naissance.getDate())) age--;
  return age;
}

const CARTES_ONBOARDING = [
  {
    icon: '🌊',
    titre: 'Bienvenue',
    texte: "EchoTalk est un espace de résonance humaine. Pas de popularité, pas de performance. Juste des expériences qui trouvent écho chez les autres.",
  },
  {
    icon: '☀️',
    titre: 'Les Échos',
    texte: "Une joie, une réussite, un doute, une épreuve, une découverte. Tout ce qui fait partie de ton expérience humaine a sa place ici. Partage ce qui mérite d'être entendu.",
  },
  {
    icon: '❤️',
    titre: 'Les réactions',
    texte: "Pas de likes. Trois façons d'être vraiment présent : un cœur pour résonner, un cœur brisé pour compatir, une jarre pour soutenir. Parce que certaines émotions méritent mieux qu'un chiffre.",
  },
  {
    icon: '✨',
    titre: 'La règle d\'or',
    texte: "Un esprit partagé grandit. Écris avec la bienveillance que tu aimerais recevoir.",
  },
];

export default function AuthPage() {
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion');
  const [etape, setEtape] = useState<Etape>('auth');

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
  const [pseudoAttribue, setPseudoAttribue] = useState('');

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
      setPseudoAttribue(profile.pseudo);
      setEtape('onboarding');
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

  // Écran onboarding
  if (etape === 'onboarding') {
    return (
      <div className="onboarding-page">
        <div className="onboarding-content">
          <div className="onboarding-header">
            <span>🫙</span>
            <h2>EchoTalk</h2>
          </div>
          {CARTES_ONBOARDING.map((carte, i) => (
            <div className="onboarding-carte" key={i}>
              <span className="onboarding-icon">{carte.icon}</span>
              <h3>{carte.titre}</h3>
              <p>{carte.texte}</p>
            </div>
          ))}
          <button className="btn-rejoindre" onClick={() => setEtape('pseudo')}>
            Je rejoins la communauté EchoTalk 🌊
          </button>
        </div>
      </div>
    );
  }

  // Écran pseudo attribué
  if (etape === 'pseudo') {
    return (
      <div className="auth-page">
        <div className="auth-card pseudo-card">
          <span className="pseudo-icon">🫙</span>
          <h2>Votre identité EchoTalk</h2>
          <p className="pseudo-label">Vous êtes désormais</p>
          <div className="pseudo-nom">{pseudoAttribue}</div>
          <p className="pseudo-note">
            Ce pseudonyme est votre seule identité visible sur EchoTalk.
            Votre nom, prénom et date de naissance restent strictement privés.
          </p>
          <button className="auth-submit" onClick={() => setEtape('auth')}>
            Accéder au fil 🌊
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🫙</span>
          <h1>EchoTalk</h1>
          <p className="auth-tagline">Le réseau social où chaque émotion trouve écho et soutien.</p>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'connexion' ? 'active' : ''} onClick={() => { setMode('connexion'); setErreur(''); }}>
            Connexion
          </button>
          <button className={mode === 'inscription' ? 'active' : ''} onClick={() => { setMode('inscription'); setErreur(''); }}>
            Inscription
          </button>
        </div>

        {mode === 'connexion' ? (
          <form onSubmit={handleConnexion} className="auth-form">
            <input type="email" placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} required />
            <div className="input-password">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" className="toggle-pwd" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
            {erreur && <p className="auth-erreur">{erreur}</p>}
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? '...' : 'Se connecter'}
            </button>
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
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe (6 caractères min)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button type="button" className="toggle-pwd" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
            <div className="input-password">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              <button type="button" className="toggle-pwd" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? '🙈' : '👁'}
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
