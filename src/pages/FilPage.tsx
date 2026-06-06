import { useState } from 'react';
import { useEchos, useEchoSolidaire } from '../hooks/useEchos';
import { useAuth } from '../hooks/useAuth';
import EchoCard from '../components/EchoCard';
import PublierEcho from '../components/PublierEcho';
import EchoSolidaireModal from '../components/EchoSolidaireModal';
import { CATEGORIES } from '../types';
import './FilPage.css';

export default function FilPage() {
  const [categorieActive, setCategorieActive] = useState('tous');
  const [showCategories, setShowCategories] = useState(false);
  const [showSolidaire, setShowSolidaire] = useState(false);
  const { echos, loading } = useEchos(categorieActive);
  const echoSolidaire = useEchoSolidaire();
  const { profile } = useAuth();

  // Total jarres bleues pour le puits
  const totalJarres = echos.reduce((sum, e) => sum + (e.jarresBleues || 0), 0);

  return (
    <div className="fil-page">

      {/* Puits communautaire */}
      <div className="puits">
        <span className="puits-icon">🫙</span>
        <span><strong>{totalJarres}</strong> jarres partagées cette semaine par la communauté</span>
      </div>

      {/* Ligne catégories + écho solidaire */}
      <div className="fil-actions">
        <button
          className={`btn-action ${showCategories ? 'active' : ''}`}
          onClick={() => setShowCategories(!showCategories)}
        >
          🎯 Catégories
        </button>
        <button
          className="btn-action btn-solidaire"
          onClick={() => setShowSolidaire(true)}
        >
          ❤️ Écho Solidaire
        </button>
      </div>

      {/* Panneau catégories */}
      {showCategories && (
        <div className="categories-panel">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`cat-pill ${categorieActive === cat.id ? 'active' : ''}`}
              onClick={() => {
                setCategorieActive(cat.id);
                setShowCategories(false);
              }}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Catégorie active affichée */}
      {categorieActive !== 'tous' && (
        <div className="categorie-active">
          <span>Filtré : {CATEGORIES.find(c => c.id === categorieActive)?.label}</span>
          <button onClick={() => setCategorieActive('tous')}>✕</button>
        </div>
      )}

      {/* Publication d'un écho */}
      {profile && <PublierEcho profile={profile} />}

      {/* Fil des échos */}
      <div className="echos-liste">
        {loading ? (
          <div className="loading">Chargement des échos...</div>
        ) : echos.length === 0 ? (
          <div className="vide">Aucun écho pour le moment. Soyez le premier à partager.</div>
        ) : (
          echos.map((echo) => (
            <EchoCard key={echo.id} echo={echo} />
          ))
        )}
      </div>

      {/* Modal Écho Solidaire */}
      {showSolidaire && (
        <EchoSolidaireModal
          echo={echoSolidaire}
          onClose={() => setShowSolidaire(false)}
        />
      )}
    </div>
  );
}
