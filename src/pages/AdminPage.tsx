import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import JarreIcon from '../components/JarreIcon';
import { useBibliotheque, selectionnerEcholegue, retirerDuJournal, getSemaineISO, Echolegue } from '../hooks/useEcholegue';
import './AdminPage.css';

const ADMINS = ['loicspencer3@echotalk.com'];
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

function getSemaineCreation(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function grouperParSemaineCreation(legues: Echolegue[]): Map<string, Echolegue[]> {
  const groupes = new Map<string, Echolegue[]>();
  legues.forEach(l => {
    const semaine = getSemaineCreation(l.createdAt);
    if (!groupes.has(semaine)) groupes.set(semaine, []);
    groupes.get(semaine)!.push(l);
  });
  return new Map([...groupes.entries()].sort((a, b) => {
    const [anneeA, semA] = a[0].split('-W');
    const [anneeB, semB] = b[0].split('-W');
    if (anneeB !== anneeA) return parseInt(anneeB) - parseInt(anneeA);
    return parseInt(semB) - parseInt(semA);
  }));
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
  const { user } = useAuth();
  const [candidats, setCandidats] = useState<EchoCandidат[]>([]);
  const [echoSolidaireActuel, setEchoSolidaireActuel] = useState<EchoCandidат | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const legues = useBibliotheque();
  const [selectionProposee, setSelectionProposee] = useState<Echolegue[]>([]);
  const [modeSelection, setModeSelection] = useState(false);
  const [semaineSource, setSemaineSource] = useState<string>('');
  const [semaineCible, setSemaineCible] = useState<string>(getSemaineISO());
  const semaineCourante = getSemaineISO();

  useEffect(() => {
    if (user && ADMINS.includes(user.email ?? '')) chargerDonnees();
  }, [user]);

  if (!user || !ADMINS.includes(user.email ?? '')) {
    return (
      <div className="admin-page">
        <div className="admin-header"><h1>⚠️ Accès refusé</h1><p>Cette page est réservée à l'équipe EchoTalk.</p></div>
      </div>
    );
  }

  const afficher = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  const chargerDonnees = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, 'echos'));
    const debutMois = new Date();
    debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0);
    const echos: EchoCandidат[] = [];
    let solidaireActuel: EchoCandidат | null = null;
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.supprime) return;
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
      const echo: EchoCandidат = {
        id: d.id, auteurPseudo: data.auteurPseudo, contenu: data.contenu,
        jarresBleues: data.jarresBleues || 0, jarresRoses: data.jarresRoses || 0,
        coeurs: data.coeurs || 0, createdAt, estSolidaire: data.estSolidaire || false, type: data.type,
      };
      if (echo.estSolidaire) solidaireActuel = echo;
      if (!echo.estSolidaire && echo.jarresBleues > 0 && createdAt >= debutMois) echos.push(echo);
    });
    echos.sort((a, b) => b.jarresBleues - a.jarresBleues);
    setCandidats(echos.slice(0, 10));
    setEchoSolidaireActuel(solidaireActuel);
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

  const groupes = grouperParSemaineCreation(legues);
  const semainesDisponibles = [...groupes.keys()];

  const handleSelectionAleatoire = () => {
    if (!semaineSource) { afficher('⚠️ Choisissez la semaine source.'); return; }
    const pool = (groupes.get(semaineSource) || []).filter(
      l => !selectionProposee.map(x => x.id).includes(l.id)
    );
    if (pool.length === 0) { afficher('⚠️ Aucun Écholègue disponible dans cette semaine.'); return; }
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
                  {semainesDisponibles.map(s => (
                    <option key={s} value={s}>{getCleAffichage(s)} ({groupes.get(s)?.length ?? 0})</option>
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

          {/* Bibliothèque unifiée */}
          <div className="admin-section">
            <h2>📚 Bibliothèque des Lègues</h2>
            <p className="admin-note">{legues.length} Écholègue{legues.length > 1 ? 's' : ''} — classés par semaine d'envoi.</p>
            {legues.length === 0 ? (
              <p className="admin-vide">Aucun Écholègue pour le moment.</p>
            ) : (
              [...groupes.entries()].map(([semaine, items]) => (
                <div key={semaine} className="admin-semaine-groupe">
                  <div className="admin-semaine-label">{getCleAffichage(semaine)} ({items.length})</div>
                  {items.map(l => {
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
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
