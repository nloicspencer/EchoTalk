import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import './LandingV0.css';

export default function LandingV0() {
  const [email, setEmail] = useState('');
  const [statut, setStatut] = useState<'idle' | 'loading' | 'ok' | 'erreur'>('idle');
  const [messageErreur, setMessageErreur] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailPropre = email.trim().toLowerCase();
    if (!emailPropre || !emailPropre.includes('@')) {
      setStatut('erreur');
      setMessageErreur('Merci de renseigner une adresse email valide.');
      return;
    }
    setStatut('loading');
    try {
      await setDoc(doc(db, 'preinscriptions', emailPropre), {
        email: emailPropre,
        createdAt: serverTimestamp(),
      });
      setStatut('ok');
    } catch {
      setStatut('erreur');
      setMessageErreur('Une erreur est survenue, réessayez dans un instant.');
    }
  };

  return (
    <div className="v0-page">
      <div className="v0-card">
        <div className="v0-logo">
          <svg width="48" height="60" viewBox="0 0 64 84" className="v0-logo-icon" aria-hidden="true">
            <rect x="20" y="6" width="24" height="8" rx="3" fill="none" stroke="#7B5EA7" strokeWidth="2"/>
            <rect x="10" y="20" width="44" height="56" rx="8" fill="none" stroke="#7B5EA7" strokeWidth="2"/>
            <path d="M10 48 Q22 40 32 48 Q42 56 54 48" fill="none" stroke="#7B5EA7" strokeWidth="1.5" opacity="0.5"/>
            <path d="M10 62 Q22 54 32 62 Q42 70 54 62" fill="none" stroke="#7B5EA7" strokeWidth="1" opacity="0.3"/>
            <circle cx="32" cy="34" r="5" fill="none" stroke="#7B5EA7" strokeWidth="1" opacity="0.4"/>
            <line x1="16" y1="14" x2="10" y2="20" stroke="#7B5EA7" strokeWidth="2" strokeLinecap="round"/>
            <line x1="48" y1="14" x2="54" y2="20" stroke="#7B5EA7" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <h1>Echo<em>Talk</em></h1>
        </div>

        <span className="v0-eyebrow">Accès privé — avant-première</span>

        <h2 className="v0-titre">Une place vous attend.<br />Mais elle est limitée.</h2>

        <p className="v0-texte">
          EchoTalk arrive : un espace pensé pour être entendu, pas pour être vu. Partagez ce que vous ressentez (joie, doute, tristesse, fierté, colère...), au moment où vous le ressentez, et trouvez un écho auprès d'autres personnes. Ni likes, ni followers, ni mise en scène de soi — seulement des expériences partagées, une résonance humaine et la transmission de ce que la vie nous apprend.
        </p>

        <p className="v0-texte v0-texte-accent">
          L'ouverture se fera en accès restreint, réservé en priorité aux personnes inscrites ici. Rejoignez la liste dès maintenant pour en faire partie.
        </p>

        {statut === 'ok' ? (
          <div className="v0-confirmation">
            <span className="v0-confirmation-icone">🫙</span>
            <p>C'est noté. Vous recevrez une invitation personnelle dès l'ouverture — restez à l'écoute.</p>
          </div>
        ) : (
          <form className="v0-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Votre adresse email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={statut === 'loading'}
              required
            />
            <button type="submit" disabled={statut === 'loading'}>
              {statut === 'loading' ? '...' : 'Réserver ma place'}
            </button>
          </form>
        )}

        {statut === 'erreur' && <p className="v0-erreur">{messageErreur}</p>}

        <p className="v0-note">Aucun spam. Un seul email, le jour de l'ouverture.</p>
      </div>
    </div>
  );
}
