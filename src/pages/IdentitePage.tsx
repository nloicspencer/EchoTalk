import './IdentitePage.css';

const PILIERS = [
  {
    icon: '🕊️',
    titre: 'Anonymat choisi',
    texte: "Vous êtes un pseudonyme. Votre parole, libérée. Votre identité réelle reste strictement confidentielle — seul EchoTalk la connaît.",
  },
  {
    icon: '🌊',
    titre: 'Résonance',
    texte: "Ce qui compte, c'est ce que vous vivez et ce que vous partagez. Chaque écho a vocation à trouver un écho chez quelqu'un d'autre.",
  },
  {
    icon: '🫙',
    titre: 'Soutien humain',
    texte: "Des jarres, pas des chiffres. Du sens, pas de la performance. Trois façons d'être présent pour quelqu'un : soutenir, compatir, encourager.",
  },
  {
    icon: '🤝',
    titre: 'Entraide réelle',
    texte: "L'Écho Solidaire existe pour ceux qui traversent des moments difficiles. La communauté se mobilise. Ensemble, concrètement.",
  },
];

const VALEURS = [
  { icon: '👂', label: 'Écoute' },
  { icon: '🌊', label: 'Résonance' },
  { icon: '🤝', label: 'Bienveillance' },
  { icon: '💛', label: 'Entraide' },
  { icon: '✨', label: 'Authenticité' },
  { icon: '🕊️', label: 'Liberté de parole' },
];

export default function IdentitePage() {
  return (
    <div className="identite-page">

      {/* Accroche */}
      <div className="identite-accroche">
        <span className="identite-logo">🫙</span>
        <h1>EchoTalk</h1>
        <p className="identite-phrase">
          Un espace où chaque mot compte.<br />
          Chaque émotion résonne.<br />
          Chaque voix est entendue.
        </p>
      </div>

      {/* Ce qu'est EchoTalk */}
      <div className="identite-section identite-intro">
        <p>
          EchoTalk est un espace de résonance humaine. Un lieu pour partager ce qui vous traverse —
          joies, doutes, réussites, épreuves, réflexions. Sans filtre. Sans masque. Sans jugement.
        </p>
      </div>

      {/* Les 4 piliers */}
      <div className="identite-section">
        <h2>Nos piliers</h2>
        <div className="piliers-liste">
          {PILIERS.map((p, i) => (
            <div key={i} className="pilier-carte">
              <span className="pilier-icon">{p.icon}</span>
              <div>
                <h3>{p.titre}</h3>
                <p>{p.texte}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Philosophie */}
      <div className="identite-philosophie">
        <span className="philosophie-guillemet">❝</span>
        <p>Un esprit partagé grandit.</p>
      </div>

      {/* Valeurs */}
      <div className="identite-section">
        <h2>Nos valeurs</h2>
        <div className="valeurs-liste">
          {VALEURS.map((v, i) => (
            <div key={i} className="valeur-pill">
              <span>{v.icon}</span>
              <span>{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ce qu'EchoTalk propose */}
      <div className="identite-section identite-manifeste">
        <h2>Ce qu'EchoTalk vous propose</h2>
        <ul>
          <li>🕊️ Un pseudonyme généré automatiquement — votre seule identité publique</li>
          <li>🌊 Des Échos Libres — pour partager sans limite</li>
          <li>🔓 Des Échos Ouverts — pour échanger en petit groupe</li>
          <li>🫙 Des Jarres — pour soutenir ceux qui en ont besoin</li>
          <li>💛 Un Écho Solidaire — pour une entraide concrète</li>
          <li>✨ Une communauté fondée sur la résonance humaine</li>
        </ul>
      </div>


  {/* Rubrique explicative réactions et politique */}
  <div className="identite-section">
    <h2>🌊 Résonance et réactions</h2>
    <p style={{fontSize: '0.92rem', color: 'var(--text)', lineHeight: '1.8', marginBottom: '1rem'}}>
      Sur EchoTalk, les réactions ne mesurent pas la popularité. Elles expriment une présence humaine authentique.
    </p>
    <div className="reaction-explication">
      <div className="reaction-item">
        <span className="reaction-emoji">🫙</span>
        <div>
          <strong>Jarre Bleue</strong>
          <p>Soutien, empathie, encouragement. Offrir une jarre, c'est dire : je suis là, je t'entends.</p>
        </div>
      </div>
      <div className="reaction-item">
        <span className="reaction-emoji">❤️</span>
        <div>
          <strong>Cœur</strong>
          <p>Résonance. Cet écho touche quelque chose en moi. Je le ressens.</p>
        </div>
      </div>
      <div className="reaction-item">
        <span className="reaction-emoji">💔</span>
        <div>
          <strong>Cœur brisé</strong>
          <p>Compassion. Je ressens la douleur ou la difficulté partagée. Tu n'es pas seul.</p>
        </div>
      </div>
      <div className="reaction-item">
        <span className="reaction-emoji">🌸🫙</span>
        <div>
          <strong>Jarre Rose</strong>
          <p>Soutien solidaire. Réservée à l'Écho Solidaire du mois, elle contribue concrètement à aider.</p>
        </div>
      </div>
    </div>
  </div>

  {/* Politique EchoTalk */}
  <div className="identite-section">
    <h2>📋 Politique EchoTalk</h2>
    <div className="politique-liste">
      <div className="politique-item">
        <span>🕊️</span>
        <p>Votre identité réelle est strictement confidentielle. Seul votre pseudonyme est visible.</p>
      </div>
      <div className="politique-item">
        <span>🤝</span>
        <p>La bienveillance est la règle fondamentale. Chaque échange doit respecter la dignité de chacun.</p>
      </div>
      <div className="politique-item">
        <span>🛡️</span>
        <p>Une équipe de modération veille à la qualité des échanges. Tout contenu inapproprié peut être signalé.</p>
      </div>
      <div className="politique-item">
        <span>🌱</span>
        <p>EchoTalk accueille toute l'expérience humaine — joies, réussites, doutes, épreuves, apprentissages.</p>
      </div>
      <div className="politique-item">
        <span>💛</span>
        <p>L'Écho Solidaire est sélectionné et validé par l'équipe EchoTalk avant toute mise en avant.</p>
      </div>
    </div>
  </div>

      {/* Slogan final */}
      <div className="identite-slogan">
        <p>Le réseau social où chaque émotion trouve écho et soutien.</p>
      </div>

    </div>
  );
}
