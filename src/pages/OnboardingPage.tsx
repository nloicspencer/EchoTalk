import { useState } from 'react';
import './Auth.css';

interface Props {
  pseudo: string;
  onTermine: () => void;
}

const CARTES = [
  { icon: '🌊', titre: 'Bienvenue', texte: "EchoTalk est un espace de résonance humaine. Juste des expériences qui trouvent écho chez les autres." },
  { icon: '☀️', titre: 'Les Échos', texte: "Une joie, une réussite, un doute, une épreuve, une découverte. Tout ce qui fait partie de ton expérience humaine a sa place ici." },
  { icon: '✨', titre: 'Les réactions', texte: "Trois façons d'être vraiment présent : un cœur pour résonner, un cœur brisé pour compatir, une jarre pour soutenir." },
  { icon: '🤝', titre: "La règle d'or", texte: "Un esprit partagé grandit. Écris avec la bienveillance que tu aimerais recevoir." },
];

export default function OnboardingPage({ pseudo, onTermine }: Props) {
  const [etape, setEtape] = useState<'pseudo' | 'onboarding'>('pseudo');

  const JarreLogo = () => (
    <svg width="56" height="70" viewBox="0 0 64 84" aria-hidden="true" style={{display:'block', margin:'0 auto 0.75rem'}}>
      <rect x="20" y="6" width="24" height="8" rx="3" fill="none" stroke="#7B5EA7" strokeWidth="2"/>
      <rect x="10" y="20" width="44" height="56" rx="8" fill="none" stroke="#7B5EA7" strokeWidth="2"/>
      <path d="M10 48 Q22 40 32 48 Q42 56 54 48" fill="none" stroke="#7B5EA7" strokeWidth="1.5" opacity="0.5"/>
      <path d="M10 62 Q22 54 32 62 Q42 70 54 62" fill="none" stroke="#7B5EA7" strokeWidth="1" opacity="0.3"/>
      <circle cx="32" cy="34" r="5" fill="none" stroke="#7B5EA7" strokeWidth="1" opacity="0.4"/>
      <line x1="16" y1="14" x2="10" y2="20" stroke="#7B5EA7" strokeWidth="2" strokeLinecap="round"/>
      <line x1="48" y1="14" x2="54" y2="20" stroke="#7B5EA7" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  if (etape === 'pseudo') {
    return (
      <div className="auth-page">
        <div className="auth-card pseudo-card">
          <JarreLogo />
          <h2>Votre identité EchoTalk</h2>
          <p className="pseudo-label">Vous êtes désormais</p>
          <div className="pseudo-nom">{pseudo}</div>
          <p className="pseudo-note">Ce pseudonyme est votre seule identité visible sur EchoTalk. Votre nom, prénom et date de naissance restent strictement privés.</p>
          <button className="auth-submit" onClick={() => setEtape('onboarding')}>Continuer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-content">
        <div className="onboarding-header">
          <JarreLogo />
          <h2>EchoTalk</h2>
        </div>
        {CARTES.map((carte, i) => (
          <div className="onboarding-carte" key={i}>
            <span className="onboarding-icon">{carte.icon}</span>
            <h3>{carte.titre}</h3>
            <p>{carte.texte}</p>
          </div>
        ))}
        <button className="btn-rejoindre" onClick={onTermine}>Je rejoins la communauté EchoTalk</button>
      </div>
    </div>
  );
}
