import { useState } from 'react';
import { Echo } from '../types';
import { reagir, useEchoReps, publierEchoRep, toggleEchoOuvert } from '../hooks/useEchos';
import { useAuth } from '../hooks/useAuth';
import './EchoCard.css';

interface Props {
  echo: Echo;
}

export default function EchoCard({ echo }: Props) {
  const [masquerReps, setMasquerReps] = useState(false);
  const [showRepForm, setShowRepForm] = useState(false);
  const [repContenu, setRepContenu] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const echoReps = useEchoReps(echo.id);
  const { profile } = useAuth();

  const estProprietaire = profile?.uid === echo.auteurId;
  const aDejaParticipe = echoReps.some(r => r.auteurId === profile?.uid);
  const placesRestantes = (echo.placesMax ?? 0) - (echo.placesOccupees ?? 0);
  const placesDispo = placesRestantes > 0;
  const reouverturesRestantes = echo.reouverturesRestantes ?? 0;

  // Peut ajouter une EchoRep si :
  // - écho ouvert et non expiré
  // - propriétaire : toujours (sans prendre de place)
  // - participant déjà inscrit : toujours (place déjà prise)
  // - nouveau participant : seulement si places disponibles
  const peutAjouterRep = echo.type === 'ouvert' && (echo.estOuvert ?? false) && (
    estProprietaire || aDejaParticipe || placesDispo
  );

  const tempsRestant = () => {
    if (!echo.expiresAt) return null;
    const diff = echo.expiresAt.getTime() - Date.now();
    if (diff <= 0) return 'Expiré';
    const jours = Math.floor(diff / (1000 * 60 * 60 * 24));
    const heures = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return jours > 0 ? `${jours}j ${heures}h` : `${heures}h`;
  };

  const handleReaction = async (type: 'jarresBleues' | 'coeurs' | 'coeursBrises') => {
    if (echo.estSolidaire) return;
    await reagir(echo.id, type, (echo[type] || 0) + 1);
  };

  const handlePublierRep = async () => {
    if (!repContenu.trim() || !profile) return;
    setLoading(true);
    setErreur('');
    try {
      await publierEchoRep(
        echo.id,
        profile.uid,
        profile.pseudo,
        repContenu,
        echo.placesOccupees ?? 0,
        echo.placesMax ?? 0,
        estProprietaire
      );
      setRepContenu('');
      setShowRepForm(false);
    } catch (err: unknown) {
      setErreur(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOuvert = async () => {
    try {
      await toggleEchoOuvert(echo.id, echo.estOuvert ?? true, reouverturesRestantes);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  };

  return (
    <div className={`echo-card ${echo.tonalite} ${echo.estSolidaire ? 'solidaire' : ''}`}>

      {/* En-tête */}
      <div className="echo-header">
        <span className="echo-pseudo">{echo.auteurPseudo}</span>
        <div className="echo-tags">
          <span className="tag">{echo.tonalite === 'soleil' ? '☀️' : '🌧️'}</span>
          <span className="tag">{echo.type === 'libre' ? '🕊️ Libre' : '🔓 Ouvert'}</span>
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
          <span className="reouvertures">↩️ {reouverturesRestantes} réouverture{reouverturesRestantes !== 1 ? 's' : ''} restante{reouverturesRestantes !== 1 ? 's' : ''}</span>
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
            <button className="reaction" onClick={() => handleReaction('jarresBleues')}>🫙 <span>{echo.jarresBleues || 0}</span></button>
            <button className="reaction" onClick={() => handleReaction('coeurs')}>❤️ <span>{echo.coeurs || 0}</span></button>
            <button className="reaction" onClick={() => handleReaction('coeursBrises')}>💔 <span>{echo.coeursBrises || 0}</span></button>
          </>
        )}
        {echo.type === 'ouvert' && echoReps.length > 0 && (
          <button className="reaction masquer-btn" onClick={() => setMasquerReps(!masquerReps)}>
            {masquerReps ? '👁 Voir' : '🙈 Masquer'}
          </button>
        )}
      </div>

      {/* Bouton fermer/rouvrir — propriétaire uniquement */}
      {estProprietaire && echo.type === 'ouvert' && (
        <button
          className={`btn-toggle-ouvert ${echo.estOuvert ? 'btn-fermer' : 'btn-rouvrir'}`}
          onClick={handleToggleOuvert}
          disabled={!echo.estOuvert && reouverturesRestantes <= 0}
        >
          {echo.estOuvert
            ? '🔒 Fermer cet écho'
            : reouverturesRestantes > 0
              ? `🔓 Rouvrir (${reouverturesRestantes} restante${reouverturesRestantes !== 1 ? 's' : ''})`
              : '🚫 Plus de réouvertures disponibles'
          }
        </button>
      )}

      {/* EchoReps */}
      {echo.type === 'ouvert' && !masquerReps && (
        <div className="echoreps">
          {echoReps.length > 0 && (
            <div className="echoreps-liste">
              {echoReps.map((rep) => (
                <div key={rep.id} className="echorep-item">
                  <span className="echorep-pseudo">{rep.auteurPseudo}</span>
                  <p className="echorep-contenu">{rep.contenu}</p>
                  <span className="echorep-date">
                    {rep.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire EchoRep */}
          {peutAjouterRep && (
            <div className="echorep-form">
              {!showRepForm ? (
                <button className="btn-add-rep" onClick={() => setShowRepForm(true)}>
                  💬 {estProprietaire
                    ? 'Répondre à votre écho'
                    : aDejaParticipe
                      ? 'Ajouter une EchoRep'
                      : `Rejoindre cet écho (${placesRestantes} place${placesRestantes !== 1 ? 's' : ''} restante${placesRestantes !== 1 ? 's' : ''})`
                  }
                </button>
              ) : (
                <div className="echorep-input">
                  <textarea
                    placeholder="Votre EchoRep..."
                    value={repContenu}
                    onChange={e => setRepContenu(e.target.value)}
                    rows={3}
                    autoFocus
                  />
                  {erreur && <p className="rep-erreur">{erreur}</p>}
                  <div className="echorep-actions">
                    <button onClick={() => { setShowRepForm(false); setErreur(''); }}>Annuler</button>
                    <button className="btn-publier-rep" onClick={handlePublierRep} disabled={!repContenu.trim() || loading}>
                      {loading ? '...' : 'Publier'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Places pleines pour un nouvel utilisateur */}
          {!peutAjouterRep && echo.estOuvert && !estProprietaire && !aDejaParticipe && !placesDispo && (
            <p className="places-pleines">🔒 Cet écho est complet</p>
          )}
        </div>
      )}

      {/* Date */}
      <span className="echo-date">
        {echo.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
