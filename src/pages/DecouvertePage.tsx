import { useState, useMemo } from 'react';
import { useEchosDecouverte } from '../hooks/useDecouverte';
import EchoCard from '../components/EchoCard';
import { FEATURES } from '../config/features';
import './DecouvertePage.css';

type FiltreType = 'tous' | 'libre' | 'ouvert';
type FiltreTonalite = 'tous' | 'soleil' | 'pluie';
type FiltreStatut = 'tous' | 'actif' | 'cloture';
type FiltreTemporalite = 'tous' | '48h' | '7j' | '14j';

export default function DecouvertePage() {
  const [recherche, setRecherche] = useState('');
  const [filtreType, setFiltreType] = useState<FiltreType>('tous');
  const [filtreTonalite, setFiltreTonalite] = useState<FiltreTonalite>('tous');
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>('tous');
  const [filtreTemporalite, setFiltreTemporalite] = useState<FiltreTemporalite>('tous');

  // Type, tonalité et période sont filtrés directement par Firestore (voir
  // useEchosDecouverte) — les "30 derniers" dépendent donc déjà des filtres
  // choisis. Le statut et la recherche texte restent appliqués ci-dessous,
  // sur la fenêtre déjà chargée.
  const { echos, loading, loadingMore, hasMore, chargerPlus } = useEchosDecouverte(
    FEATURES.ECHO_OUVERT ? filtreType : 'tous',
    filtreTonalite,
    filtreTemporalite
  );

  const resultats = useMemo(() => {
    return echos.filter(echo => {
      if (echo.supprime) return false;

      if (recherche.trim()) {
        const terme = recherche.toLowerCase();
        const contenu = (echo.contenu || '').toLowerCase();
        const pseudo = (echo.auteurPseudo || '').toLowerCase();
        if (!contenu.includes(terme) && !pseudo.includes(terme)) return false;
      }

      if (FEATURES.ECHO_OUVERT && filtreStatut === 'actif' && echo.type === 'ouvert' && !echo.estOuvert) return false;
      if (FEATURES.ECHO_OUVERT && filtreStatut === 'cloture' && echo.type === 'ouvert' && echo.estOuvert) return false;

      return true;
    });
  }, [echos, recherche, filtreStatut]);

  return (
    <div className="decouverte-page">

      <div className="decouverte-header">
        <h1>🔍 Découverte</h1>
        <p>Explore les échos de la communauté</p>
      </div>

      <div className="recherche-bar">
        <span className="recherche-icon">🔍</span>
        <input
          type="text"
          placeholder="Rechercher dans les échos..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
        />
        {recherche && <button className="recherche-clear" onClick={() => setRecherche('')}>✕</button>}
      </div>

      {/* Note : la recherche porte sur les échos déjà chargés (selon les
          filtres actifs), pas sur tout l'historique de la plateforme. */}
      {recherche && hasMore && (
        <p className="decouverte-note-recherche">
          La recherche porte sur les échos déjà chargés. Cliquez sur "Charger plus" en bas pour élargir la recherche.
        </p>
      )}

      <div className="filtres">
        {/* Type — n'existe que si Écho Ouvert est actif (sinon tous les échos sont Libres) */}
        {FEATURES.ECHO_OUVERT && (
          <div className="filtre-groupe">
            <span className="filtre-label">Type</span>
            <div className="filtre-pills">
              {(['tous', 'libre', 'ouvert'] as FiltreType[]).map(f => (
                <button key={f} className={`filtre-pill ${filtreType === f ? 'active' : ''}`} onClick={() => setFiltreType(f)}>
                  {f === 'tous' ? 'Tous' : f === 'libre' ? '🕊️ Libres' : '🔓 Ouverts'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tonalité */}
        <div className="filtre-groupe">
          <span className="filtre-label">Tonalité</span>
          <div className="filtre-pills">
            {(['tous', 'soleil', 'pluie'] as FiltreTonalite[]).map(f => (
              <button key={f} className={`filtre-pill ${filtreTonalite === f ? 'active' : ''}`} onClick={() => setFiltreTonalite(f)}>
                {f === 'tous' ? 'Tous' : f === 'soleil' ? '☀️ Soleil' : '🌧️ Pluie'}
              </button>
            ))}
          </div>
        </div>

        {/* Temporalité */}
        <div className="filtre-groupe">
          <span className="filtre-label">Période</span>
          <div className="filtre-pills">
            {([
              ['tous', 'Tous'],
              ['48h', '- 48h'],
              ['7j', '- 7 jours'],
              ['14j', '- 14 jours'],
            ] as [FiltreTemporalite, string][]).map(([val, label]) => (
              <button key={val} className={`filtre-pill ${filtreTemporalite === val ? 'active' : ''}`} onClick={() => setFiltreTemporalite(val)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Statut — seulement si Écho Ouvert est actif et le filtre Ouverts est sélectionné */}
        {FEATURES.ECHO_OUVERT && filtreType === 'ouvert' && (
          <div className="filtre-groupe">
            <span className="filtre-label">Statut</span>
            <div className="filtre-pills">
              {(['tous', 'actif', 'cloture'] as FiltreStatut[]).map(f => (
                <button key={f} className={`filtre-pill ${filtreStatut === f ? 'active' : ''}`} onClick={() => setFiltreStatut(f)}>
                  {f === 'tous' ? 'Tous' : f === 'actif' ? '🔓 Actifs' : '🔒 Clôturés'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="decouverte-resultats">
        {loading ? (
          <div className="decouverte-vide">Chargement...</div>
        ) : resultats.length === 0 ? (
          <div className="decouverte-vide">
            <span>🔍</span>
            <p>{recherche ? `Aucun écho pour "${recherche}"` : 'Aucun écho correspond à ces critères.'}</p>
          </div>
        ) : (
          <>
            <p className="resultats-count">{resultats.length} écho{resultats.length !== 1 ? 's' : ''} trouvé{resultats.length !== 1 ? 's' : ''}</p>
            <div className="echos-liste">
              {resultats.map(echo => <EchoCard key={echo.id} echo={echo} />)}
            </div>
          </>
        )}

        {!loading && hasMore && (
          <button className="decouverte-charger-plus" onClick={chargerPlus} disabled={loadingMore}>
            {loadingMore ? 'Chargement...' : 'Charger plus d\'échos'}
          </button>
        )}
      </div>
    </div>
  );
}
