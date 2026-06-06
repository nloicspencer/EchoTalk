import { Echo } from '../types';
import { reagir } from '../hooks/useEchos';
import './EchoSolidaireModal.css';

interface Props {
  echo: Echo | null;
  onClose: () => void;
}

export default function EchoSolidaireModal({ echo, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          <span className="modal-icon">💛</span>
          <h2>Écho Solidaire du mois</h2>
        </div>

        {echo ? (
          <>
            <p className="modal-pseudo">{echo.auteurPseudo}</p>
            <p className="modal-contenu">{echo.contenu}</p>
            <div className="modal-reaction">
              <p className="modal-note">
                Soutenez cet écho avec une Jarre Rose. Chaque contribution compte.
              </p>
              <button
                className="btn-jarre-rose"
                onClick={() => reagir(echo.id, 'jarresRoses', (echo.jarresRoses || 0) + 1)}
              >
                🫙 Offrir une Jarre Rose · {echo.jarresRoses || 0}
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
