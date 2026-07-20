import { collection, doc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import JarreIcon from '../components/JarreIcon';
import { useAuth } from '../context/AuthContext';
import { useEchoSolidaire } from '../hooks/useEchos';
import {
  Echolegue, getSemaineISO, retirerDuJournal, selectionnerEcholegue,
  useEcholeguesSemaines, useSemainesEcholegues
} from '../hooks/useEcholegue';
import { db } from '../services/firebase';
import './AdminPage.css';

const APERCU_RECIT = 70;
const APERCU_LECON = 45;

interface EchoCandidат {
  id: string; auteurPseudo: string; contenu: string;
  jarresBleues: number; jarresRoses: number; coeurs: number;
  createdAt: Date; estSolidaire: boolean; type: string;
}

const formatDateHeure = (date: Date) =>
  date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function getCleAffichage(semaine: string): string {
  const [annee, semStr] = semaine.split('-W');
  return `${annee} — Semaine ${parseInt(semStr)}`;
}

// Composant texte tronqué avec "Lire plus / Lire moins"
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

// Historique limité à 4 affichés, repli pour le reste
function HistoriqueCompact({ historique }: { historique: Echolegue['historiqueSelections'] }) {
  const [etendu, setEtendu] = useState(false);
  const LIMITE = 4;
  if (historique.length === 0) return null;
  const visibles = etendu ? historique : historique.slice(0, LIMITE);
  const reste = historique.length - LIMITE;

  return (
    <div className="admin-histo">
      {visibles.map((h, i) => (
        <span key={i} className="admin-histo-item">📓 {getCleAffichage(h.semaine)}</span>
      ))}
      {!etendu && reste > 0 && (
        <button className="admin-histo-plus" onClick={() => setEtendu(true)}>+{reste}</button>
      )}
      {etendu && historique.length > LIMITE && (
        <button className="admin-histo-plus" onClick={() => setEtendu(false)}>Réduire</button>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user, profile } = useAuth();
  const estAdmin = profile?.role === 'admin';
  const [candidats, setCandidats] = useState<EchoCandidат[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Écho Solidaire actuel : hook temps réel dédié (déjà scalable — filtre
  // estSolidaire==true directement côté serveur), plutôt que de le
  // chercher en scannant tous les Échos.
  const echoSolidaireActuel = useEchoSolidaire();

  // Bibliothèque des Lègues : la LISTE des semaines vient d'un petit index
  // (stats/echolegues_semaines), jamais de la bibliothèque complète. Le
  // CONTENU de chaque semaine n'est chargé qu'à la demande : quand elle
  // est dépliée dans la Bibliothèque, ou choisie comme "semaine source"
  // dans la Moulinette.
  const semainesDisponibles = useSemainesEcholegues();
  const [semainesOuvertes, setSemainesOuvertes] = useState<Set<string>>(new Set());
  const [selectionProposee, setSelectionProposee] = useState<Echolegue[]>([]);
  const [modeSelection, setModeSelection] = useState(false);
  const [semaineSource, setSemaineSource] = useState<string>('');
  const [semaineCible, setSemaineCible] = useState<string>(getSemaineISO());
  const semaineCourante = getSemaineISO();

  const semainesADemander = useMemo(() => {
    const s = new Set(semainesOuvertes);
    if (semaineSource) s.add(semaineSource);
    return [...s];
  }, [semainesOuvertes, semaineSource]);

  const parSemaine = useEcholeguesSemaines(semainesADemander);

  useEffect(() => {
    if (user && estAdmin) chargerDonnees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, estAdmin]);

  if (!user || !estAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-header"><h1>⚠️ Accès refusé</h1><p>Cette page est réservée à l'équipe EchoTalk.</p></div>
      </div>
    );
  }

  const afficher = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  // Candidats du mois : filtré côté serveur sur "créé depuis le 1er du
  // mois" — jamais un scan de toute la collection Échos. Le tri par
  // jarres bleues reste fait ici, mais sur un lot déjà réduit à un mois.
  const chargerDonnees = async () => {
    setLoading(true);
    const debutMois = new Date();
    debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0);
    const q = query(collection(db, 'echos'), where('createdAt', '>=', Timestamp.fromDate(debutMois)));
    const snap = await getDocs(q);
    const echos: EchoCandidат[] = [];
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.supprime || data.estSolidaire) return;
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
      const echo: EchoCandidат = {
        id: d.id, auteurPseudo: data.auteurPseudo, contenu: data.contenu,
        jarresBleues: data.jarresBleues || 0, jarresRoses: data.jarresRoses || 0,
        coeurs: data.coeurs || 0, createdAt, estSolidaire: false, type: data.type,
      };
      if (echo.jarresBleues > 0) echos.push(echo);
    });
    echos.sort((a, b) => b.jarresBleues - a.jarresBleues);
    setCandidats(echos.slice(0, 10));
    setLoading(false);
  };

  const validerEchoSolidaire = async (echoId: string) => {
    try {
      if (echoSolidaireActuel) await updateDoc(doc(db, 'echos', echoSolidaireActuel.id), { estSolidaire: false });
      const maintenant = new Date();
      const dans1mois = new Date(maintenant);
      dans1mois.setMonth(dans1mois.getMonth() + 1);
      await updateDoc(doc(db, 'echos', echoId), { estSolidaire: true, solidaireDepuis: maintenant, solidaireJusquau: dans1mois });
      afficher('✅ Écho Solidaire mis à jour.');
      chargerDonnees();
    } catch { afficher('❌ Erreur lors de la mise à jour.'); }
  };

  const retirerEchoSolidaireActuel = async () => {
    if (!echoSolidaireActuel) return;
    await updateDoc(doc(db, 'echos', echoSolidaireActuel.id), { estSolidaire: false, solidaireTermineAt: new Date() });
    afficher('✅ Écho Solidaire retiré.');
    chargerDonnees();
  };

  const toggleSemaineOuverte = (semaine: string) => {
    setSemainesOuvertes(prev => {
      const next = new Set(prev);
      if (next.has(semaine)) next.delete(semaine); else next.add(semaine);
      return next;
    });
  };

  const handleSelectionAleatoire = () => {
    if (!semaineSource) { afficher('⚠️ Choisissez la semaine source.'); return; }
    const pool = (parSemaine[semaineSource] || []).filter(
      l => !selectionProposee.map(x => x.id).includes(l.id)
    );
    if (pool.length === 0) {
      afficher(parSemaine[semaineSource]
        ? '⚠️ Aucun Écholègue disponible dans cette semaine.'
        : '⏳ Chargement de la semaine en cours, réessayez dans un instant.');
      return;
    }
    const manquants = 3 - selectionProposee.length;
    if (manquants <= 0) { afficher('⚠️ 3 Écholègues déjà dans la proposition.'); return; }
    const tirage: Echolegue[] = [];
    const poolCopy = [...pool];
    const nb = Math.min(manquants, poolCopy.length);
    for (let i = 0; i < nb; i++) {
      const idx = Math.floor(Math.random() * poolCopy.length);
      tirage.push(poolCopy.splice(idx, 1)[0]);
    }
    setSelectionProposee(prev => [...prev, ...tirage]);
    setModeSelection(true);
  };

  const handleValiderProposition = async () => {
    for (const l of selectionProposee) await selectionnerEcholegue(l.id, semaineCible);
    setSelectionProposee([]); setModeSelection(false);
    afficher(`✅ ${selectionProposee.length} Écholègue(s) publiés pour ${getCleAffichage(semaineCible)}.`);
  };

  const handleRetirerDuJournal = async (l: Echolegue, semaine: string) => {
    await retirerDuJournal(l, semaine);
    afficher('✅ Écholègue retiré du Journal des Lègues.');
  };

  const labelSelections = (n: number) => {
    if (n === 0) return { label: 'Jamais sélectionné', cls: 'sel-0' };
    if (n === 1) return { label: '1× sélectionné', cls: 'sel-1' };
    return { label: `${n}× sélectionné`, cls: 'sel-n' };
  };

  const totalEcholegues = semainesDisponibles.reduce((s, x) => s + x.total, 0);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>⚙️ Administration EchoTalk</h1>
        <p>Accès restreint — équipe EchoTalk</p>
      </div>

      {message && <div className="admin-message">{message}</div>}

      <div className="admin-columns">

        {/* Colonne gauche */}
        <div className="admin-colonne">
          <div className="admin-section">
            <h2>Écho Solidaire actuel</h2>
            {echoSolidaireActuel ? (
              <div className="admin-echo-card solidaire-actuel">
                <span className="admin-pseudo">{echoSolidaireActuel.auteurPseudo}</span>
                <p className="admin-contenu">{echoSolidaireActuel.contenu}</p>
                <div className="admin-stats">
                  <JarreIcon color="blue" size="s" /> {echoSolidaireActuel.jarresBleues}
                  <JarreIcon color="rose" size="s" /> {echoSolidaireActuel.jarresRoses}
                  <span>❤️ {echoSolidaireActuel.coeurs}</span>
                </div>
                <button className="btn-retirer" onClick={retirerEchoSolidaireActuel}>Retirer</button>
              </div>
            ) : <p className="admin-vide">Aucun Écho Solidaire défini ce mois-ci.</p>}
          </div>

          <div className="admin-section">
            <h2>Candidats du mois</h2>
            <p className="admin-note">Classés par jarres bleues reçues.</p>
            {loading ? <p className="admin-vide">Chargement...</p>
              : candidats.length === 0 ? <p className="admin-vide">Aucun candidat ce mois-ci.</p>
              : candidats.map((echo, i) => (
                <div key={echo.id} className="admin-echo-card">
                  <div className="admin-rang">#{i + 1}</div>
                  <div className="admin-echo-content">
                    <span className="admin-pseudo">{echo.auteurPseudo}</span>
                    <p className="admin-contenu">{(echo.contenu || '').slice(0, 80)}{(echo.contenu || '').length > 80 ? '...' : ''}</p>
                    <div className="admin-stats">
                      <JarreIcon color="blue" size="s" /> {echo.jarresBleues}
                      <span>❤️ {echo.coeurs}</span>
                      <span>{formatDateHeure(echo.createdAt)}</span>
                    </div>
                  </div>
                  <button className="btn-valider" onClick={() => validerEchoSolidaire(echo.id)}>Définir</button>
                </div>
              ))}
          </div>
        </div>

        {/* Colonne droite */}
        <div className="admin-colonne">
          {/* Moulinette */}
          <div className="admin-section">
            <h2>🎲 Moulinette</h2>
            <p className="admin-note">Sélection aléatoire pour le Journal des Lègues.</p>
            <div className="moulinette-row">
              <div className="moulinette-champ">
                <label className="moulinette-label">Semaine source (lègues à piocher)</label>
                <select className="select-semaine" value={semaineSource} onChange={e => setSemaineSource(e.target.value)}>
                  <option value="">Choisir...</option>
                  {semainesDisponibles.map(({ semaine, total }) => (
                    <option key={semaine} value={semaine}>{getCleAffichage(semaine)} ({total})</option>
                  ))}
                </select>
              </div>
              <div className="moulinette-champ">
                <label className="moulinette-label">Semaine cible (Journal des Lègues)</label>
                <input className="select-semaine" type="text" value={semaineCible}
                  onChange={e => setSemaineCible(e.target.value)} placeholder="ex: 2026-W25" />
              </div>
            </div>
            <button className="btn-aleatoire" onClick={handleSelectionAleatoire} disabled={!semaineSource}>
              🎲 Tirer {Math.max(0, 3 - selectionProposee.length)} lègue{3 - selectionProposee.length > 1 ? 's' : ''}
            </button>

            {modeSelection && selectionProposee.length > 0 && (
              <div className="selection-proposee">
                <div className="selection-proposee-titre">Proposition → {getCleAffichage(semaineCible)}</div>
                {selectionProposee.map(l => (
                  <div key={l.id} className="admin-echo-card selection-item">
                    <div className="admin-echo-content">
                      <div className="admin-stats" style={{marginBottom:'4px', gap:'8px'}}>
                        <span>{formatDateHeure(l.createdAt)}</span>
                        <span className={`sel-badge ${labelSelections(l.nbSelections).cls}`}>{labelSelections(l.nbSelections).label}</span>
                      </div>
                      <TexteTronque texte={l.recit} limite={APERCU_RECIT} className="admin-contenu" />
                      <TexteTronque texte={l.lecon} limite={APERCU_LECON} className="admin-legue-lecon" />
                    </div>
                    <button className="btn-retirer" style={{alignSelf:'center'}}
                      onClick={() => setSelectionProposee(prev => prev.filter(x => x.id !== l.id))}>✕</button>
                  </div>
                ))}
                <div className="selection-actions">
                  {selectionProposee.length < 3 && (
                    <button className="btn-aleatoire" style={{marginBottom:0}} onClick={handleSelectionAleatoire}>🎲 Compléter</button>
                  )}
                  <button className="btn-annuler-selection" onClick={() => { setModeSelection(false); setSelectionProposee([]); }}>Annuler</button>
                  <button className="btn-valider-selection" onClick={handleValiderProposition}>
                    ✅ Publier {selectionProposee.length} lègue{selectionProposee.length > 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bibliothèque — semaines listées via l'index, contenu chargé
              uniquement pour les semaines dépliées */}
          <div className="admin-section">
            <h2>📚 Bibliothèque des Lègues</h2>
            <p className="admin-note">
              {totalEcholegues} Écholègue{totalEcholegues > 1 ? 's' : ''} sur {semainesDisponibles.length} semaine{semainesDisponibles.length > 1 ? 's' : ''} — dépliez une semaine pour voir son contenu.
            </p>
            {semainesDisponibles.length === 0 ? (
              <p className="admin-vide">Aucun Écholègue pour le moment.</p>
            ) : (
              <div className="admin-semaines-scroll">
                {semainesDisponibles.map(({ semaine, total }) => {
                  const ouverte = semainesOuvertes.has(semaine);
                  const items = parSemaine[semaine];
                  return (
                    <div key={semaine} className="admin-semaine-groupe">
                      <button
                        className="admin-semaine-label admin-semaine-toggle"
                        onClick={() => toggleSemaineOuverte(semaine)}
                      >
                        {ouverte ? '▾' : '▸'} {getCleAffichage(semaine)} ({total})
                      </button>
                      {ouverte && (
                        !items ? (
                          <p className="admin-vide">Chargement...</p>
                        ) : (
                          items.map(l => {
                            const sel = labelSelections(l.nbSelections);
                            const dansJournalCourant = l.historiqueSelections.some(h => h.semaine === semaineCourante);
                            return (
                              <div key={l.id} className="admin-echo-card">
                                <div className="admin-echo-content">
                                  <div className="admin-stats" style={{marginBottom:'4px', flexWrap:'wrap', gap:'8px'}}>
                                    <span>{formatDateHeure(l.createdAt)}</span>
                                    <span className={`sel-badge ${sel.cls}`}>{sel.label}</span>
                                    {dansJournalCourant && <span className="sel-badge sel-actif">📓 Journal en cours</span>}
                                  </div>
                                  <TexteTronque texte={l.recit} limite={APERCU_RECIT} className="admin-contenu" />
                                  <TexteTronque texte={l.lecon} limite={APERCU_LECON} className="admin-legue-lecon" />
                                  <HistoriqueCompact historique={l.historiqueSelections} />
                                </div>
                                {dansJournalCourant && (
                                  <button className="btn-retirer" style={{alignSelf:'center', flexShrink:0}}
                                    onClick={() => handleRetirerDuJournal(l, semaineCourante)}>
                                    Retirer
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
