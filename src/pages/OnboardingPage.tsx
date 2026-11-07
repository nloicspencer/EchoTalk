import { useState } from 'react';
import './Auth.css';

interface Props {
  pseudo: string;
  onTermine: () => void;
}

// Accueil (révisé le 07/11/2026) : vouvoiement harmonisé avec le reste de
// l'appli, et ajout des règles de bienveillance concrètes (dont
// l'interdiction des coordonnées) et du rappel que l'appli n'est pas un
// service d'urgence.
const CARTES = [
  { icon: '🌊', titre: 'Bienvenue', texte: "EchoTalk est un espace de résonance humaine. Pas de likes, pas de course à la popularité : juste des expériences qui trouvent écho chez les autres." },
  { icon: '☀️', titre: 'Les Échos', texte: "Une joie, une réussite, un doute, une épreuve, une découverte. Tout ce qui fait partie de votre expérience humaine a sa place ici." },
  { icon: '✨', titre: 'Les réactions', texte: "Trois façons d'être vraiment présent : un cœur pour résonner, un cœur brisé pour compatir, une jarre pour soutenir." },
  { icon: '🤝', titre: "La règle d'or : un esprit partagé grandit", texte: "Écrivez avec la bienveillance que vous aimeriez recevoir. Pas de harcèlement, de haine ni de menace. Pour protéger l'anonymat de chacun, ne partagez jamais de coordonnées (téléphone, adresse, réseaux sociaux) : elles sont masquées automatiquement. Un contenu vous dérange ? Signalez-le, l'équipe de modération veille." },
  { icon: '🫶', titre: 'Si ça ne va pas', texte: "EchoTalk accueille toutes les émotions, même les plus lourdes. Mais ce n'est pas un service d'urgence : si vous êtes en danger, appelez le 112 ; si vous pensez au suicide, appelez le 3114, gratuit, 24 h/24." },
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
          <p className="pseudo-note">Ce pseudonyme est votre seule identité visible sur EchoTalk. Votre nom, prénom et date de naissance restent strictement privés. Pour préserver cet anonymat, ne publiez rien qui permettrait de vous reconnaître.</p>
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
