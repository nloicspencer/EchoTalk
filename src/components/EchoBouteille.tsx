import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  envoyerEchoBouteille, useBouteillesRecues,
  marquerBouteilleVue, signalerEchoBouteille
} from '../hooks/useEchoBouteille';
import './EchoBouteille.css';

const BouteilleIcon = ({ size = 20, color = '#7B5EA7' }: { size?: number; color?: string }) => (
  <svg width={size} height={size * 1.6} viewBox="0 0 28 45" fill="none" aria-hidden="true">
    <rect x="7" y="12" width="14" height="30" rx="7" stroke={color} strokeWidth="1.8"/>
    <rect x="10" y="5" width="8" height="9" rx="3" stroke={color} strokeWidth="1.6"/>
    <rect x="9" y="1" width="10" height="6" rx="3" stroke={color} strokeWidth="1.5"/>
    <path d="M9 28 Q14 22 19 28 Q14 34 9 28" stroke={color} strokeWidth="1" opacity="0.4"/>
    <path d="M9 36 Q14 30 19 36" stroke={color} strokeWidth="1" opacity="0.35"/>
  </svg>
);

export default function EchoBouteille() {
  const { profile } = useAuth();
  const bouteilles = useBouteillesRecues(profile?.uid ?? '');
  const [contenu, setContenu] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageRetour, setMessageRetour] = useState('');
  const [blocVisible, setBlocVisible] = useState(false);
  const [receptionVisible, setReceptionVisible] = useState(false);
  const [signalees, setSignalees] = useState<Set<string>>(new Set());

  if (!profile) return null;

  const nonLues = bouteilles.filter(b => !b.lu).length;

  const handleEnvoyer = async () => {
    if (!contenu.trim()) return;
    setLoading(true);
    try {
      const statut = await envoyerEchoBouteille(profile.uid, profile.pseudo, contenu.trim());
      setContenu('');
      setMessageRetour(statut === 'envoyee'
        ? 'Votre Écho-Bouteille est parti à la mer !'
        : 'Votre Écho-Bouteille est en cours de validation.');
      setTimeout(() => setMessageRetour(''), 4000);
    } catch (err: unknown) {
      setMessageRetour(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setTimeout(() => setMessageRetour(''), 4000);
    } finally { setLoading(false); }
  };

  const handleSignaler = async (b: typeof bouteilles[0]) => {
    if (signalees.has(b.id)) return;
    await signalerEchoBouteille(b.id, b.expediteurId, b.expediteurPseudo, b.contenu, profile.uid);
    setSignalees(prev => new Set([...prev, b.id]));
  };

  const tempsRestant = (expiresAt: Date) => {
    const diff = expiresAt.getTime() - Date.now();
    if (diff <= 0) return 'Expirée';
    const jours = Math.floor(diff / (1000 * 60 * 60 * 24));
    const heures = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return jours > 0 ? `${jours}j restants` : `${heures}h restantes`;
  };

  return (
    <div className="echo-bouteille-section">

      <button className="eb-header eb-header-toggle" onClick={() => setBlocVisible(!blocVisible)}>
        <div className="eb-header-left">
          <div className="eb-titre">
            <BouteilleIcon size={18} />
            <span>Écho-Bouteille</span>
            {nonLues > 0 && <span className="eb-badge">{nonLues}</span>}
          </div>
          <p className="eb-subtitle">Un message lancé à la mer, reçu par un inconnu.</p>
        </div>
        <i className={`ti ${blocVisible ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true" />
      </button>

      {blocVisible && (
        <>
          {/* Envoi */}
          <div className="eb-rubrique">
            <div className="eb-rubrique-titre">
              <i className="ti ti-send" aria-hidden="true" />
              <span>Envoi</span>
            </div>
            <textarea
              className="eb-textarea"
              placeholder="Lancez un message sincère à la communauté..."
              value={contenu}
              onChange={e => setContenu(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <div className="eb-envoi-footer">
              <span className="eb-compteur">{contenu.length}/500</span>
              <button
                className="eb-btn-envoyer"
                onClick={handleEnvoyer}
                disabled={loading || !contenu.trim()}
              >
                {loading ? '...' : (
                  <><BouteilleIcon size={14} color="white" /> Envoyer</>
                )}
              </button>
            </div>
            {messageRetour && <p className="eb-message">{messageRetour}</p>}
          </div>

          {/* Réception — masquée par défaut */}
          <div className="eb-rubrique eb-rubrique-reception">
            <button
              className="eb-rubrique-titre eb-toggle"
              onClick={() => setReceptionVisible(!receptionVisible)}
            >
              <div className="eb-rubrique-titre-left">
                <i className="ti ti-inbox" aria-hidden="true" />
                <span>Réception</span>
                {bouteilles.length > 0 && (
                  <span className="eb-compteur-recus">{bouteilles.length}</span>
                )}
              </div>
              <i className={`ti ${receptionVisible ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true" />
            </button>

            {receptionVisible && (
              <div className="eb-liste">
                {bouteilles.length === 0 ? (
                  <p className="eb-vide">Aucune bouteille reçue pour le moment.</p>
                ) : (
                  bouteilles.map(b => (
                    <div
                      key={b.id}
                      className={`eb-item ${!b.lu ? 'eb-nouveau' : ''}`}
                      onClick={() => !b.lu && marquerBouteilleVue(b.id)}
                    >
                      <div className="eb-item-header">
                        {!b.lu && <span className="eb-new-badge">Nouveau</span>}
                        {b.expiresAt && <span className="eb-expire">{tempsRestant(b.expiresAt)}</span>}
                      </div>
                      <p className="eb-item-contenu">"{b.contenu}"</p>
                      <div className="eb-item-footer">
                        <span className="eb-item-date">
                          {b.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          className={`eb-btn-signaler ${signalees.has(b.id) ? 'signale' : ''}`}
                          onClick={e => { e.stopPropagation(); handleSignaler(b); }}
                          disabled={signalees.has(b.id)}
                        >
                          <i className="ti ti-flag" aria-hidden="true" />
                          {signalees.has(b.id) ? 'Signalé' : 'Signaler'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
