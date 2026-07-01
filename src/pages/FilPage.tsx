import { useState, useMemo, useEffect, useRef } from 'react';
import { useEchos, useEchoSolidaire } from '../hooks/useEchos';
import { useAuth } from '../hooks/useAuth';
import EchoCard from '../components/EchoCard';
import PublierEcho from '../components/PublierEcho';
import EchoSolidaireModal from '../components/EchoSolidaireModal';
import JournalLegues from '../components/JournalLegues';
import JarreIcon from '../components/JarreIcon';
import { CATEGORIES } from '../types';
import './FilPage.css';

export default function FilPage() {
  const [categoriesActives, setCategoriesActives] = useState<string[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [showSolidaire, setShowSolidaire] = useState(false);
  const { echos, loading } = useEchos();
  const echoSolidaire = useEchoSolidaire();
  const { profile } = useAuth();

  const totalJarres = echos.reduce((sum, e) => sum + (e.jarresBleues || 0), 0);
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

      {/* En-tête */}
      <div className="fil-header">
        <svg width="32" height="40" viewBox="0 0 64 84" aria-hidden="true">
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

      {/* Bandeau utilisateur */}
      {profile && (
        <div className="fil-user-banner">
          <div className="fil-user-pseudo">
            <JarreIcon color="blue" size="s" />
            {profile.pseudo}
          </div>
          <div className="fil-user-tagline">Ton espace. Ta voix. Ton écho.</div>
        </div>
      )}

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
          <div className="fil-community-sub">par la communauté cette semaine</div>
        </div>
      </div>

      {/* Journal des Lègues — entre puits et filtres */}
      <JournalLegues />

      {/* Filtres */}
      <div className="fil-filters">
        <button
          className={`fil-filter-btn ${showCategories ? 'active' : ''}`}
          onClick={() => setShowCategories(!showCategories)}
        >
          🎯 Catégories {categoriesActives.length > 0 && <span className="et-badge et-badge-lavande">{categoriesActives.length}</span>}
        </button>
        <button className="fil-filter-btn solidaire" onClick={() => setShowSolidaire(true)}>
          <JarreIcon color="rose" size="s" /> Écho Solidaire
        </button>
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

      {profile && <PublierEcho profile={profile} />}

      <div className="fil-list">
        {loading ? (
          <div className="loading">Chargement des échos...</div>
        ) : echosFiltres.length === 0 && categoriesActives.length > 0 ? (
          <div className="vide">Aucun écho dans cette catégorie.</div>
        ) : (
          echosFiltres.map((echo, index) => <EchoCard key={echo.id} echo={echo} delayIndex={index} />)
        )}
      </div>

      {showSolidaire && (
        <EchoSolidaireModal echo={echoSolidaire} onClose={() => setShowSolidaire(false)} />
      )}
    </div>
  );
}
