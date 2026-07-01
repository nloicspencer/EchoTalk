import { useState, useEffect, useRef } from 'react';
import { Echo } from '../types';
import {
  useEchoReps, publierEchoRep,
  toggleEchoOuvert, modifierEcho, supprimerEcho,
  modifierEchoRep, supprimerEchoRep, fermerEchoExpire,
} from '../hooks/useEchos';
import { useStockJarres, donnerJarreBleu, donnerJarreRose, donnerCoeur } from '../hooks/useReactions';
import { signalerContenu } from '../hooks/useModeration';
import { useAuth } from '../hooks/useAuth';
import './EchoCard.css';
import JarreIcon from './JarreIcon';

interface Props { echo: Echo; delayIndex?: number; }

export default function EchoCard({ echo, delayIndex = 0 }: Props) {
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
  const [showReouvrirChoix, setShowReouvrirChoix] = useState(false);
  const [popAnim, setPopAnim] = useState<{ jarresBleues: boolean; coeurs: boolean; coeursBrises: boolean; jarresRoses: boolean }>({
    jarresBleues: false, coeurs: false, coeursBrises: false, jarresRoses: false,
  });
  const valeursPrecedentes = useRef({
    jarresBleues: echo.jarresBleues ?? 0, coeurs: echo.coeurs ?? 0,
    coeursBrises: echo.coeursBrises ?? 0, jarresRoses: echo.jarresRoses ?? 0,
  });

  const echoReps = useEchoReps(echo.id);
  const { profile } = useAuth();
  const stock = useStockJarres(profile?.uid ?? '');

  const estProprietaire = profile?.uid === echo.auteurId;
  const aDejaParticipe = echoReps.some(r => r.auteurId === profile?.uid && !r.supprime);
  const placesRestantes = (echo.placesMax ?? 0) - (echo.placesOccupees ?? 0);
  const placesDispo = placesRestantes > 0;
  const reouverturesRestantes = echo.reouverturesRestantes ?? 0;
  const estSupprime = echo.supprime ?? false;
  const estExpire = echo.type === 'ouvert' && !!echo.expiresAt && echo.expiresAt.getTime() <= Date.now();
  const estReellementOuvert = (echo.estOuvert ?? false) && !estExpire;

  // Constate l'expiration et ferme automatiquement l'écho en base (une seule fois).
  useEffect(() => {
    if (echo.type === 'ouvert' && estExpire && echo.estOuvert) {
      fermerEchoExpire(echo.id).catch(() => {});
    }
  }, [echo.id, echo.type, estExpire, echo.estOuvert]);

  // Anime brièvement chaque compteur de réaction quand sa valeur change.
  useEffect(() => {
    const valeursActuelles = {
      jarresBleues: echo.jarresBleues ?? 0, coeurs: echo.coeurs ?? 0,
      coeursBrises: echo.coeursBrises ?? 0, jarresRoses: echo.jarresRoses ?? 0,
    };
    const champsChanges = (Object.keys(valeursActuelles) as Array<keyof typeof valeursActuelles>)
      .filter(cle => valeursActuelles[cle] !== valeursPrecedentes.current[cle]);
    if (champsChanges.length === 0) return;
    valeursPrecedentes.current = valeursActuelles;
    setPopAnim(prev => {
      const next = { ...prev };
      champsChanges.forEach(cle => { next[cle] = true; });
      return next;
    });
    const timer = setTimeout(() => {
      setPopAnim(prev => {
        const next = { ...prev };
        champsChanges.forEach(cle => { next[cle] = false; });
        return next;
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [echo.jarresBleues, echo.coeurs, echo.coeursBrises, echo.jarresRoses]);

  const peutModifierEcho = () => !echo.createdAt ? false : Date.now() - echo.createdAt.getTime() < 24 * 60 * 60 * 1000;
  const peutModifierRep = (createdAt: Date) => Date.now() - createdAt.getTime() < 60 * 60 * 1000;
  const peutSupprimerEcho = () => echo.type === 'libre' ? true : (echo.estOuvert === true && !estSupprime);

  const peutAjouterRep = echo.type === 'ouvert' && estReellementOuvert && !estSupprime && (
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
      } else { setErreur(msg); }
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
    if (!confirm('Supprimer cet EchoRep ?')) return;
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
    if (estReellementOuvert) {
      try { await toggleEchoOuvert(echo.id, true, reouverturesRestantes); }
      catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
      return;
    }
    setShowReouvrirChoix(true);
  };

  const handleConfirmerReouverture = async (duree: 2 | 6 | 10) => {
    try {
      await toggleEchoOuvert(echo.id, false, reouverturesRestantes, duree);
      setShowReouvrirChoix(false);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur'); }
  };

  const tonaliteClass = echo.tonalite === 'soleil' ? 'tonalite-soleil' : 'tonalite-pluie';

  return (
    <div
      className={`echo-card ${tonaliteClass} ${echo.estSolidaire ? 'solidaire' : ''} ${estSupprime ? 'supprime' : ''}`}
      style={{ animationDelay: `${Math.min(delayIndex, 12) * 0.05}s` }}
    >

      <div className="echo-card-top">
        <div className="echo-card-meta">
          <span className="echo-card-pseudo">{echo.auteurPseudo}</span>
          {echo.type === 'ouvert' && !estSupprime && (
            <div className="echo-card-ouvert-info">
              <span>
                <i className="ti ti-users" aria-hidden="true" style={{fontSize:'12px'}} />
                {' '}{echo.placesOccupees ?? 0}/{echo.placesMax}
              </span>
              {tempsRestant() && (
                <span>
                  <i className="ti ti-clock" aria-hidden="true" style={{fontSize:'12px'}} />
                  {' '}{tempsRestant()}
                </span>
              )}
              <span className={`et-badge ${estReellementOuvert ? 'et-badge-lavande' : 'et-badge-neutral'}`}>
                <i className={`ti ${estReellementOuvert ? 'ti-lock-open' : 'ti-lock'}`} aria-hidden="true" style={{fontSize:'11px'}} />
                {' '}{estReellementOuvert ? 'Ouvert' : 'Fermé'}
              </span>
              <span className="echo-card-time">
                <i className="ti ti-refresh" aria-hidden="true" style={{fontSize:'11px'}} />
                {' '}{reouverturesRestantes} réouverture{reouverturesRestantes !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        <div className="echo-card-badges">
          {!estSupprime && (
            <span className="et-badge et-badge-neutral">
              {echo.tonalite === 'soleil' ? '☀️' : '🌧️'}
            </span>
          )}
          <span className="et-badge et-badge-neutral">
            {echo.type === 'libre' ? '🕊️ Libre' : '🔓 Ouvert'}
          </span>
          {echo.estSolidaire && (
            <span className="et-badge et-badge-rose">
              <JarreIcon color="rose" size="s" /> Solidaire
            </span>
          )}
        </div>
      </div>

      {editEcho ? (
        <div className="edit-echo-form">
          <textarea value={editContenu} onChange={e => setEditContenu(e.target.value)} rows={4} autoFocus />
          <div className="edit-actions">
            <button onClick={() => setEditEcho(false)}>Annuler</button>
            <button className="btn-save" onClick={handleModifierEcho}>Enregistrer</button>
          </div>
        </div>
      ) : (
        <p className={`echo-card-text ${estSupprime ? 'contenu-supprime' : ''}`}>{echo.contenu}</p>
      )}

      {echo.modifie && !estSupprime && (
        <span className="mention-modifie">
          <i className="ti ti-pencil" aria-hidden="true" style={{fontSize:'11px'}} /> Écho modifié
        </span>
      )}

      {estProprietaire && !estSupprime && !editEcho && (
        <div className="echo-auteur-actions">
          {peutModifierEcho() && (
            <button className="btn-edit" onClick={() => { setEditEcho(true); setEditContenu(echo.contenu); }}>
              <i className="ti ti-pencil" aria-hidden="true" /> Modifier
            </button>
          )}
          {peutSupprimerEcho() && (
            <button className="btn-delete" onClick={handleSupprimerEcho}>
              <i className="ti ti-trash" aria-hidden="true" /> Supprimer
            </button>
          )}
        </div>
      )}

      {!estSupprime && (
        <div className="echo-card-reactions">
          {echo.estSolidaire ? (
            <button
              className={`echo-reaction-btn active-rose ${stock.jarresRoses <= 0 ? 'reaction-disabled' : ''} ${popAnim.jarresRoses ? 'jarre-pop' : ''}`}
              onClick={handleJarreRose}
              title={stock.jarresRoses <= 0 ? 'Stock épuisé' : `Stock : ${stock.jarresRoses}`}
            >
              <JarreIcon color="rose" size="s" /> <span className={popAnim.jarresRoses ? 'compteur-pop' : ''}>{echo.jarresRoses || 0}</span>
            </button>
          ) : (
            <>
              <button
                className={`echo-reaction-btn ${stock.jarresBleues <= 0 ? 'reaction-disabled' : ''} ${popAnim.jarresBleues ? 'jarre-pop' : ''}`}
                onClick={handleJarreBleu}
                title={stock.jarresBleues <= 0 ? 'Stock épuisé' : `Stock : ${stock.jarresBleues}`}
              >
                <JarreIcon color="blue" size="s" /> <span className={popAnim.jarresBleues ? 'compteur-pop' : ''}>{echo.jarresBleues || 0}</span>
              </button>
              <button className={`echo-reaction-btn ${popAnim.coeurs ? 'jarre-pop' : ''}`} onClick={() => handleCoeur('coeurs')}>
                ❤️ <span className={popAnim.coeurs ? 'compteur-pop' : ''}>{echo.coeurs || 0}</span>
              </button>
              <button className={`echo-reaction-btn ${popAnim.coeursBrises ? 'jarre-pop' : ''}`} onClick={() => handleCoeur('coeursBrises')}>
                💔 <span className={popAnim.coeursBrises ? 'compteur-pop' : ''}>{echo.coeursBrises || 0}</span>
              </button>
            </>
          )}
          {echo.type === 'ouvert' && echoReps.length > 0 && (
            <button className="echo-reaction-btn" onClick={() => setMasquerReps(!masquerReps)}>
              <i className={`ti ${masquerReps ? 'ti-eye' : 'ti-eye-off'}`} aria-hidden="true" />
              {' '}{masquerReps ? 'Voir' : 'Masquer'}
            </button>
          )}
        </div>
      )}

      {reactionErreur && <p className="reaction-erreur">{reactionErreur}</p>}

      {estProprietaire && echo.type === 'ouvert' && !estSupprime && (
        showReouvrirChoix ? (
          <div className="reouvrir-choix">
            <p className="reouvrir-choix-titre">Pour combien de temps rouvrir cet écho ?</p>
            <div className="reouvrir-choix-options">
              <button onClick={() => handleConfirmerReouverture(2)}>2 jours</button>
              <button onClick={() => handleConfirmerReouverture(6)}>6 jours</button>
              <button onClick={() => handleConfirmerReouverture(10)}>10 jours</button>
            </div>
            <button className="reouvrir-choix-annuler" onClick={() => setShowReouvrirChoix(false)}>Annuler</button>
          </div>
        ) : (
          <button
            className={`btn-toggle-ouvert ${estReellementOuvert ? 'btn-fermer' : 'btn-rouvrir'}`}
            onClick={handleToggleOuvert}
            disabled={!estReellementOuvert && reouverturesRestantes <= 0}
          >
            {estReellementOuvert
              ? <><i className="ti ti-lock" aria-hidden="true" /> Fermer cet écho</>
              : reouverturesRestantes > 0
                ? <><i className="ti ti-lock-open" aria-hidden="true" /> Rouvrir ({reouverturesRestantes} restante{reouverturesRestantes !== 1 ? 's' : ''})</>
                : <><i className="ti ti-ban" aria-hidden="true" /> Plus de réouvertures disponibles</>
            }
          </button>
        )
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
                      {rep.modifie && !rep.supprime && (
                        <span className="mention-modifie">
                          <i className="ti ti-pencil" aria-hidden="true" style={{fontSize:'11px'}} /> Modifié
                        </span>
                      )}
                      <div className="rep-footer">
                        <span className="echorep-date">
                          {rep.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="rep-actions">
                          {profile?.uid === rep.auteurId && !rep.supprime && estReellementOuvert && (
                            <>
                              {peutModifierRep(rep.createdAt) && (
                                <button className="btn-edit-sm" onClick={() => { setEditRepId(rep.id); setEditRepContenu(rep.contenu); }}>
                                  <i className="ti ti-pencil" aria-hidden="true" />
                                </button>
                              )}
                              <button className="btn-delete-sm" onClick={() => handleSupprimerRep(rep.id, rep.auteurId)}>
                                <i className="ti ti-trash" aria-hidden="true" />
                              </button>
                            </>
                          )}
                          {profile?.uid !== rep.auteurId && !rep.supprime && (
                            <button className="btn-signaler-sm" onClick={() => handleSignaler('echorep', rep.contenu, rep.auteurId, rep.id)} title="Signaler">
                              <i className="ti ti-flag" aria-hidden="true" />
                            </button>
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
                  <i className="ti ti-message" aria-hidden="true" />
                  {' '}{estProprietaire ? 'Répondre à votre écho'
                    : aDejaParticipe ? 'Ajouter un EchoRep'
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

          {!peutAjouterRep && estReellementOuvert && !estProprietaire && !aDejaParticipe && !placesDispo && (
            <p className="places-pleines">
              <i className="ti ti-lock" aria-hidden="true" /> Cet écho est complet
            </p>
          )}
        </div>
      )}

      <div className="echo-card-footer">
        {!estSupprime && !estProprietaire ? (
          <button
            className="echo-card-signal"
            onClick={() => handleSignaler('echo', echo.contenu, echo.auteurId)}
            disabled={signalementFait}
          >
            <i className={`ti ${signalementFait ? 'ti-check' : 'ti-flag'}`} aria-hidden="true" />
            {' '}{signalementFait ? 'Signalé' : 'Signaler'}
          </button>
        ) : <span />}
        <span className="echo-card-date">
          {echo.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
