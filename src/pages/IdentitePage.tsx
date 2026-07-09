import JarreIcon from '../components/JarreIcon';
import { FEATURES } from '../config/features';
import './IdentitePage.css';

type FeatureKey = keyof typeof FEATURES;

const PILIERS: { icon: string; titre: string; texte: string; feature?: FeatureKey }[] = [
  { icon: '🕊️', titre: 'Anonymat choisi', texte: "Vous êtes un pseudonyme. Votre parole, libérée. Votre identité réelle reste strictement confidentielle — seul EchoTalk la connaît." },
  { icon: '🌊', titre: 'Résonance', texte: "Ce qui compte, c'est ce que vous vivez et ce que vous partagez. Chaque écho a vocation à trouver un écho chez quelqu'un d'autre." },
  { icon: '✨', titre: 'Soutien humain', texte: "Des jarres, pas des chiffres. Du sens, pas de la performance. Trois façons d'être présent pour quelqu'un : soutenir, compatir, encourager." },
  { icon: '🤝', titre: 'Entraide réelle', texte: "L'Écho Solidaire existe pour ceux qui traversent des moments difficiles. La communauté se mobilise. Ensemble, concrètement.", feature: 'ECHO_SOLIDAIRE' },
];

const VALEURS = [
  { icon: '👂', label: 'Écoute' },
  { icon: '🌊', label: 'Résonance' },
  { icon: '🤝', label: 'Bienveillance' },
  { icon: '💛', label: 'Entraide' },
  { icon: '✨', label: 'Authenticité' },
  { icon: '🕊️', label: 'Liberté de parole' },
];

const PROPOSITIONS: { texte: string; feature?: FeatureKey }[] = [
  { texte: '🕊️ Un pseudonyme généré automatiquement — votre seule identité publique' },
  { texte: '🌊 Des Échos Libres — pour partager sans limite' },
  { texte: '🔓 Des Échos Ouverts — pour échanger en petit groupe', feature: 'ECHO_OUVERT' },
  { texte: '💬 Un EchoRep — pour répondre à un Écho Ouvert', feature: 'ECHO_OUVERT' },
  { texte: '✨ Des Jarres — pour soutenir ceux qui en ont besoin' },
  { texte: '💛 Un Écho Solidaire — pour une entraide concrète', feature: 'ECHO_SOLIDAIRE' },
  { texte: '🍾 Un Écho-Bouteille — pour transmettre un message à un inconnu' },
  { texte: '📓 Un Écholègue — pour transmettre une leçon de vie à la communauté', feature: 'ECHOLEGUE' },
  { texte: '🤝 Une communauté fondée sur la résonance humaine' },
];

export default function IdentitePage() {
  const piliersVisibles = PILIERS.filter(p => !p.feature || FEATURES[p.feature]);
  const propositionsVisibles = PROPOSITIONS.filter(p => !p.feature || FEATURES[p.feature]);

  return (
    <div className="identite-page">

      <div className="identite-accroche">
        <svg width="48" height="60" viewBox="0 0 64 84" className="identite-logo" aria-hidden="true">
          <rect x="20" y="6" width="24" height="8" rx="3" fill="none" stroke="#7B5EA7" strokeWidth="2"/>
          <rect x="10" y="20" width="44" height="56" rx="8" fill="none" stroke="#7B5EA7" strokeWidth="2"/>
          <path d="M10 48 Q22 40 32 48 Q42 56 54 48" fill="none" stroke="#7B5EA7" strokeWidth="1.5" opacity="0.5"/>
          <path d="M10 62 Q22 54 32 62 Q42 70 54 62" fill="none" stroke="#7B5EA7" strokeWidth="1" opacity="0.3"/>
          <circle cx="32" cy="34" r="5" fill="none" stroke="#7B5EA7" strokeWidth="1" opacity="0.4"/>
          <line x1="16" y1="14" x2="10" y2="20" stroke="#7B5EA7" strokeWidth="2" strokeLinecap="round"/>
          <line x1="48" y1="14" x2="54" y2="20" stroke="#7B5EA7" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <h1>EchoTalk</h1>
        <p className="identite-phrase">Un espace où chaque mot compte.<br />Chaque émotion résonne.<br />Chaque voix est entendue.</p>
      </div>

      <div className="identite-section identite-intro">
        <p>EchoTalk est un espace de résonance humaine. Un lieu pour partager ce qui vous traverse — joies, doutes, réussites, épreuves, réflexions. Sans filtre. Sans masque. Sans jugement.</p>
      </div>

      <div className="identite-section">
        <h2>Nos piliers</h2>
        <div className="piliers-liste">
          {piliersVisibles.map((p, i) => (
            <div key={i} className="pilier-carte">
              <span className="pilier-icon">{p.icon}</span>
              <div><h3>{p.titre}</h3><p>{p.texte}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="identite-philosophie">
        <span className="philosophie-guillemet">❝</span>
        <p>Un esprit partagé grandit.</p>
      </div>

      <div className="identite-section">
        <h2>Nos valeurs</h2>
        <div className="valeurs-liste">
          {VALEURS.map((v, i) => (
            <div key={i} className="valeur-pill"><span>{v.icon}</span><span>{v.label}</span></div>
          ))}
        </div>
      </div>

      <div className="identite-section identite-manifeste">
        <h2>Ce qu'EchoTalk vous propose</h2>
        <ul>
          {propositionsVisibles.map((p, i) => (
            <li key={i}>{p.texte}</li>
          ))}
        </ul>
      </div>

      <div className="identite-section">
        <h2>Résonance et réactions</h2>
        <p style={{fontFamily:'var(--et-font-echo)', fontStyle:'italic', fontSize:'0.9rem', color:'var(--et-text-2)', lineHeight:'1.75', marginBottom:'1rem'}}>
          Sur EchoTalk, les réactions ne mesurent pas la popularité. Elles expriment une présence humaine authentique.
        </p>
        <div className="reaction-explication">
          <div className="reaction-item">
            <span className="reaction-emoji"><JarreIcon color="blue" size="m" /></span>
            <div><strong>Jarre Bleue</strong><p>Soutien, empathie, encouragement. Offrir une jarre, c'est dire : je suis là, je t'entends.</p></div>
          </div>
          <div className="reaction-item">
            <span className="reaction-emoji">❤️</span>
            <div><strong>Cœur</strong><p>Résonance. Cet écho touche quelque chose en moi. Je le ressens.</p></div>
          </div>
          <div className="reaction-item">
            <span className="reaction-emoji">💔</span>
            <div><strong>Cœur brisé</strong><p>Compassion. Je ressens la douleur ou la difficulté partagée. Tu n'es pas seul.</p></div>
          </div>
          {FEATURES.ECHO_SOLIDAIRE && (
            <div className="reaction-item">
              <span className="reaction-emoji"><JarreIcon color="rose" size="m" /></span>
              <div><strong>Jarre Rose</strong><p>Soutien solidaire. Réservée à l'Écho Solidaire du mois, elle contribue concrètement à aider.</p></div>
            </div>
          )}
        </div>
      </div>

      {/* Écho Solidaire */}
      {FEATURES.ECHO_SOLIDAIRE && (
        <div className="identite-section">
          <h2>💛 L'Écho Solidaire</h2>
          <p style={{fontFamily:'var(--et-font-echo)', fontStyle:'italic', fontSize:'0.9rem', color:'var(--et-text-2)', lineHeight:'1.75', marginBottom:'1rem'}}>
            Chaque mois, l'un de vous devient l'Écho Solidaire — choisi avec soin par l'équipe EchoTalk parmi les récits qui vous ont le plus touchés.
          </p>
          <div className="reaction-explication">
            <div className="reaction-item">
              <span className="reaction-emoji">✨</span>
              <div><strong>Sélection avec soin</strong><p>Pas un algorithme : l'équipe EchoTalk choisit chaque mois le récit qui mérite d'être porté, parfois même sans avoir fait beaucoup de bruit.</p></div>
            </div>
            <div className="reaction-item">
              <span className="reaction-emoji"><JarreIcon color="rose" size="m" /></span>
              <div><strong>Un geste concret</strong><p>Offrir une jarre rose, c'est dire : je suis là, concrètement. Gratuit, simple, mais réel.</p></div>
            </div>
            <div className="reaction-item">
              <span className="reaction-emoji">🤝</span>
              <div><strong>Une preuve tangible</strong><p>Pour celui qui la reçoit, chaque jarre est la preuve qu'il n'est pas seul ce mois-ci.</p></div>
            </div>
            <div className="reaction-item">
              <span className="reaction-emoji">🔄</span>
              <div><strong>Des rôles réversibles</strong><p>Ce mois-ci, c'est peut-être vous qu'on soutient. Le mois prochain, ce sera peut-être vous qui soutenez — sans savoir qui, mais en sachant que ça compte.</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Écho-Bouteille */}
      <div className="identite-section">
        <h2>🍾 L'Écho-Bouteille</h2>
        <p style={{fontFamily:'var(--et-font-echo)', fontStyle:'italic', fontSize:'0.9rem', color:'var(--et-text-2)', lineHeight:'1.75', marginBottom:'1rem'}}>
          Une pensée qui vous traverse, une leçon de vie, un conseil qu'on aurait aimé recevoir un jour — transmis à un inconnu, au hasard, sans savoir qui il touchera ni quand. Peut-être qu'il arrivera exactement le jour où quelqu'un en avait besoin. Peut-être qu'il lui donnera un peu de force, ou juste la preuve qu'il n'est pas seul à ressentir ça.
        </p>
        <div className="reaction-explication">
          <div className="reaction-item">
            <span className="reaction-emoji">✍️</span>
            <div><strong>Écrire</strong><p>Depuis votre EchoProfil, rédigez un message spontané et universel. Une pensée, une vérité, une invitation.</p></div>
          </div>
          <div className="reaction-item">
            <span className="reaction-emoji">🎲</span>
            <div><strong>Envoi aléatoire</strong><p>Votre message est attribué à un autre membre de la communauté, tiré au sort. Vous ne saurez jamais qui le reçoit.</p></div>
          </div>
          <div className="reaction-item">
            <span className="reaction-emoji">🤫</span>
            <div><strong>Anonymat total</strong><p>Le destinataire ne sait pas qui a envoyé le message. Aucune réponse possible. Juste une transmission.</p></div>
          </div>
          <div className="reaction-item">
            <span className="reaction-emoji">⏳</span>
            <div><strong>Éphémère</strong><p>Les bouteilles reçues disparaissent après 7 jours. Comme une vague qui passe.</p></div>
          </div>
        </div>
      </div>

      {/* Écholègue */}
      {FEATURES.ECHOLEGUE && (
        <div className="identite-section">
          <h2>📓 L'Écholègue</h2>
          <p style={{fontFamily:'var(--et-font-echo)', fontStyle:'italic', fontSize:'0.9rem', color:'var(--et-text-2)', lineHeight:'1.75', marginBottom:'1rem'}}>
            Une expérience de vie racontée, et la leçon qu'elle vous a laissée, transmise à toute la communauté.
          </p>
          <div className="reaction-explication">
            <div className="reaction-item">
              <span className="reaction-emoji">✍️</span>
              <div><strong>Récit et leçon</strong><p>Vous racontez une expérience réellement vécue, puis ce qu'elle vous a appris. Le vécu, et la sagesse qui en reste.</p></div>
            </div>
            <div className="reaction-item">
              <span className="reaction-emoji">📚</span>
              <div><strong>Bibliothèque permanente</strong><p>Chaque Écholègue publié rejoint une bibliothèque collective qui demeure dans le temps.</p></div>
            </div>
            <div className="reaction-item">
              <span className="reaction-emoji">🗞️</span>
              <div><strong>Sélection hebdomadaire</strong><p>Chaque semaine, jusqu'à trois Écholègues sont mis en lumière dans le Journal des Lègues.</p></div>
            </div>
            <div className="reaction-item">
              <span className="reaction-emoji">🤫</span>
              <div><strong>Anonymat</strong><p>Votre récit circule sans jamais révéler qui vous êtes. Seule l'expérience compte, pas son auteur.</p></div>
            </div>
          </div>
        </div>
      )}

      <div className="identite-section">
        <h2>Politique EchoTalk</h2>
        <div className="politique-liste">
          <div className="politique-item"><span>🕊️</span><p>Votre identité réelle est strictement confidentielle. Seul votre pseudonyme est visible.</p></div>
          <div className="politique-item"><span>🤝</span><p>La bienveillance est la règle fondamentale. Chaque échange doit respecter la dignité de chacun.</p></div>
          <div className="politique-item"><span>🛡️</span><p>Une équipe de modération veille à la qualité des échanges. Tout contenu inapproprié peut être signalé.</p></div>
          <div className="politique-item"><span>🌱</span><p>EchoTalk accueille toute l'expérience humaine — joies, réussites, doutes, épreuves, apprentissages.</p></div>
          {FEATURES.ECHO_SOLIDAIRE && (
            <div className="politique-item"><span>💛</span><p>L'Écho Solidaire est sélectionné et validé par l'équipe EchoTalk avant toute mise en avant.</p></div>
          )}
        </div>
      </div>

      <div className="identite-slogan">
        <p>Le réseau social où chaque émotion trouve écho et soutien.</p>
      </div>
    </div>
  );
}
