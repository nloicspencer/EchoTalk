import { useAuth } from '../context/AuthContext';
import { donnerJarreRose, useStockJarres } from '../hooks/useReactions';
import { Echo } from '../types';
import './EchoSolidaireModal.css';
import JarreIcon from './JarreIcon';

interface Props {
  echo: Echo | null;
  onClose: () => void;
}

export default function EchoSolidaireModal({ echo, onClose }: Props) {
  const { profile } = useAuth();
  const stock = useStockJarres(profile?.uid ?? '');

  const handleJarreRose = async () => {
    if (!profile || !echo) return;
    try {
      await donnerJarreRose(echo.id, profile.uid, stock.jarresRoses, echo.jarresRoses || 0);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <JarreIcon color="rose" size="l" />
          <h2>Écho Solidaire du mois</h2>
        </div>

        {echo ? (
          <>
            <p className="modal-pseudo">{echo.auteurPseudo}</p>
            <p className="modal-contenu">{echo.contenu}</p>

            <div className="modal-reactions-existantes">
              <span className="reaction-inactive">
                <JarreIcon color="blue" size="s" /> {echo.jarresBleues || 0}
              </span>
              <span className="reaction-inactive">❤️ {echo.coeurs || 0}</span>
              <span className="reaction-inactive">💔 {echo.coeursBrises || 0}</span>
            </div>

            <div className="modal-reaction">
              <p className="modal-note">
                Soutenez cet écho avec une Jarre Rose.
                {stock.jarresRoses > 0
                  ? ` Vous avez ${stock.jarresRoses} jarre${stock.jarresRoses > 1 ? 's' : ''} rose${stock.jarresRoses > 1 ? 's' : ''}.`
                  : ' Votre stock de jarres roses est épuisé.'
                }
              </p>
              <button
                className={`btn-jarre-rose ${stock.jarresRoses <= 0 ? 'disabled' : ''}`}
                onClick={handleJarreRose}
                disabled={stock.jarresRoses <= 0}
              >
                <JarreIcon color="rose" size="s" />
                Offrir une Jarre Rose · {echo.jarresRoses || 0}
              </button>
            </div>
          </>
        ) : (
          <p className="modal-vide">Aucun Écho Solidaire ce mois-ci. Revenez bientôt.</p>
        )}
      </div>
    </div>
  );
}
