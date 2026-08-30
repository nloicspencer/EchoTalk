import { useEffect, useMemo, useRef, useState } from 'react';
import EchoCard from '../components/EchoCard';
import EchoSolidaireModal from '../components/EchoSolidaireModal';
import EncartPublicitaireHeader from '../components/EncartPublicitaireHeader';
import JarreIcon from '../components/JarreIcon';
import JournalLegues from '../components/JournalLegues';
import PublierEcho from '../components/PublierEcho';
import { useAuth } from '../context/AuthContext';
import { useEchos, useEchoSolidaire } from '../hooks/useEchos';
import { useCompteurGlobalJarres } from '../hooks/useReactions';
import { CATEGORIES } from '../types';
import { FEATURES } from '../config/appVersion';
import './FilPage.css';

export default function FilPage() {
  const [categoriesActives, setCategoriesActives] = useState<string[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [showSolidaire, setShowSolidaire] = useState(false);
  const { echos, loading, loadingMore, hasMore, chargerPlus, ajouterEchoLocalement } = useEchos();
  const echoSolidaire = useEchoSolidaire();
  const { profile } = useAuth();

  // Compteur global indépendant de la pagination — reste exact même si le
  // Fil n'affiche qu'une fraction de l'historique des Échos.
  const totalJarres = useCompteurGlobalJarres();
  const [puitsAnim, setPuitsAnim] = useState(false);
  const totalJarresPrecedent = useRef(totalJarres);

  useEffect(() => {
    if (totalJarres !== totalJarresPrecedent.current) {
      totalJarresPrecedent.current = totalJarres;
      setPuitsAnim(true);
      const timer = setTimeout(() => setPuitsAnim(false), 350);
      return () => clearTimeout(timer);
    }
  }, [totalJarres]);

  const toggleCategorie = (id: string) => {
    if (id === 'tous') { setCategoriesActives([]); return; }
    setCategoriesActives(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const echosFiltres = useMemo(() => {
    if (categoriesActives.length === 0) return echos;
    return echos.filter(e => categoriesActives.includes(e.categorie));
  }, [echos, categoriesActives]);

  const categoriesSelectionnees = CATEGORIES.filter(c => categoriesActives.includes(c.id));

  return (
    <div className="fil-page">

      {/* En-tête — bandeau 50/50 : logo EchoTalk à gauche (aligné à gauche,
          pas centré), pseudo de l'utilisateur à droite, centré dans son
          espace. */}
      <div className="fil-header">
        <div className="fil-header-logo-group">
          <svg width="26" height="32" viewBox="0 0 64 84" aria-hidden="true">
            <rect x="20" y="6" width="24" height="8" rx="3" fill="none" stroke="#7B5EA7" strokeWidth="2"/>
            <rect x="10" y="20" width="44" height="56" rx="8" fill="none" stroke="#7B5EA7" strokeWidth="2"/>
            <path d="M10 48 Q22 40 32 48 Q42 56 54 48" fill="none" stroke="#7B5EA7" strokeWidth="1.5" opacity="0.5"/>
            <path d="M10 62 Q22 54 32 62 Q42 70 54 62" fill="none" stroke="#7B5EA7" strokeWidth="1" opacity="0.3"/>
            <circle cx="32" cy="34" r="5" fill="none" stroke="#7B5EA7" strokeWidth="1" opacity="0.4"/>
            <line x1="16" y1="14" x2="10" y2="20" stroke="#7B5EA7" strokeWidth="2" strokeLinecap="round"/>
            <line x1="48" y1="14" x2="54" y2="20" stroke="#7B5EA7" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="fil-header-logo">Echo<span>Talk</span></span>
        </div>
        <div className="fil-header-pseudo-group">
          {profile && (
            <>
              <span className="fil-header-pseudo">{profile.pseudo}</span>
              <span className="fil-header-tagline">Ton espace. Ta voix. Ton écho.</span>
            </>
          )}
        </div>
      </div>

      {/* Emplacement publicitaire — bandeau pleine largeur (V4 — Publicité) */}
      {FEATURES.PUBLICITE && <EncartPublicitaireHeader />}

      {/* Puits communauté */}
      <div className="fil-community-counter">
        <svg width="28" height="35" viewBox="0 0 64 84" aria-hidden="true">
          <rect x="20" y="6" width="24" height="8" rx="3" fill="none" stroke="#4A2E7A" strokeWidth="2"/>
          <rect x="10" y="20" width="44" height="56" rx="8" fill="none" stroke="#4A2E7A" strokeWidth="2"/>
          <path d="M10 48 Q22 40 32 48 Q42 56 54 48" fill="none" stroke="#4A2E7A" strokeWidth="1.5" opacity="0.6"/>
          <line x1="16" y1="14" x2="10" y2="20" stroke="#4A2E7A" strokeWidth="2" strokeLinecap="round"/>
          <line x1="48" y1="14" x2="54" y2="20" stroke="#4A2E7A" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <div className="fil-community-text">
          <span className={`fil-community-nombre ${puitsAnim ? 'compteur-pop' : ''}`}>{totalJarres}</span>
          <span className="fil-community-label"> jarres offertes</span>
          <div className="fil-community-sub">par la communauté</div>
        </div>
      </div>

      {/* Journal des Lègues — entre puits et filtres */}
      {FEATURES.ECHOLEGUE && <JournalLegues />}

      {/* Filtres */}
      <div className="fil-filters">
        <button
          className={`fil-filter-btn ${showCategories ? 'active' : ''}`}
          onClick={() => setShowCategories(!showCategories)}
        >
          🎯 Catégories {categoriesActives.length > 0 && <span className="et-badge et-badge-lavande">{categoriesActives.length}</span>}
        </button>
        {FEATURES.ECHO_SOLIDAIRE && (
          <button className="fil-filter-btn solidaire" onClick={() => setShowSolidaire(true)}>
            <JarreIcon color="rose" size="s" /> Écho Solidaire
          </button>
        )}
      </div>

      {showCategories && (
        <div className="categories-panel">
          <div className="categories-grid">
            <button className={`cat-pill ${categoriesActives.length === 0 ? 'active' : ''}`} onClick={() => toggleCategorie('tous')}>✨ Tous</button>
            {CATEGORIES.filter(c => c.id !== 'tous').map((cat) => (
              <button key={cat.id} className={`cat-pill ${categoriesActives.includes(cat.id) ? 'active' : ''}`} onClick={() => toggleCategorie(cat.id)}>
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
          {categoriesActives.length > 0 && (
            <button className="cat-reset" onClick={() => setCategoriesActives([])}>Tout effacer</button>
          )}
        </div>
      )}

      {categoriesActives.length > 0 && (
        <div className="categories-actives">
          {categoriesSelectionnees.map(cat => (
            <span key={cat.id} className="cat-tag">
              {cat.emoji} {cat.label}
              <button onClick={() => toggleCategorie(cat.id)}>✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Insertion locale optimiste (21/08/2026) : onEchoPublie appelle
          ajouterEchoLocalement pour afficher immédiatement l'Écho qu'on
          vient de publier soi-même, sans attendre un rafraîchissement de
          page — ne concerne que ses propres publications. */}
      {profile && <PublierEcho profile={profile} onEchoPublie={ajouterEchoLocalement} />}

      <div className="fil-list">
        {loading ? (
          <div className="loading">Chargement des échos...</div>
        ) : echosFiltres.length === 0 && categoriesActives.length > 0 ? (
          <div className="vide">Aucun écho dans cette catégorie.</div>
        ) : (
          echosFiltres.map((echo, index) => <EchoCard key={echo.id} echo={echo} delayIndex={index} />)
        )}

        {!loading && hasMore && categoriesActives.length === 0 && (
          <button className="fil-charger-plus" onClick={chargerPlus} disabled={loadingMore}>
            {loadingMore ? 'Chargement...' : 'Charger plus d\'échos'}
          </button>
        )}
      </div>

      {FEATURES.ECHO_SOLIDAIRE && showSolidaire && (
        <EchoSolidaireModal echo={echoSolidaire} onClose={() => setShowSolidaire(false)} />
      )}
    </div>
  );
}
