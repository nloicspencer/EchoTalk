import { useState } from 'react';
import { Echo } from '../types';
import { reagir } from '../hooks/useEchos';
import './EchoCard.css';

interface Props {
  echo: Echo;
}

export default function EchoCard({ echo }: Props) {
  const [masquerReps, setMasquerReps] = useState(false);

  const handleReaction = async (type: 'jarresBleues' | 'coeurs' | 'coeursBrises') => {
    if (echo.estSolidaire) return;
    await reagir(echo.id, type, (echo[type] || 0) + 1);
  };

  const tempsRestant = () => {
    if (!echo.expiresAt) return null;
    const diff = echo.expiresAt.getTime() - Date.now();
    if (diff <= 0) return 'Expiré';
    const jours = Math.floor(diff / (1000 * 60 * 60 * 24));
    const heures = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return jours > 0 ? `${jours}j ${heures}h` : `${heures}h`;
  };

  return (
    <div className={`echo-card ${echo.tonalite} ${echo.estSolidaire ? 'solidaire' : ''}`}>
      {/* En-tête */}
      <div className="echo-header">
        <span className="echo-pseudo">{echo.auteurPseudo}</span>
        <div className="echo-tags">
          <span className="tag tonalite">{echo.tonalite === 'soleil' ? '☀️' : '🌧️'}</span>
          <span className="tag">{echo.type === 'libre' ? '🕊️ Libre' : '🔓 Ouvert'}</span>
          {echo.categorie && echo.categorie !== 'tous' && (
            <span className="tag">{echo.categorie}</span>
          )}
          {echo.estSolidaire && <span className="tag solidaire-tag">💛 Solidaire</span>}
        </div>
      </div>

      {/* Infos écho ouvert */}
      {echo.type === 'ouvert' && (
        <div className="echo-ouvert-info">
          <span>👥 {echo.placesOccupees ?? 0}/{echo.placesMax} places</span>
          {tempsRestant() && <span>⏱ {tempsRestant()}</span>}
          <span className={`statut ${echo.estOuvert ? 'ouvert' : 'ferme'}`}>
            {echo.estOuvert ? '🔓 Ouvert' : '🔒 Fermé'}
          </span>
        </div>
      )}

      {/* Contenu */}
      <p className="echo-contenu">{echo.contenu}</p>

      {/* Réactions */}
      <div className="echo-reactions">
        {echo.estSolidaire ? (
          <button className="reaction solidaire-reaction" onClick={() => reagir(echo.id, 'jarresRoses', (echo.jarresRoses || 0) + 1)}>
            🫙 <span>{echo.jarresRoses || 0}</span>
          </button>
        ) : (
          <>
            <button className="reaction" onClick={() => handleReaction('jarresBleues')}>
              🫙 <span>{echo.jarresBleues || 0}</span>
            </button>
            <button className="reaction" onClick={() => handleReaction('coeurs')}>
              ❤️ <span>{echo.coeurs || 0}</span>
            </button>
            <button className="reaction" onClick={() => handleReaction('coeursBrises')}>
              💔 <span>{echo.coeursBrises || 0}</span>
            </button>
          </>
        )}

        {/* Bouton masquer EchoRep */}
        {echo.type === 'ouvert' && (
          <button
            className="reaction masquer-btn"
            onClick={() => setMasquerReps(!masquerReps)}
          >
            {masquerReps ? '👁 Voir les réponses' : '🙈 Masquer'}
          </button>
        )}
      </div>

      {/* Date */}
      <span className="echo-date">
        {echo.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
