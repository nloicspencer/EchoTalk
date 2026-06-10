import { useState, useMemo } from 'react';
import { useEchos, useEchoSolidaire } from '../hooks/useEchos';
import { useAuth } from '../hooks/useAuth';
import EchoCard from '../components/EchoCard';
import PublierEcho from '../components/PublierEcho';
import EchoSolidaireModal from '../components/EchoSolidaireModal';
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
        <JarreIcon color="blue" size="m" />
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

      {/* Compteur communauté */}
      <div className="fil-community-counter">
        <JarreIcon color="blue" size="m" />
        <span><strong>{totalJarres}</strong> jarres partagées cette semaine par la communauté</span>
      </div>

      {/* Catégories + Solidaire */}
      <div className="fil-filters">
        <button
          className={`fil-filter-btn ${showCategories ? 'active' : ''}`}
          onClick={() => setShowCategories(!showCategories)}
        >
          🎯 Catégories {categoriesActives.length > 0 && <span className="et-badge et-badge-lavande">{categoriesActives.length}</span>}
        </button>
        <button className="fil-filter-btn solidaire" onClick={() => setShowSolidaire(true)}>
          ❤️ Écho Solidaire
        </button>
      </div>

      {/* Panneau catégories */}
      {showCategories && (
        <div className="categories-panel">
          <div className="categories-grid">
            <button
              className={`cat-pill ${categoriesActives.length === 0 ? 'active' : ''}`}
              onClick={() => toggleCategorie('tous')}
            >
              ✨ Tous
            </button>
            {CATEGORIES.filter(c => c.id !== 'tous').map((cat) => (
              <button
                key={cat.id}
                className={`cat-pill ${categoriesActives.includes(cat.id) ? 'active' : ''}`}
                onClick={() => toggleCategorie(cat.id)}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
          {categoriesActives.length > 0 && (
            <button className="cat-reset" onClick={() => setCategoriesActives([])}>
              Tout effacer
            </button>
          )}
        </div>
      )}

      {/* Tags catégories actives */}
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

      {/* Zone de publication */}
      {profile && <PublierEcho profile={profile} />}

      {/* Fil des échos */}
      <div className="fil-list">
        {loading ? (
          <div className="loading">Chargement des échos...</div>
        ) : echosFiltres.length === 0 && categoriesActives.length > 0 ? (
          <div className="vide">Aucun écho dans cette catégorie. 🌊</div>
        ) : (
          echosFiltres.map((echo) => (
            <EchoCard key={echo.id} echo={echo} />
          ))
        )}
      </div>

      {showSolidaire && (
        <EchoSolidaireModal echo={echoSolidaire} onClose={() => setShowSolidaire(false)} />
      )}
    </div>
  );
}
