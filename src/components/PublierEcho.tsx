import { useState } from 'react';
import { publierEcho } from '../hooks/useEchos';
import { UserProfile, EchoType, Tonalite } from '../types';
import { FEATURES } from '../config/features';
import './PublierEcho.css';

interface Props {
  profile: UserProfile;
}

export default function PublierEcho({ profile }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [contenu, setContenu] = useState('');
  const [tonalite, setTonalite] = useState<Tonalite>('soleil');
  const [type, setType] = useState<EchoType>('libre');
  const [placesMax, setPlacesMax] = useState<3 | 6 | 8>(6);
  const [periodicite, setPeriodicite] = useState<2 | 6 | 10>(6);
  const [loading, setLoading] = useState(false);

  const handlePublier = async () => {
    if (!contenu.trim()) return;
    setLoading(true);
    try {
      // Sécurité : même si le state `type` avait pu glisser vers 'ouvert' par un
      // ancien état résiduel, on retombe toujours sur 'libre' tant que le flag
      // ECHO_OUVERT est désactivé.
      const typeEffectif: EchoType = FEATURES.ECHO_OUVERT ? type : 'libre';
      await publierEcho({
        contenu,
        auteurId: profile.uid,
        auteurPseudo: profile.pseudo,
        tonalite,
        type: typeEffectif,
        ...(typeEffectif === 'ouvert' && { placesMax, periodicitéJours: periodicite }),
      });
      setContenu('');
      setOuvert(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="publier-echo">
      {!ouvert ? (
        <button className="publier-trigger" onClick={() => setOuvert(true)}>
          <span className="publier-plus">＋</span>
          <span>Partage un écho...</span>
        </button>
      ) : (
        <div className="publier-form">
          <textarea
            placeholder="Partage un écho..."
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            rows={4}
            autoFocus
          />

          {/* Tonalité */}
          <div className="option-row">
            <label>Tonalité</label>
            <div className="toggle-group">
              <button className={tonalite === 'soleil' ? 'active' : ''} onClick={() => setTonalite('soleil')}>☀️ Soleil</button>
              <button className={tonalite === 'pluie' ? 'active' : ''} onClick={() => setTonalite('pluie')}>🌧️ Pluie</button>
            </div>
          </div>

          {/* Type — le choix Libre/Ouvert n'existe que si ECHO_OUVERT est activé */}
          {FEATURES.ECHO_OUVERT && (
            <div className="option-row">
              <label>Type</label>
              <div className="toggle-group">
                <button className={type === 'libre' ? 'active' : ''} onClick={() => setType('libre')}>🕊️ Libre</button>
                <button className={type === 'ouvert' ? 'active' : ''} onClick={() => setType('ouvert')}>🔓 Ouvert</button>
              </div>
            </div>
          )}

          {/* Options écho ouvert */}
          {FEATURES.ECHO_OUVERT && type === 'ouvert' && (
            <>
              <div className="option-row">
                <label>Participants</label>
                <div className="toggle-group">
                  {([3, 6, 8] as const).map((n) => (
                    <button key={n} className={placesMax === n ? 'active' : ''} onClick={() => setPlacesMax(n)}>{n}</button>
                  ))}
                </div>
              </div>
              <div className="option-row">
                <label>Durée</label>
                <div className="toggle-group">
                  {([2, 6, 10] as const).map((j) => (
                    <button key={j} className={periodicite === j ? 'active' : ''} onClick={() => setPeriodicite(j)}>{j} jours</button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="publier-actions">
            <button className="btn-annuler" onClick={() => setOuvert(false)}>Annuler</button>
            <button className="btn-publier" onClick={handlePublier} disabled={!contenu.trim() || loading}>
              {loading ? '...' : "Publier l'écho"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
