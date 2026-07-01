import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useJournalLegues, signalerEcholegue, getSemaineISO, Echolegue } from '../hooks/useEcholegue';
import './JournalLegues.css';

function getStorageKey(): string {
  return `jl_signature_${getSemaineISO()}`;
}

// Signature unique de l'état actuel du journal — basée sur les ids + leur date de sélection
// Change dès qu'un lègue est ajouté, retiré, ou re-sélectionné, même si le nombre total reste identique
function calculerSignature(legues: Echolegue[]): string {
  const semaineCourante = getSemaineISO();
  return legues
    .map(l => {
      const entree = l.historiqueSelections.find(h => h.semaine === semaineCourante);
      return `${l.id}:${entree?.selectionneAt.getTime() ?? 0}`;
    })
    .sort()
    .join('|');
}

export default function JournalLegues() {
  const { profile } = useAuth();
  const legues = useJournalLegues();
  const [ouvert, setOuvert] = useState<Echolegue | null>(null);
  const [deroule, setDeroule] = useState(false);
  const [signales, setSignales] = useState<Set<string>>(new Set());
  const [nouveau, setNouveau] = useState(false);
  const initialise = useRef(false);

  useEffect(() => {
    // Ignorer le tout premier render à 0 avant que Firestore réponde
    if (legues.length === 0 && !initialise.current) return;
    initialise.current = true;

    if (legues.length === 0) { setNouveau(false); return; }

    const signatureActuelle = calculerSignature(legues);
    try {
      const signatureVue = localStorage.getItem(getStorageKey());
      setNouveau(signatureActuelle !== signatureVue);
    } catch {
      setNouveau(true);
    }
  }, [legues]);

  const handleOuvrirBandeau = () => {
    const prochainEtat = !deroule;
    setDeroule(prochainEtat);
    if (prochainEtat && legues.length > 0) {
      const signatureActuelle = calculerSignature(legues);
      try { localStorage.setItem(getStorageKey(), signatureActuelle); } catch {}
      setNouveau(false);
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const handleSignaler = async (l: Echolegue) => {
    if (!profile || signales.has(l.id)) return;
    await signalerEcholegue(l.id, l.auteurId, l.auteurPseudo, l.recit, profile.uid);
    setSignales(prev => new Set([...prev, l.id]));
  };

  return (
    <>
      <div className="journal-legues-bandeau">
        <button className="jl-bandeau-btn" onClick={handleOuvrirBandeau}>
          <div className="jl-bandeau-gauche">
            <span className="jl-bandeau-emoji">📓</span>
            <div className="jl-bandeau-texte">
              <span className="jl-bandeau-titre">Journal des Lègues</span>
              <span className="jl-bandeau-sub">
                {legues.length > 0
                  ? `${legues.length} lègue${legues.length > 1 ? 's' : ''} cette semaine`
                  : 'Aucun lègue cette semaine'}
              </span>
            </div>
            {nouveau && <span className="jl-pastille" aria-label="Nouveaux lègues" />}
          </div>
          {legues.length > 0 && (
            <i className={`ti ${deroule ? 'ti-chevron-up' : 'ti-chevron-down'} jl-chevron`} aria-hidden="true" />
          )}
        </button>

        {deroule && legues.length > 0 && (
          <div className="jl-liste">
            {legues.map(l => (
              <div key={l.id} className="jl-item" onClick={() => setOuvert(l)}>
                <p className="jl-apercu">{l.recit.slice(0, 120)}{l.recit.length > 120 ? '...' : ''}</p>
                <div className="jl-footer">
                  <span className="jl-date">{formatDate(l.createdAt)}</span>
                  <span className="jl-lire">Lire →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {ouvert && (
        <div className="jl-overlay" onClick={() => setOuvert(null)}>
          <div className="jl-modal" onClick={e => e.stopPropagation()}>
            <button className="jl-modal-close" onClick={() => setOuvert(null)}>
              <i className="ti ti-x" aria-hidden="true" />
            </button>
            <div className="jl-modal-header">
              <span>📓 Écholègue</span>
              <span className="jl-modal-date">{formatDate(ouvert.createdAt)}</span>
            </div>
            <div className="jl-modal-recit"><p>{ouvert.recit}</p></div>
            <div className="jl-modal-lecon">
              <div className="jl-lecon-label">Ce que j'en retiens</div>
              <p>{ouvert.lecon}</p>
            </div>
            <div className="jl-modal-footer">
              <button
                className={`jl-btn-signaler ${signales.has(ouvert.id) ? 'signale' : ''}`}
                onClick={() => handleSignaler(ouvert)}
                disabled={signales.has(ouvert.id) || !profile}
              >
                <i className="ti ti-flag" aria-hidden="true" />
                {signales.has(ouvert.id) ? 'Signalé' : 'Signaler'}
              </button>
              <button className="jl-btn-fermer" onClick={() => setOuvert(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
