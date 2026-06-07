import { useState } from 'react';
import './Auth.css';

interface Props {
  pseudo: string;
  onTermine: () => void;
}

const CARTES = [
  {
    icon: '🌊',
    titre: 'Bienvenue',
    texte: "EchoTalk est un espace de résonance humaine. Juste des expériences qui trouvent écho chez les autres.",
  },
  {
    icon: '☀️',
    titre: 'Les Échos',
    texte: "Une joie, une réussite, un doute, une épreuve, une découverte. Tout ce qui fait partie de ton expérience humaine a sa place ici.",
  },
  {
    icon: '🫙',
    titre: 'Les réactions',
    texte: "Trois façons d'être vraiment présent : un cœur pour résonner, un cœur brisé pour compatir, une jarre pour soutenir.",
  },
  {
    icon: '✨',
    titre: 'La règle d\'or',
    texte: "Un esprit partagé grandit. Écris avec la bienveillance que tu aimerais recevoir.",
  },
];

export default function OnboardingPage({ pseudo, onTermine }: Props) {
  const [etape, setEtape] = useState<'pseudo' | 'onboarding'>('pseudo');

  if (etape === 'pseudo') {
    return (
      <div className="auth-page">
        <div className="auth-card pseudo-card">
          <span className="pseudo-icon">🫙</span>
          <h2>Votre identité EchoTalk</h2>
          <p className="pseudo-label">Vous êtes désormais</p>
          <div className="pseudo-nom">{pseudo}</div>
          <p className="pseudo-note">
            Ce pseudonyme est votre seule identité visible sur EchoTalk.
            Votre nom, prénom et date de naissance restent strictement privés.
          </p>
          <button className="auth-submit" onClick={() => setEtape('onboarding')}>
            Continuer 🌊
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-content">
        <div className="onboarding-header">
          <span>🫙</span>
          <h2>EchoTalk</h2>
        </div>
        {CARTES.map((carte, i) => (
          <div className="onboarding-carte" key={i}>
            <span className="onboarding-icon">{carte.icon}</span>
            <h3>{carte.titre}</h3>
            <p>{carte.texte}</p>
          </div>
        ))}
        <button className="btn-rejoindre" onClick={onTermine}>
          Je rejoins la communauté EchoTalk 🌊
        </button>
      </div>
    </div>
  );
}
