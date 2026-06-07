import { useState, useMemo } from 'react';
import { useEchos } from '../hooks/useEchos';
import EchoCard from '../components/EchoCard';
import './DecouvertePage.css';

type FiltreType = 'tous' | 'libre' | 'ouvert';
type FiltreTonalite = 'tous' | 'soleil' | 'pluie';
type FiltreStatut = 'tous' | 'actif' | 'cloture';

export default function DecouvertePage() {
  const [recherche, setRecherche] = useState('');
  const [filtreType, setFiltreType] = useState<FiltreType>('tous');
  const [filtreTonalite, setFiltreTonalite] = useState<FiltreTonalite>('tous');
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatut>('tous');
  const { echos, loading } = useEchos();

  const resultats = useMemo(() => {
    return echos.filter(echo => {
      // Masquer les échos supprimés
      if (echo.supprime) return false;

      // Recherche par mot-clé
      if (recherche.trim()) {
        const terme = recherche.toLowerCase();
        const contenu = (echo.contenu || "").toLowerCase();
        const pseudo = (echo.auteurPseudo || "").toLowerCase();
        if (!contenu.includes(terme) &&
            !pseudo.includes(terme)) {
          return false;
        }
      }

      // Filtre type
      if (filtreType !== 'tous' && echo.type !== filtreType) return false;

      // Filtre tonalité
      if (filtreTonalite !== 'tous' && echo.tonalite !== filtreTonalite) return false;

      // Filtre statut (seulement pour les échos ouverts)
      if (filtreStatut === 'actif' && echo.type === 'ouvert' && !echo.estOuvert) return false;
      if (filtreStatut === 'cloture' && echo.type === 'ouvert' && echo.estOuvert) return false;

      return true;
    });
  }, [echos, recherche, filtreType, filtreTonalite, filtreStatut]);

  return (
    <div className="decouverte-page">

      {/* En-tête */}
      <div className="decouverte-header">
        <h1>🔍 Découverte</h1>
        <p>Explore les échos de la communauté</p>
      </div>

      {/* Barre de recherche */}
      <div className="recherche-bar">
        <span className="recherche-icon">🔍</span>
        <input
          type="text"
          placeholder="Rechercher dans les échos..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
        />
        {recherche && (
          <button className="recherche-clear" onClick={() => setRecherche('')}>✕</button>
        )}
      </div>

      {/* Filtres */}
      <div className="filtres">
        {/* Type */}
        <div className="filtre-groupe">
          <span className="filtre-label">Type</span>
          <div className="filtre-pills">
            {(['tous', 'libre', 'ouvert'] as FiltreType[]).map(f => (
              <button
                key={f}
                className={`filtre-pill ${filtreType === f ? 'active' : ''}`}
                onClick={() => setFiltreType(f)}
              >
                {f === 'tous' ? 'Tous' : f === 'libre' ? '🕊️ Libres' : '🔓 Ouverts'}
              </button>
            ))}
          </div>
        </div>

        {/* Tonalité */}
        <div className="filtre-groupe">
          <span className="filtre-label">Tonalité</span>
          <div className="filtre-pills">
            {(['tous', 'soleil', 'pluie'] as FiltreTonalite[]).map(f => (
              <button
                key={f}
                className={`filtre-pill ${filtreTonalite === f ? 'active' : ''}`}
                onClick={() => setFiltreTonalite(f)}
              >
                {f === 'tous' ? 'Tous' : f === 'soleil' ? '☀️ Soleil' : '🌧️ Pluie'}
              </button>
            ))}
          </div>
        </div>

        {/* Statut — seulement si filtre Ouverts actif */}
        {filtreType === 'ouvert' && (
          <div className="filtre-groupe">
            <span className="filtre-label">Statut</span>
            <div className="filtre-pills">
              {(['tous', 'actif', 'cloture'] as FiltreStatut[]).map(f => (
                <button
                  key={f}
                  className={`filtre-pill ${filtreStatut === f ? 'active' : ''}`}
                  onClick={() => setFiltreStatut(f)}
                >
                  {f === 'tous' ? 'Tous' : f === 'actif' ? '🔓 Actifs' : '🔒 Clôturés'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Résultats */}
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
              {resultats.map(echo => (
                <EchoCard key={echo.id} echo={echo} />
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
