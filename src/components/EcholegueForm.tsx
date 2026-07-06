import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { publierEcholegue, usesMesEcholegues, getSemaineISO } from '../hooks/useEcholegue';
import './EcholegueForm.css';

const EXPIRATION_JOURS = 15;
const APERCU_RECIT = 100;

// Composant texte tronqué avec "Lire plus / Réduire" (identique à AdminPage.tsx)
function TexteTronque({ texte, limite, className }: { texte: string; limite: number; className: string }) {
  const [etendu, setEtendu] = useState(false);
  const tropLong = texte.length > limite;

  if (!tropLong) return <p className={className}>{texte}</p>;

  return (
    <div>
      <p key={etendu ? 'etendu' : 'tronque'} className={`${className} texte-crossfade`}>
        {etendu ? texte : `${texte.slice(0, limite)}...`}
      </p>
      <button className="btn-lire-plus" onClick={() => setEtendu(!etendu)}>
        {etendu ? 'Réduire' : 'Lire plus'}
      </button>
    </div>
  );
}

export default function EcholegueForm() {
  const { profile } = useAuth();
  const mesLegues = usesMesEcholegues(profile?.uid ?? '');
  const [recit, setRecit] = useState('');
  const [lecon, setLecon] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [blocVisible, setBlocVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [listeVisible, setListeVisible] = useState(false);

  if (!profile) return null;

  const maintenant = new Date();
  const semaineCourante = getSemaineISO();
  const leguesVisibles = mesLegues.filter(l => {
    const diff = maintenant.getTime() - l.createdAt.getTime();
    return diff < EXPIRATION_JOURS * 24 * 60 * 60 * 1000;
  });

  const handlePublier = async () => {
    if (!recit.trim() || !lecon.trim()) return;
    setLoading(true);
    try {
      const statut = await publierEcholegue(profile.uid, profile.pseudo, recit.trim(), lecon.trim());
      setRecit(''); setLecon(''); setFormVisible(false);
      setMessage(statut === 'publie'
        ? 'Votre Écholègue a été ajouté à la bibliothèque.'
        : 'Votre Écholègue est en cours de validation.');
      setTimeout(() => setMessage(''), 5000);
    } catch {
      setMessage('Une erreur est survenue.');
      setTimeout(() => setMessage(''), 4000);
    } finally { setLoading(false); }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const joursRestants = (date: Date) => {
    const diff = EXPIRATION_JOURS - Math.floor((maintenant.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="echolegue-section">
      <button className="el-header el-header-toggle" onClick={() => setBlocVisible(!blocVisible)}>
        <div className="el-header-left">
          <div className="el-titre"><span>📓</span><span>Écholègue</span></div>
          <p className="el-subtitle">Partagez une expérience de vie et ce qu'elle vous a appris.</p>
        </div>
        <i className={`ti ${blocVisible ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true" />
      </button>

      {blocVisible && (
        <>
          {message && <p className="el-message">{message}</p>}

          {!formVisible ? (
            <button className="el-btn-ouvrir" onClick={() => setFormVisible(true)}>
              ✍️ Rédiger un Écholègue
            </button>
          ) : (
            <div className="el-form">
              <div className="el-champ">
                <label className="el-label">Mon expérience</label>
                <textarea
                  className="el-textarea"
                  placeholder="Racontez une expérience réelle que vous avez vécue..."
                  value={recit} onChange={e => setRecit(e.target.value)}
                  maxLength={1500} rows={5}
                />
                <span className="el-compteur">{recit.length}/1500</span>
              </div>
              <div className="el-champ">
                <label className="el-label">Ce que j'en retiens</label>
                <textarea
                  className="el-textarea"
                  placeholder="La leçon de vie ou la sagesse que vous en avez retirée..."
                  value={lecon} onChange={e => setLecon(e.target.value)}
                  maxLength={500} rows={3}
                />
                <span className="el-compteur">{lecon.length}/500</span>
              </div>
              <div className="el-actions">
                <button className="el-btn-annuler" onClick={() => { setFormVisible(false); setRecit(''); setLecon(''); }}>Annuler</button>
                <button className="el-btn-publier" onClick={handlePublier} disabled={loading || !recit.trim() || !lecon.trim()}>
                  {loading ? '...' : 'Publier mon Écholègue'}
                </button>
              </div>
            </div>
          )}

          {/* Mes Écholègues — masqué par défaut */}
          {leguesVisibles.length > 0 && (
            <div className="el-mes-legues">
              <button className="el-mes-toggle" onClick={() => setListeVisible(!listeVisible)}>
                <span>Mes Écholègues ({leguesVisibles.length})</span>
                <i className={`ti ${listeVisible ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true" />
              </button>
              {listeVisible && (
                <div className="el-mes-liste">
                  {leguesVisibles.map(l => {
                    // Fix — "statut" ne contient jamais la valeur 'selectionne' (le champ
                    // reste 'publie' même quand le lègue est sélectionné pour le Journal).
                    // Le vrai indicateur de sélection est la présence de la semaine
                    // courante dans historiqueSelections.
                    const estSelectionnePourCetteSemaine = l.statut === 'publie'
                      && l.historiqueSelections.some(h => h.semaine === semaineCourante);
                    const badgeClasse = l.statut === 'supprime'
                      ? 'supprime'
                      : l.statut === 'en_attente_moderation'
                      ? 'en_attente_moderation'
                      : estSelectionnePourCetteSemaine
                      ? 'selectionne'
                      : 'publie';

                    return (
                      <div key={l.id} className={`el-mes-item ${badgeClasse}`}>
                        <div className="el-mes-item-header">
                          <div className="el-mes-item-dates">
                            <span className="el-mes-date">{formatDate(l.createdAt)}</span>
                            <span className="el-mes-expire">· {joursRestants(l.createdAt)}j restants</span>
                          </div>
                          <span className={`el-statut el-statut-${badgeClasse}`}>
                            {l.statut === 'supprime' ? '❌ Supprimé'
                              : l.statut === 'en_attente_moderation' ? '⏳ En validation'
                              : estSelectionnePourCetteSemaine ? '✨ Sélectionné'
                              : '📚 En bibliothèque'}
                          </span>
                        </div>
                        <TexteTronque texte={l.recit} limite={APERCU_RECIT} className="el-mes-recit" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
