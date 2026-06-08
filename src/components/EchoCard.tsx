import { useState } from 'react';
import { Echo } from '../types';
import {
  useEchoReps, publierEchoRep,
  toggleEchoOuvert, modifierEcho, supprimerEcho,
  modifierEchoRep, supprimerEchoRep,
} from '../hooks/useEchos';
import { useStockJarres, donnerJarreBleu, donnerJarreRose, donnerCoeur } from '../hooks/useReactions';
import { signalerContenu } from '../hooks/useModeration';
import { useAuth } from '../hooks/useAuth';
import './EchoCard.css';

interface Props { echo: Echo; }

export default function EchoCard({ echo }: Props) {
  const [masquerReps, setMasquerReps] = useState(false);
  const [showRepForm, setShowRepForm] = useState(false);
  const [repContenu, setRepContenu] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [editEcho, setEditEcho] = useState(false);
  const [editContenu, setEditContenu] = useState(echo.contenu);
  const [editRepId, setEditRepId] = useState<string | null>(null);
  const [editRepContenu, setEditRepContenu] = useState('');
  const [reactionErreur, setReactionErreur] = useState('');
  const [signalementFait, setSignalementFait] = useState(false);

  const echoReps = useEchoReps(echo.id);
  const { profile } = useAuth();
  const stock = useStockJarres(profile?.uid ?? '');

  const estProprietaire = profile?.uid === echo.auteurId;
  const aDejaParticipe = echoReps.some(r => r.auteurId === profile?.uid && !r.supprime);
  const placesRestantes = (echo.placesMax ?? 0) - (echo.placesOccupees ?? 0);
  const placesDispo = placesRestantes > 0;
  const reouverturesRestantes = echo.reouverturesRestantes ?? 0;
  const estSupprime = echo.supprime ?? false;

  const peutModifierEcho = () => !echo.createdAt ? false : Date.now() - echo.createdAt.getTime() < 24 * 60 * 60 * 1000;
  const peutModifierRep = (createdAt: Date) => Date.now() - createdAt.getTime() < 60 * 60 * 1000;
  const peutSupprimerEcho = () => echo.type === 'libre' ? true : (echo.estOuvert === true && !estSupprime);

  const peutAjouterRep = echo.type === 'ouvert' && (echo.estOuvert ?? false) && !estSupprime && (
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

  const handleJarreBleu = async () => {
    if (!profile || estSupprime) return;
    setReactionErreur('');
    try {
      await donnerJarreBleu(echo.id, profile.uid, stock.jarresBleues, echo.jarresBleues || 0);
    } catch (e: unknown) {
      setReactionErreur(e instanceof Error ? e.message : 'Erreur');
      setTimeout(() => setReactionErreur(''), 3000);
    }
  };

  const handleJarreRose = async () => {
    if (!profile) return;
    setReactionErreur('');
    try {
      await donnerJarreRose(echo.id, profile.uid, stock.jarresRoses, echo.jarresRoses || 0);
    } catch (e: unknown) {
      setReactionErreur(e instanceof Error ? e.message : 'Erreur');
      setTimeout(() => setReactionErreur(''), 3000);
    }
  };

  const handleCoeur = async (type: 'coeurs' | 'coeursBrises') => {
    if (!profile || estSupprime) return;
    setReactionErreur('');
    try {
      const reactionType = type === 'coeurs' ? 'coeur' : 'coeurBrise';
      await donnerCoeur(echo.id, profile.uid, reactionType, echo[type] || 0);
    } catch (e: unknown) {
      setReactionErreur(e instanceof Error ? e.message : 'Erreur');
      setTimeout(() => setReactionErreur(''), 3000);
    }
  };

  const handleModifierEcho = async () => {
    if (!editContenu.trim()) return;
    try {
      await modifierEcho(echo.id, editContenu, echo.createdAt);
      setEditEcho(false);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
  };

  const handleSupprimerEcho = async () => {
    if (!confirm('Supprimer cet écho ?')) return;
    try { await supprimerEcho(echo); } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
  };

  const handlePublierRep = async () => {
    if (!repContenu.trim() || !profile) return;
    setLoading(true); setErreur('');
    try {
      await publierEchoRep(echo.id, profile.uid, profile.pseudo, repContenu,
        echo.placesOccupees ?? 0, echo.placesMax ?? 0, estProprietaire);
      setRepContenu(''); setShowRepForm(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      if (msg === 'VALIDATION_REQUISE') {
        setErreur('✅ Votre EchoRep est en attente de validation par le propriétaire.');
        setRepContenu('');
        setTimeout(() => { setShowRepForm(false); setErreur(''); }, 3000);
      } else {
        setErreur(msg);
      }
    } finally { setLoading(false); }
  };

  const handleModifierRep = async (repId: string, createdAt: Date) => {
    if (!editRepContenu.trim()) return;
    try {
      await modifierEchoRep(echo.id, repId, editRepContenu, createdAt);
      setEditRepId(null);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
  };

  const handleSupprimerRep = async (repId: string, auteurId: string) => {
    if (!confirm('Supprimer cette EchoRep ?')) return;
    try {
      await supprimerEchoRep(echo.id, repId, auteurId, echo.placesOccupees ?? 0, estProprietaire);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
  };

  const handleSignaler = async (type: 'echo' | 'echorep', contenu: string, auteurId: string, repId?: string) => {
    if (!profile || signalementFait) return;
    if (!confirm(`Signaler ce contenu à l'équipe de modération EchoTalk ?`)) return;
    try {
      await signalerContenu(echo.id, profile.uid, auteurId, echo.auteurPseudo, contenu, type, repId);
      setSignalementFait(true);
      setTimeout(() => setSignalementFait(false), 5000);
    } catch {}
  };

  const handleToggleOuvert = async () => {
    try { await toggleEchoOuvert(echo.id, echo.estOuvert ?? true, reouverturesRestantes); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
  };

  return (
    <div className={`echo-card ${echo.tonalite ?? ''} ${echo.estSolidaire ? 'solidaire' : ''} ${estSupprime ? 'supprime' : ''}`}>

      <div className="echo-header">
        <span className="echo-pseudo">{echo.auteurPseudo}</span>
        <div className="echo-tags">
          {!estSupprime && <span className="tag">{echo.tonalite === 'soleil' ? '☀️' : '🌧️'}</span>}
          <span className="tag">{echo.type === 'libre' ? '🕊️ Libre' : '🔓 Ouvert'}</span>
          {echo.estSolidaire && <span className="tag solidaire-tag">💛 Solidaire</span>}
        </div>
      </div>

      {echo.type === 'ouvert' && !estSupprime && (
        <div className="echo-ouvert-info">
          <span>👥 {echo.placesOccupees ?? 0}/{echo.placesMax} places</span>
          {tempsRestant() && <span>⏱ {tempsRestant()}</span>}
          <span className={`statut ${echo.estOuvert ? 'ouvert' : 'ferme'}`}>
            {echo.estOuvert ? '🔓 Ouvert' : '🔒 Fermé'}
          </span>
          <span className="reouvertures">↩️ {reouverturesRestantes} réouverture{reouverturesRestantes !== 1 ? 's' : ''} restante{reouverturesRestantes !== 1 ? 's' : ''}</span>
        </div>
      )}

      {editEcho ? (
        <div className="edit-echo-form">
          <textarea value={editContenu} onChange={e => setEditContenu(e.target.value)} rows={4} autoFocus />
          <div className="edit-actions">
            <button onClick={() => setEditEcho(false)}>Annuler</button>
            <button className="btn-save" onClick={handleModifierEcho}>Enregistrer</button>
          </div>
        </div>
      ) : (
        <p className={`echo-contenu ${estSupprime ? 'contenu-supprime' : ''}`}>{echo.contenu}</p>
      )}

      {echo.modifie && !estSupprime && <span className="mention-modifie">✏️ Écho modifié</span>}

      {estProprietaire && !estSupprime && !editEcho && (
        <div className="echo-auteur-actions">
          {peutModifierEcho() && <button className="btn-edit" onClick={() => { setEditEcho(true); setEditContenu(echo.contenu); }}>✏️ Modifier</button>}
          {peutSupprimerEcho() && <button className="btn-delete" onClick={handleSupprimerEcho}>🗑️ Supprimer</button>}
        </div>
      )}

      {/* Réactions */}
      {!estSupprime && (
        <div className="echo-reactions">
          {echo.estSolidaire ? (
            <button
              className={`reaction solidaire-reaction ${stock.jarresRoses <= 0 ? 'reaction-disabled' : ''}`}
              onClick={handleJarreRose}
              title={stock.jarresRoses <= 0 ? 'Stock de jarres roses épuisé' : `Stock : ${stock.jarresRoses} 🌸`}
            >
              🫙 <span>{echo.jarresRoses || 0}</span>
            </button>
          ) : (
            <>
              <button
                className={`reaction ${stock.jarresBleues <= 0 ? 'reaction-disabled' : ''}`}
                onClick={handleJarreBleu}
                title={stock.jarresBleues <= 0 ? 'Stock de jarres bleues épuisé' : `Stock : ${stock.jarresBleues} 🫙`}
              >
                🫙 <span>{echo.jarresBleues || 0}</span>
              </button>
              <button className="reaction" onClick={() => handleCoeur('coeurs')}>❤️ <span>{echo.coeurs || 0}</span></button>
              <button className="reaction" onClick={() => handleCoeur('coeursBrises')}>💔 <span>{echo.coeursBrises || 0}</span></button>
            </>
          )}
          {echo.type === 'ouvert' && echoReps.length > 0 && (
            <button className="reaction masquer-btn" onClick={() => setMasquerReps(!masquerReps)}>
              {masquerReps ? '👁 Voir' : '🙈 Masquer'}
            </button>
          )}
        </div>
      )}

      {reactionErreur && <p className="reaction-erreur">{reactionErreur}</p>}

      {estProprietaire && echo.type === 'ouvert' && !estSupprime && (
        <button
          className={`btn-toggle-ouvert ${echo.estOuvert ? 'btn-fermer' : 'btn-rouvrir'}`}
          onClick={handleToggleOuvert}
          disabled={!echo.estOuvert && reouverturesRestantes <= 0}
        >
          {echo.estOuvert ? '🔒 Fermer cet écho'
            : reouverturesRestantes > 0
              ? `🔓 Rouvrir (${reouverturesRestantes} restante${reouverturesRestantes !== 1 ? 's' : ''})`
              : '🚫 Plus de réouvertures disponibles'}
        </button>
      )}

      {echo.type === 'ouvert' && !masquerReps && (
        <div className="echoreps">
          {echoReps.length > 0 && (
            <div className="echoreps-liste">
              {echoReps.map((rep) => (
                <div key={rep.id} className={`echorep-item ${rep.supprime ? 'rep-supprimee' : ''}`}>
                  {editRepId === rep.id ? (
                    <div className="edit-rep-form">
                      <textarea value={editRepContenu} onChange={e => setEditRepContenu(e.target.value)} rows={3} autoFocus />
                      <div className="edit-actions">
                        <button onClick={() => setEditRepId(null)}>Annuler</button>
                        <button className="btn-save" onClick={() => handleModifierRep(rep.id, rep.createdAt)}>Enregistrer</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!rep.supprime && <span className="echorep-pseudo">{rep.auteurPseudo}</span>}
                      <p className="echorep-contenu">{rep.contenu}</p>
                      {rep.modifie && !rep.supprime && <span className="mention-modifie">✏️ Modifié</span>}
                      <div className="rep-footer">
                        <span className="echorep-date">
                          {rep.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="rep-actions">
                          {profile?.uid === rep.auteurId && !rep.supprime && echo.estOuvert && (
                            <>
                              {peutModifierRep(rep.createdAt) && (
                                <button className="btn-edit-sm" onClick={() => { setEditRepId(rep.id); setEditRepContenu(rep.contenu); }}>✏️</button>
                              )}
                              <button className="btn-delete-sm" onClick={() => handleSupprimerRep(rep.id, rep.auteurId)}>🗑️</button>
                            </>
                          )}
                          {profile?.uid !== rep.auteurId && !rep.supprime && (
                            <button
                              className="btn-signaler-sm"
                              onClick={() => handleSignaler('echorep', rep.contenu, rep.auteurId, rep.id)}
                              title="Signaler cette EchoRep"
                            >🚩</button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {peutAjouterRep && (
            <div className="echorep-form">
              {!showRepForm ? (
                <button className="btn-add-rep" onClick={() => setShowRepForm(true)}>
                  💬 {estProprietaire ? 'Répondre à votre écho'
                    : aDejaParticipe ? 'Ajouter une EchoRep'
                    : `Rejoindre cet écho (${placesRestantes} place${placesRestantes !== 1 ? 's' : ''} restante${placesRestantes !== 1 ? 's' : ''})`}
                </button>
              ) : (
                <div className="echorep-input">
                  <textarea placeholder="Votre EchoRep..." value={repContenu} onChange={e => setRepContenu(e.target.value)} rows={3} autoFocus />
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

          {!peutAjouterRep && echo.estOuvert && !estProprietaire && !aDejaParticipe && !placesDispo && (
            <p className="places-pleines">🔒 Cet écho est complet</p>
          )}
        </div>
      )}

      {!estSupprime && !estProprietaire && (
        <button
          className="btn-signaler"
          onClick={() => handleSignaler('echo', echo.contenu, echo.auteurId)}
          disabled={signalementFait}
        >
          {signalementFait ? '✅ Signalé' : '🚩 Signaler'}
        </button>
      )}

      <span className="echo-date">
        {echo.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
