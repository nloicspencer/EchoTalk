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

      {/* Slogan final */}
      <div className="identite-slogan">
        <p>Le réseau social où chaque émotion trouve écho et soutien.</p>
      </div>

    </div>
  );
}
